import { query, input, s, expr, cmp, col, ref, inp, auth, c, withFilters, fl } from "@xanots/sdk";
import { grant } from "./grant.js";
import { users } from "../tables/users.js";
import { applications } from "../tables/applications.js";
import { reviewAssignments } from "../tables/review-assignments.js";
import { APP_STATUS } from "../lib/domain.js";
import { loadMe, requireRole } from "../lib/guard.js";

// Reviewer or admin. Role scopes what the caller sees: an admin sees every
// application, a reviewer sees only the ones assigned to them. The reviewer scope
// is join-free on purpose (a bind join on the queried table's own bare `id` parses
// clean but fails live): read the caller's assignments, pluck the application ids,
// then filter by `id in (...)`, guarding the empty case so an unassigned reviewer
// gets an empty list rather than every row.
export const queue = query({
  name: "applications/queue",
  verb: "GET",
  apiGroup: grant,
  auth: users,
  input: {
    status: input.enum(APP_STATUS, { required: false }),
  },
  stack: [
    ...loadMe(),
    ...requireRole("reviewer", "admin"),
    s.conditional({
      when: expr(ref("me.role"), "=", c.text("admin")),
      then: [
        s.db.query({
          table: applications,
          where: [cmp(col("status"), "=", inp("status"), { ignoreEmpty: true })],
          sort: [{ sortBy: "created_at", dir: "desc" }],
          as: "rows",
        }),
      ],
      else: [
        s.db.query({
          table: reviewAssignments,
          where: expr(col("reviewer_id"), "=", auth("id")),
          as: "myAssignments",
        }),
        s.array.map({
          source: ref("myAssignments"),
          transform: ref("$this.application_id"),
          as: "myIds",
        }),
        s.conditional({
          when: expr(withFilters(ref("myIds"), fl.count()), ">", c.int(0)),
          then: [
            s.db.query({
              table: applications,
              where: [
                cmp(col("id"), "in", ref("myIds")),
                cmp(col("status"), "=", inp("status"), { ignoreEmpty: true }),
              ],
              sort: [{ sortBy: "created_at", dir: "desc" }],
              as: "rows",
            }),
          ],
          else: [s.set_var("rows", c.array([]))],
        }),
      ],
    }),
  ],
  response: ref("rows"),
});
