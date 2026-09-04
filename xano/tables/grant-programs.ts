import { table, f } from "@xanots/sdk";
import { PROGRAM_STATUS } from "../lib/domain.js";

// A public grant program applications target. `max_request` is the funding cap
// intake validation checks against; `submission_deadline` gates late submissions.
export const grantPrograms = table({
  name: "grant_programs",
  schema: {
    name: f.text({ required: true }),
    summary: f.text({ required: true }),
    status: f.enum(PROGRAM_STATUS, { required: true, default: "open" }),
    submission_deadline: f.timestamp({ required: true }),
    max_request: f.int({ required: true }),
  },
});
