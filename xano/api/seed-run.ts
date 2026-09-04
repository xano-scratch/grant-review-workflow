import { query, input, s, expr, ref, inp, c, obj, withFilters, fl } from "@xanots/sdk";
import { grant } from "./grant.js";
import { users } from "../tables/users.js";
import { grantPrograms } from "../tables/grant-programs.js";
import { reviewCriteria } from "../tables/review-criteria.js";
import { applications } from "../tables/applications.js";
import { reviewAssignments } from "../tables/review-assignments.js";
import { scores } from "../tables/scores.js";
import { reviewEvents } from "../tables/review-events.js";
import { DAY_MS } from "../lib/domain.js";

// A relative epoch-ms timestamp, so the open program's deadline is always in the
// future and the closed program's is always in the past, whenever this deploys.
const daysFromNow = (days: number) =>
  withFilters(c.now(), fl.add(c.int(days * DAY_MS)));

// Public. Seeds the demo so the ephemeral is browsable with no manual setup.
// Idempotent: it only inserts when the admin account is absent, so the frontend
// can call it on first load without wiping live work. Pass reset=true for a clean
// slate (truncate + reseed), which restarts id sequences so the deep links stay
// stable (application 1 = funded, 2 = assigned, 3 = rejected).
export const seedRun = query({
  name: "seed/run",
  verb: "POST",
  apiGroup: grant,
  input: { reset: input.bool({ required: false, default: false }) },
  stack: [
    s.conditional({
      when: expr(inp("reset"), "=", c.bool(true)),
      then: [
        s.db.truncate({ table: reviewEvents, reset: true }),
        s.db.truncate({ table: scores, reset: true }),
        s.db.truncate({ table: reviewAssignments, reset: true }),
        s.db.truncate({ table: applications, reset: true }),
        s.db.truncate({ table: reviewCriteria, reset: true }),
        s.db.truncate({ table: grantPrograms, reset: true }),
        s.db.truncate({ table: users, reset: true }),
      ],
    }),
    s.db.has({
      table: users,
      fieldName: "email",
      fieldValue: c.text("alex.rivera@agency.gov"),
      as: "seeded",
    }),
    s.conditional({
      when: expr(ref("seeded"), "=", c.bool(false)),
      then: [
        // --- users (password hashes on write; demo creds only) ---
        s.db.add({ table: users, row: { email: "casey.kim@example.org", password: "applicant-demo", name: "Casey Kim", role: "applicant" }, as: "applicant" }),
        s.db.add({ table: users, row: { email: "jordan.lee@example.org", password: "applicant-demo", name: "Jordan Lee", role: "applicant" }, as: "applicant2" }),
        s.db.add({ table: users, row: { email: "blair.chen@agency.gov", password: "reviewer-demo", name: "Blair Chen", role: "reviewer" }, as: "reviewer" }),
        s.db.add({ table: users, row: { email: "alex.rivera@agency.gov", password: "admin-demo", name: "Alex Rivera", role: "admin" }, as: "admin" }),
        // --- programs ---
        s.db.add({ table: grantPrograms, row: { name: "Community Broadband Access Grant", summary: "Funding to expand reliable internet access in underserved neighborhoods.", status: "open", submission_deadline: daysFromNow(30), max_request: 250000 }, as: "prog1" }),
        s.db.add({ table: grantPrograms, row: { name: "Rural Health Outreach Grant", summary: "Support for mobile and telehealth services in rural districts.", status: "closed", submission_deadline: daysFromNow(-10), max_request: 100000 }, as: "prog2" }),
        // --- rubric v1 (superseded, inactive) ---
        s.db.add({ table: reviewCriteria, row: { grant_program_id: ref("prog1.id"), version: 1, label: "Overall merit", description: "Superseded single-criterion rubric, kept for the record.", max_points: 10, weight: 1, is_active: false } }),
        // --- rubric v2 (active; weights 3/2/1/2) ---
        s.db.add({ table: reviewCriteria, row: { grant_program_id: ref("prog1.id"), version: 2, label: "Community impact", description: "How many residents benefit, and how deeply.", max_points: 10, weight: 3, is_active: true }, as: "c1" }),
        s.db.add({ table: reviewCriteria, row: { grant_program_id: ref("prog1.id"), version: 2, label: "Feasibility", description: "Whether the plan fits the team and the timeline.", max_points: 10, weight: 2, is_active: true }, as: "c2" }),
        s.db.add({ table: reviewCriteria, row: { grant_program_id: ref("prog1.id"), version: 2, label: "Budget clarity", description: "How clear and justified the requested budget is.", max_points: 10, weight: 1, is_active: true }, as: "c3" }),
        s.db.add({ table: reviewCriteria, row: { grant_program_id: ref("prog1.id"), version: 2, label: "Sustainability", description: "Whether the work continues after the grant ends.", max_points: 10, weight: 2, is_active: true }, as: "c4" }),
        // --- application 1: funded, full trail, total 63 ---
        s.db.add({ table: applications, row: { applicant_id: ref("applicant.id"), grant_program_id: ref("prog1.id"), title: "Fiber to the Library District", summary: "Run fiber to three branch libraries and offer free public wifi.", requested_amount: 180000, status: "funded", total_score: 63, submitted_at: daysFromNow(-5) }, as: "app1" }),
        // --- application 2: assigned, waiting for a live score ---
        s.db.add({ table: applications, row: { applicant_id: ref("applicant2.id"), grant_program_id: ref("prog1.id"), title: "Mobile Hotspot Lending Program", summary: "Lend LTE hotspots from library branches to families without home internet.", requested_amount: 90000, status: "assigned", submitted_at: daysFromNow(-3) }, as: "app2" }),
        // --- application 3: rejected (its program closed) ---
        s.db.add({ table: applications, row: { applicant_id: ref("applicant.id"), grant_program_id: ref("prog2.id"), title: "Rural Clinic Telehealth Kiosks", summary: "Install telehealth kiosks in two rural clinics.", requested_amount: 80000, status: "rejected", submitted_at: daysFromNow(-20) }, as: "app3" }),
        // --- assignments ---
        s.db.add({ table: reviewAssignments, row: { application_id: ref("app1.id"), reviewer_id: ref("reviewer.id"), assigned_by: ref("admin.id") } }),
        s.db.add({ table: reviewAssignments, row: { application_id: ref("app2.id"), reviewer_id: ref("reviewer.id"), assigned_by: ref("admin.id") } }),
        // --- scores for app1 (8,7,9,8 → 3*8 + 2*7 + 1*9 + 2*8 = 63) ---
        s.db.add({ table: scores, row: { application_id: ref("app1.id"), reviewer_id: ref("reviewer.id"), criteria_id: ref("c1.id"), points: 8, note: "Strong, wide community benefit." } }),
        s.db.add({ table: scores, row: { application_id: ref("app1.id"), reviewer_id: ref("reviewer.id"), criteria_id: ref("c2.id"), points: 7, note: "Feasible with the current library staff." } }),
        s.db.add({ table: scores, row: { application_id: ref("app1.id"), reviewer_id: ref("reviewer.id"), criteria_id: ref("c3.id"), points: 9, note: "Clear, itemized budget." } }),
        s.db.add({ table: scores, row: { application_id: ref("app1.id"), reviewer_id: ref("reviewer.id"), criteria_id: ref("c4.id"), points: 8, note: "A credible plan past the grant period." } }),
        // --- audit trail: app1 (8 events, in order) ---
        s.db.add({ table: reviewEvents, row: { application_id: ref("app1.id"), actor_id: ref("applicant.id"), action: "submitted", detail: obj({ requested_amount: c.int(180000) }) } }),
        s.db.add({ table: reviewEvents, row: { application_id: ref("app1.id"), actor_id: ref("admin.id"), action: "assigned", detail: obj({ reviewer_id: ref("reviewer.id") }) } }),
        s.db.add({ table: reviewEvents, row: { application_id: ref("app1.id"), actor_id: ref("reviewer.id"), action: "scored", detail: obj({ criteria_id: ref("c1.id"), points: c.int(8) }) } }),
        s.db.add({ table: reviewEvents, row: { application_id: ref("app1.id"), actor_id: ref("reviewer.id"), action: "scored", detail: obj({ criteria_id: ref("c2.id"), points: c.int(7) }) } }),
        s.db.add({ table: reviewEvents, row: { application_id: ref("app1.id"), actor_id: ref("reviewer.id"), action: "scored", detail: obj({ criteria_id: ref("c3.id"), points: c.int(9) }) } }),
        s.db.add({ table: reviewEvents, row: { application_id: ref("app1.id"), actor_id: ref("reviewer.id"), action: "scored", detail: obj({ criteria_id: ref("c4.id"), points: c.int(8) }) } }),
        s.db.add({ table: reviewEvents, row: { application_id: ref("app1.id"), actor_id: ref("reviewer.id"), action: "computed", detail: obj({ total_score: c.int(63) }) } }),
        s.db.add({ table: reviewEvents, row: { application_id: ref("app1.id"), actor_id: ref("admin.id"), action: "decided", detail: obj({ decision: c.text("funded"), total_score: c.int(63) }) } }),
        // --- audit trail: app2 (2 events) ---
        s.db.add({ table: reviewEvents, row: { application_id: ref("app2.id"), actor_id: ref("applicant2.id"), action: "submitted", detail: obj({ requested_amount: c.int(90000) }) } }),
        s.db.add({ table: reviewEvents, row: { application_id: ref("app2.id"), actor_id: ref("admin.id"), action: "assigned", detail: obj({ reviewer_id: ref("reviewer.id") }) } }),
        // --- audit trail: app3 (2 events) ---
        s.db.add({ table: reviewEvents, row: { application_id: ref("app3.id"), actor_id: ref("applicant.id"), action: "submitted", detail: obj({ requested_amount: c.int(80000) }) } }),
        s.db.add({ table: reviewEvents, row: { application_id: ref("app3.id"), actor_id: ref("admin.id"), action: "rejected", detail: obj({ reason: c.text("The program closed before review.") }) } }),
      ],
    }),
    s.db.query({ table: applications, returnType: "count", as: "appCount" }),
  ],
  response: { ok: c.bool(true), applications: ref("appCount") },
});
