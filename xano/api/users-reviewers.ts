import { query, s, expr, col, ref, c } from "@xanots/sdk";
import { grant } from "./grant.js";
import { users } from "../tables/users.js";
import { loadMe, requireRole } from "../lib/guard.js";

// Admin only. Lists reviewers for the assign control. A convenience read (beyond
// the spec's 11 endpoints); assign still validates the reviewer role server-side.
// `output` keeps the response to non-sensitive columns (never the password hash).
export const reviewersList = query({
  name: "users/reviewers",
  verb: "GET",
  apiGroup: grant,
  auth: users,
  stack: [
    ...loadMe(),
    ...requireRole("admin"),
    s.db.query({
      table: users,
      where: expr(col("role"), "=", c.text("reviewer")),
      output: ["id", "name", "email", "role"],
      sort: [{ sortBy: "name", dir: "asc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
