import { query, s, ref } from "@xanots/sdk";
import { grant } from "./grant.js";
import { users } from "../tables/users.js";
import { grantPrograms } from "../tables/grant-programs.js";

// Any signed-in user can browse the programs. A convenience read (beyond the
// spec's 11 endpoints) so the applicant Submit screen can pick a program; submit
// still validates the program server-side, so this is not a gate.
export const programsList = query({
  name: "programs/list",
  verb: "GET",
  apiGroup: grant,
  auth: users,
  stack: [
    s.db.query({
      table: grantPrograms,
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
