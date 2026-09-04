import { table, f } from "@xanots/sdk";
import { APP_STATUS } from "../lib/domain.js";
import { users } from "./users.js";
import { grantPrograms } from "./grant-programs.js";

// A grant application and its lifecycle. `total_score` stays null until every
// active criterion has been scored and compute-score writes the weighted total.
export const applications = table({
  name: "applications",
  schema: {
    applicant_id: f.tableRef(users, { required: true }),
    grant_program_id: f.tableRef(grantPrograms, { required: true }),
    title: f.text({ required: true }),
    summary: f.text({ required: true }),
    requested_amount: f.int({ required: true }),
    status: f.enum(APP_STATUS, { required: true, default: "submitted" }),
    total_score: f.int({ nullable: true }),
    submitted_at: f.timestamp({ nullable: true }),
  },
});
