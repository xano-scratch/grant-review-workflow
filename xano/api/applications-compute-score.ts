import { query, input, s, expr, col, ref, inp, c, obj, withFilters, fl } from "@xanots/sdk";
import { grant } from "./grant.js";
import { users } from "../tables/users.js";
import { applications } from "../tables/applications.js";
import { reviewCriteria } from "../tables/review-criteria.js";
import { scores } from "../tables/scores.js";
import { loadMe, requireRole, audit } from "../lib/guard.js";

// Reviewer or admin. Computes the weighted total over the ACTIVE rubric:
// sum of (weight * points) across every active criterion. It refuses until every
// active criterion has a score, so a partial review can never produce a total.
// The sum is built natively in the stack (foreach + s.math) rather than in a
// lambda, so the arithmetic stays in the readable API layer.
export const computeScore = query({
  name: "applications/compute-score",
  verb: "POST",
  apiGroup: grant,
  auth: users,
  input: { application_id: input.int({ required: true }) },
  stack: [
    ...loadMe(),
    ...requireRole("reviewer", "admin"),
    s.db.get_by_id({ table: applications, id: inp("application_id"), as: "app" }),
    s.precondition({
      expr: expr(ref("app", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("That application does not exist."),
    }),
    s.db.query({
      table: reviewCriteria,
      where: [
        expr(col("grant_program_id"), "=", ref("app.grant_program_id")),
        expr(col("is_active"), "=", c.bool(true)),
      ],
      sort: [{ sortBy: "id", dir: "asc" }],
      as: "criteria",
    }),
    s.precondition({
      expr: expr(withFilters(ref("criteria"), fl.count()), ">", c.int(0)),
      error_type: "badrequest",
      error: c.text("This program has no active rubric to score against."),
    }),
    s.set_var("total", c.int(0)),
    s.set_var("scoredCount", c.int(0)),
    s.foreach({
      list: ref("criteria"),
      as: "crit",
      body: [
        s.db.query({
          table: scores,
          where: [
            expr(col("application_id"), "=", ref("app.id")),
            expr(col("criteria_id"), "=", ref("crit.id")),
          ],
          returnType: "single",
          as: "sc",
        }),
        s.conditional({
          when: expr(ref("sc", { safe: true }), "!=", c.null()),
          then: [
            // line = weight * points, then total += line
            s.set_var("line", ref("crit.weight")),
            s.math.mul({ name: "line", value: ref("sc.points") }),
            s.math.add({ name: "total", value: ref("line") }),
            s.math.add({ name: "scoredCount", value: c.int(1) }),
          ],
        }),
      ],
    }),
    s.precondition({
      expr: expr(ref("scoredCount"), "=", withFilters(ref("criteria"), fl.count())),
      error_type: "badrequest",
      error: c.text("Every active criterion must be scored before a total can be computed."),
    }),
    s.db.edit({
      table: applications,
      fieldName: "id",
      fieldValue: inp("application_id"),
      row: { total_score: ref("total"), status: "scored" },
      as: "app2",
    }),
    ...audit(inp("application_id"), "computed", obj({ total_score: ref("total") })),
  ],
  response: ref("app2"),
});
