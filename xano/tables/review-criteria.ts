import { table, f } from "@xanots/sdk";
import { grantPrograms } from "./grant-programs.js";

// A published, versioned scoring rubric for a program. Only the rows with
// is_active=true form the rubric reviewers score against; an older version stays
// as inactive rows, so the rubric a decision was made under is never overwritten.
export const reviewCriteria = table({
  name: "review_criteria",
  schema: {
    grant_program_id: f.tableRef(grantPrograms, { required: true }),
    version: f.int({ required: true, default: 1 }),
    label: f.text({ required: true }),
    description: f.text({ required: true }),
    max_points: f.int({ required: true }),
    weight: f.int({ required: true }),
    is_active: f.bool({ required: true, default: false }),
  },
});
