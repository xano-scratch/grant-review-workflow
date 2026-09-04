import { table, f } from "@xanots/sdk";
import { users } from "./users.js";
import { applications } from "./applications.js";

// The append-only audit trail. Every state-changing endpoint writes one row here,
// so the full history of an application is readable on the detail screen.
export const reviewEvents = table({
  name: "review_events",
  schema: {
    application_id: f.tableRef(applications, { required: true }),
    actor_id: f.tableRef(users, { required: true }),
    action: f.text({ required: true }),
    detail: f.json({ nullable: true }),
  },
});
