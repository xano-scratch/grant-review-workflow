// Shared domain vocabulary for the grant-review workflow.
// These const tuples are the single source of truth for every enum column, enum
// input, and role guard, so a status or role is spelled one way across the app.

export const ROLES = ["applicant", "reviewer", "admin"] as const;
export type Role = (typeof ROLES)[number];

// The application state machine:
//   submitted → assigned → under_review → scored → funded | rejected
export const APP_STATUS = [
  "submitted",
  "assigned",
  "under_review",
  "scored",
  "funded",
  "rejected",
] as const;
export type AppStatus = (typeof APP_STATUS)[number];

export const PROGRAM_STATUS = ["open", "closed"] as const;

// The two terminal decisions an admin can record on a scored application.
export const DECISIONS = ["funded", "rejected"] as const;

// One day in milliseconds, for relative seed timestamps (Xano timestamps are epoch-ms).
export const DAY_MS = 86_400_000;
