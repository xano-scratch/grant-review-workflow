import { table, f } from "@xanots/sdk";
import { users } from "./users.js";
import { applications } from "./applications.js";

// Who reviews what. A reviewer may only score an application assigned to them,
// checked at the API layer in scores/record. The unique index blocks a
// double-assignment of the same reviewer to the same application.
export const reviewAssignments = table({
  name: "review_assignments",
  schema: {
    application_id: f.tableRef(applications, { required: true }),
    reviewer_id: f.tableRef(users, { required: true }),
    assigned_by: f.tableRef(users, { required: true }),
  },
  index: [
    {
      type: "unique",
      fields: [{ name: "application_id" }, { name: "reviewer_id" }],
    },
  ],
});
