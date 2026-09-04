import { table, f } from "@xanots/sdk";
import { users } from "./users.js";
import { applications } from "./applications.js";
import { reviewCriteria } from "./review-criteria.js";

// One row per (application, reviewer, criterion). The unique index enforces that,
// so scores/record upserts rather than duplicating when a reviewer revises a score.
export const scores = table({
  name: "scores",
  schema: {
    application_id: f.tableRef(applications, { required: true }),
    reviewer_id: f.tableRef(users, { required: true }),
    criteria_id: f.tableRef(reviewCriteria, { required: true }),
    points: f.int({ required: true }),
    note: f.text({ nullable: true }),
  },
  index: [
    {
      type: "unique",
      fields: [
        { name: "application_id" },
        { name: "reviewer_id" },
        { name: "criteria_id" },
      ],
    },
  ],
});
