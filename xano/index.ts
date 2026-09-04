import { workspace } from "@xanots/sdk";

import { users } from "./tables/users.js";
import { grantPrograms } from "./tables/grant-programs.js";
import { reviewCriteria } from "./tables/review-criteria.js";
import { applications } from "./tables/applications.js";
import { reviewAssignments } from "./tables/review-assignments.js";
import { scores } from "./tables/scores.js";
import { reviewEvents } from "./tables/review-events.js";

import { grant } from "./api/grant.js";
import { signup } from "./api/auth-signup.js";
import { login } from "./api/auth-login.js";
import { programsList } from "./api/programs-list.js";
import { submit } from "./api/applications-submit.js";
import { queue } from "./api/applications-queue.js";
import { detail } from "./api/applications-detail.js";
import { assign } from "./api/applications-assign.js";
import { recordScore } from "./api/scores-record.js";
import { computeScore } from "./api/applications-compute-score.js";
import { decide } from "./api/applications-decide.js";
import { criteriaList } from "./api/criteria-list.js";
import { reviewersList } from "./api/users-reviewers.js";
import { seedRun } from "./api/seed-run.js";

// The grant intake and review backend: a governed Xano workspace where
// applications are validated on intake, assigned to reviewers, scored against a
// published versioned rubric, and every action is written to an audit trail.
// Access is enforced at the API layer with per-endpoint role guards (RBAC).
export default workspace("grant-review-workflow")
  .registerTables([
    users,
    grantPrograms,
    reviewCriteria,
    applications,
    reviewAssignments,
    scores,
    reviewEvents,
  ])
  .registerApiGroups([grant])
  .registerQueries([
    signup,
    login,
    programsList,
    submit,
    queue,
    detail,
    assign,
    recordScore,
    computeScore,
    decide,
    criteriaList,
    reviewersList,
    seedRun,
  ]);
