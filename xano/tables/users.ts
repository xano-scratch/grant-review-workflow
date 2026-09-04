import { table, f } from "@xanots/sdk";
import { ROLES } from "../lib/domain.js";

// The single auth table. Access control keys off `role`, enforced per endpoint
// with an s.precondition role guard (API-layer RBAC, never row-level security).
export const users = table({
  name: "users",
  auth: true, // backs authentication; id + created_at are auto-injected
  schema: {
    email: f.email({ required: true }),
    // f.password() hashes on write and is access:"internal" — a read must name it
    // in `output` to see the hash, and login compares with s.security.check_password.
    password: f.password({ required: true }),
    name: f.text({ required: true }),
    role: f.enum(ROLES, { required: true, default: "applicant" }),
  },
  index: [{ type: "unique", fields: [{ name: "email" }] }],
});
