import { query, input, s, expr, ref, inp, auth, c, obj } from "@xanots/sdk";
import { grant } from "./grant.js";
import { users } from "../tables/users.js";
import { grantPrograms } from "../tables/grant-programs.js";
import { applications } from "../tables/applications.js";
import { loadMe, requireRole, audit } from "../lib/guard.js";

// Applicant only. Intake validation is the governed job here: the program must
// exist and be open, the deadline must not have passed, and the amount must be
// positive and within the program's funding cap. Each rule fails with its own
// clear reason so the frontend can show why a submission was rejected.
export const submit = query({
  name: "applications/submit",
  verb: "POST",
  apiGroup: grant,
  auth: users,
  input: {
    program_id: input.int({ required: true }),
    title: input.text({ required: true }),
    summary: input.text({ required: true }),
    requested_amount: input.int({ required: true }),
  },
  stack: [
    ...loadMe(),
    ...requireRole("applicant"),
    s.db.get_by_id({ table: grantPrograms, id: inp("program_id"), as: "prog" }),
    s.precondition({
      expr: expr(ref("prog", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("That grant program does not exist."),
    }),
    s.precondition({
      expr: expr(ref("prog.status"), "=", c.text("open")),
      error_type: "badrequest",
      error: c.text("This program is not open for submissions."),
    }),
    s.precondition({
      expr: expr(ref("prog.submission_deadline"), ">", c.now()),
      error_type: "badrequest",
      error: c.text("The submission deadline for this program has passed."),
    }),
    s.precondition({
      expr: expr(inp("requested_amount"), ">", c.int(0)),
      error_type: "badrequest",
      error: c.text("The requested amount must be greater than zero."),
    }),
    s.precondition({
      expr: expr(inp("requested_amount"), "<=", ref("prog.max_request")),
      error_type: "badrequest",
      error: c.text("The requested amount is over this program's funding cap."),
    }),
    s.db.add({
      table: applications,
      row: {
        applicant_id: auth("id"),
        grant_program_id: inp("program_id"),
        title: inp("title"),
        summary: inp("summary"),
        requested_amount: inp("requested_amount"),
        status: "submitted",
        submitted_at: c.now(),
      },
      as: "app",
    }),
    ...audit(
      ref("app.id"),
      "submitted",
      obj({ program_id: inp("program_id"), requested_amount: inp("requested_amount") }),
    ),
  ],
  response: ref("app"),
});
