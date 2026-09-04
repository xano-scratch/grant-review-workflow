import { query, input, s, expr, ref, inp, c, obj } from "@xanots/sdk";
import { grant } from "./grant.js";
import { users } from "../tables/users.js";
import { applications } from "../tables/applications.js";
import { DECISIONS } from "../lib/domain.js";
import { loadMe, requireRole, audit } from "../lib/guard.js";

// Admin only. Marks an application funded or rejected. Guarded on status:
// the application must be "scored" (a weighted total computed), which also blocks
// deciding an application twice.
export const decide = query({
  name: "applications/decide",
  verb: "POST",
  apiGroup: grant,
  auth: users,
  input: {
    application_id: input.int({ required: true }),
    decision: input.enum(DECISIONS, { required: true }),
  },
  stack: [
    ...loadMe(),
    ...requireRole("admin"),
    s.db.get_by_id({ table: applications, id: inp("application_id"), as: "app" }),
    s.precondition({
      expr: expr(ref("app", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("That application does not exist."),
    }),
    s.precondition({
      expr: expr(ref("app.status"), "=", c.text("scored")),
      error_type: "badrequest",
      error: c.text("A weighted total must be computed before a decision."),
    }),
    s.db.edit({
      table: applications,
      fieldName: "id",
      fieldValue: inp("application_id"),
      row: { status: inp("decision") },
      as: "app2",
    }),
    ...audit(
      inp("application_id"),
      "decided",
      obj({ decision: inp("decision"), total_score: ref("app.total_score") }),
    ),
  ],
  response: ref("app2"),
});
