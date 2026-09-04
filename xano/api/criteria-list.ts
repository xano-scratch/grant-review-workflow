import { query, input, s, expr, col, ref, inp, c } from "@xanots/sdk";
import { grant } from "./grant.js";
import { users } from "../tables/users.js";
import { reviewCriteria } from "../tables/review-criteria.js";

// Any signed-in user. Lists the ACTIVE versioned rubric for a program — the
// published criteria reviewers score against, shown on the scoring screen.
export const criteriaList = query({
  name: "criteria/list",
  verb: "GET",
  apiGroup: grant,
  auth: users,
  input: { program_id: input.int({ required: true }) },
  stack: [
    s.db.query({
      table: reviewCriteria,
      where: [
        expr(col("grant_program_id"), "=", inp("program_id")),
        expr(col("is_active"), "=", c.bool(true)),
      ],
      sort: [{ sortBy: "id", dir: "asc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
