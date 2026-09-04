import { query, input, s, expr, col, ref, inp, auth, c, obj } from "@xanots/sdk";
import { grant } from "./grant.js";
import { users } from "../tables/users.js";
import { applications } from "../tables/applications.js";
import { reviewAssignments } from "../tables/review-assignments.js";
import { loadMe, requireRole, audit } from "../lib/guard.js";

// Admin only. Assigns a reviewer to an application and moves it to "assigned".
// The assignee must actually hold the reviewer role, and the same reviewer cannot
// be assigned twice.
export const assign = query({
  name: "applications/assign",
  verb: "POST",
  apiGroup: grant,
  auth: users,
  input: {
    application_id: input.int({ required: true }),
    reviewer_id: input.int({ required: true }),
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
    s.db.get_by_id({ table: users, id: inp("reviewer_id"), as: "reviewer" }),
    s.precondition({
      expr: expr(ref("reviewer", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("That reviewer does not exist."),
    }),
    s.precondition({
      expr: expr(ref("reviewer.role"), "=", c.text("reviewer")),
      error_type: "badrequest",
      error: c.text("The assignee must hold the reviewer role."),
    }),
    s.db.query({
      table: reviewAssignments,
      where: [
        expr(col("application_id"), "=", inp("application_id")),
        expr(col("reviewer_id"), "=", inp("reviewer_id")),
      ],
      returnType: "exists",
      as: "already",
    }),
    s.precondition({
      expr: expr(ref("already"), "=", c.bool(false)),
      error_type: "badrequest",
      error: c.text("That reviewer is already assigned to this application."),
    }),
    s.db.add({
      table: reviewAssignments,
      row: {
        application_id: inp("application_id"),
        reviewer_id: inp("reviewer_id"),
        assigned_by: auth("id"),
      },
      as: "asg",
    }),
    s.db.edit({
      table: applications,
      fieldName: "id",
      fieldValue: inp("application_id"),
      row: { status: "assigned" },
      as: "app2",
    }),
    ...audit(inp("application_id"), "assigned", obj({ reviewer_id: inp("reviewer_id") })),
  ],
  response: { assignment: ref("asg"), application: ref("app2") },
});
