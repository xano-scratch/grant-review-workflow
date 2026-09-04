import { s, statements, expr, or, ref, auth, c } from "@xanots/sdk";
import type { Value } from "@xanots/sdk";
import { users } from "../tables/users.js";
import { reviewEvents } from "../tables/review-events.js";
import type { Role } from "./domain.js";

// Shared stack fragments. Each returns a `statements(...)` tuple (NOT a plain
// Statement[]) so spreading it into a query stack preserves the tuple type, which
// is what keeps InferResponse working for every ref() after the spread.

// Load the caller's own user row as `me`, so a role guard can read `me.role`.
// A `query({ auth: users })` guarantees a valid caller, so `auth("id")` is a real
// user id (>= 1) and get_by_id binds the row, never the 0 sentinel.
export const loadMe = () =>
  statements(s.db.get_by_id({ table: users, id: auth("id"), as: "me" }));

// API-layer RBAC: reject the request unless the caller holds one of `roles`.
// Requires loadMe() earlier in the same stack.
export const requireRole = (...roles: Role[]) =>
  statements(
    s.precondition({
      expr:
        roles.length === 1
          ? expr(ref("me.role"), "=", c.text(roles[0]))
          : or(...roles.map((r) => expr(ref("me.role"), "=", c.text(r)))),
      error_type: "accessdenied",
      error: c.text("You do not have permission to perform this action."),
    }),
  );

// Append one row to the audit trail. `actor_id` is always the caller.
export const audit = (applicationId: Value, action: string, detail?: Value) =>
  statements(
    s.db.add({
      table: reviewEvents,
      row: {
        application_id: applicationId,
        actor_id: auth("id"),
        action: c.text(action),
        ...(detail ? { detail } : {}),
      },
    }),
  );
