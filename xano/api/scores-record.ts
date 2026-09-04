import { query, input, s, expr, col, ref, inp, auth, c, obj } from "@xanots/sdk";
import { grant } from "./grant.js";
import { users } from "../tables/users.js";
import { applications } from "../tables/applications.js";
import { reviewCriteria } from "../tables/review-criteria.js";
import { reviewAssignments } from "../tables/review-assignments.js";
import { scores } from "../tables/scores.js";
import { loadMe, requireRole, audit } from "../lib/guard.js";

// Reviewer only, and only for an application assigned to them. Records (or
// revises) one score for one active criterion, bounded by the criterion's max.
// Moves a still-"assigned" application into "under_review".
export const recordScore = query({
  name: "scores/record",
  verb: "POST",
  apiGroup: grant,
  auth: users,
  input: {
    application_id: input.int({ required: true }),
    criteria_id: input.int({ required: true }),
    points: input.int({ required: true }),
    note: input.text({ required: false }),
  },
  stack: [
    ...loadMe(),
    ...requireRole("reviewer"),
    s.db.query({
      table: reviewAssignments,
      where: [
        expr(col("application_id"), "=", inp("application_id")),
        expr(col("reviewer_id"), "=", auth("id")),
      ],
      returnType: "exists",
      as: "assigned",
    }),
    s.precondition({
      expr: expr(ref("assigned"), "=", c.bool(true)),
      error_type: "accessdenied",
      error: c.text("You are not assigned to this application."),
    }),
    s.db.get_by_id({ table: applications, id: inp("application_id"), as: "app" }),
    s.precondition({
      expr: expr(ref("app", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("That application does not exist."),
    }),
    s.db.get_by_id({ table: reviewCriteria, id: inp("criteria_id"), as: "crit" }),
    s.precondition({
      expr: expr(ref("crit", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("That criterion does not exist."),
    }),
    s.precondition({
      expr: expr(ref("crit.is_active"), "=", c.bool(true)),
      error_type: "badrequest",
      error: c.text("That criterion is not part of the active rubric."),
    }),
    s.precondition({
      expr: expr(ref("crit.grant_program_id"), "=", ref("app.grant_program_id")),
      error_type: "badrequest",
      error: c.text("That criterion belongs to a different program."),
    }),
    s.precondition({
      expr: expr(inp("points"), ">=", c.int(0)),
      error_type: "badrequest",
      error: c.text("Points cannot be negative."),
    }),
    s.precondition({
      expr: expr(inp("points"), "<=", ref("crit.max_points")),
      error_type: "badrequest",
      error: c.text("Points are over the maximum for this criterion."),
    }),
    // Upsert: one score per (application, reviewer, criterion).
    s.db.query({
      table: scores,
      where: [
        expr(col("application_id"), "=", inp("application_id")),
        expr(col("reviewer_id"), "=", auth("id")),
        expr(col("criteria_id"), "=", inp("criteria_id")),
      ],
      returnType: "single",
      as: "existing",
    }),
    s.conditional({
      when: expr(ref("existing", { safe: true }), "!=", c.null()),
      then: [
        s.db.edit({
          table: scores,
          fieldName: "id",
          fieldValue: ref("existing.id"),
          row: { points: inp("points"), note: inp("note") },
          as: "score",
        }),
      ],
      else: [
        s.db.add({
          table: scores,
          row: {
            application_id: inp("application_id"),
            reviewer_id: auth("id"),
            criteria_id: inp("criteria_id"),
            points: inp("points"),
            note: inp("note"),
          },
          as: "score",
        }),
      ],
    }),
    // First score on an assigned application moves it into review.
    s.conditional({
      when: expr(ref("app.status"), "=", c.text("assigned")),
      then: [
        s.db.edit({
          table: applications,
          fieldName: "id",
          fieldValue: inp("application_id"),
          row: { status: "under_review" },
        }),
      ],
    }),
    ...audit(
      inp("application_id"),
      "scored",
      obj({ criteria_id: inp("criteria_id"), points: inp("points") }),
    ),
  ],
  response: ref("score"),
});
