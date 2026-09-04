import { query, input, s, expr, col, ref, inp, c } from "@xanots/sdk";
import { grant } from "./grant.js";
import { users } from "../tables/users.js";
import { grantPrograms } from "../tables/grant-programs.js";
import { applications } from "../tables/applications.js";
import { reviewCriteria } from "../tables/review-criteria.js";
import { scores } from "../tables/scores.js";
import { reviewEvents } from "../tables/review-events.js";
import { loadMe, requireRole } from "../lib/guard.js";

// Reviewer or admin. One application joined with the program, the applicant
// profile, the active rubric, the recorded scores, and the full audit trail — the
// governed-result screen. The id is a path segment (avoids the strict-build
// warning for a GET that looks one row up by id).
export const detail = query({
  name: "applications/detail/{application_id}",
  verb: "GET",
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
    s.db.get_by_id({
      table: grantPrograms,
      id: ref("app.grant_program_id"),
      as: "prog",
    }),
    s.db.get_by_id({
      table: users,
      id: ref("app.applicant_id"),
      output: ["id", "name", "email", "role"],
      as: "applicant",
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
    s.db.query({
      table: scores,
      where: expr(col("application_id"), "=", ref("app.id")),
      as: "scores",
    }),
    s.db.query({
      table: reviewEvents,
      where: expr(col("application_id"), "=", ref("app.id")),
      sort: [{ sortBy: "created_at", dir: "asc" }],
      as: "events",
    }),
  ],
  response: {
    application: ref("app"),
    program: ref("prog"),
    applicant: ref("applicant"),
    criteria: ref("criteria"),
    scores: ref("scores"),
    events: ref("events"),
  },
});
