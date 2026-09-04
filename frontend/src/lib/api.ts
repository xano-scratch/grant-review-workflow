// The one contract. Every path and every request/response TYPE is derived from
// the xanots query defs — never hand-typed. Change a def and this file follows.
//
// Importing the lean query defs for getPath()/verb is fine here: they are plain
// queries (no agent/tool graph), so the bundle cost is just the SDK runtime floor
// plus a little per def.

import type { InferInput, InferResponse } from "@xanots/sdk";

import { signup } from "../../../xano/api/auth-signup.js";
import { login } from "../../../xano/api/auth-login.js";
import { programsList } from "../../../xano/api/programs-list.js";
import { submit } from "../../../xano/api/applications-submit.js";
import { queue } from "../../../xano/api/applications-queue.js";
import { detail } from "../../../xano/api/applications-detail.js";
import { assign } from "../../../xano/api/applications-assign.js";
import { recordScore } from "../../../xano/api/scores-record.js";
import { computeScore } from "../../../xano/api/applications-compute-score.js";
import { decide } from "../../../xano/api/applications-decide.js";
import { criteriaList } from "../../../xano/api/criteria-list.js";
import { reviewersList } from "../../../xano/api/users-reviewers.js";
import { seedRun } from "../../../xano/api/seed-run.js";

/** Deployed backend base URL: injected by `xanots deploy --static`, or VITE_XANO_HOST in dev. */
export const XANO_HOST: string =
  (typeof window !== "undefined" && (window as { XANO_HOST?: string }).XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

// --- bearer token store (persisted so a refresh keeps the session) ---
const TOKEN_KEY = "grw.token";
let authToken: string | null =
  typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

export function setToken(token: string | null) {
  authToken = token;
  if (typeof localStorage === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getToken(): string | null {
  return authToken;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function call(path: string, verb: string, body?: unknown): Promise<unknown> {
  const res = await fetch(XANO_HOST + path, {
    method: verb,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "message" in data && (data as { message?: string }).message) ||
      `Request failed (${res.status})`;
    throw new ApiError(String(msg), res.status);
  }
  return data;
}

// --- Types, all inferred from the defs ---
export type SignupBody = InferInput<typeof signup>;
export type LoginBody = InferInput<typeof login>;
export type AuthResult = InferResponse<typeof login>;
export type User = AuthResult["user"];
export type Role = User["role"];

export type Program = InferResponse<typeof programsList>[number];
export type Application = InferResponse<typeof submit>;
export type SubmitBody = InferInput<typeof submit>;

export type ApplicationDetail = InferResponse<typeof detail>;
export type Criterion = ApplicationDetail["criteria"][number];
export type ScoreRow = ApplicationDetail["scores"][number];
export type EventRow = ApplicationDetail["events"][number];

export type Reviewer = InferResponse<typeof reviewersList>[number];
export type ScoreBody = InferInput<typeof recordScore>;
export type AssignBody = InferInput<typeof assign>;
export type DecideBody = InferInput<typeof decide>;

// --- Endpoint wrappers (paths + verbs straight from the defs) ---
export const api = {
  seed: () => call(seedRun.getPath(), seedRun.verb, { reset: false }) as Promise<{ ok: boolean; applications: number }>,

  signup: (body: SignupBody) => call(signup.getPath(), signup.verb, body) as Promise<AuthResult>,
  login: (body: LoginBody) => call(login.getPath(), login.verb, body) as Promise<AuthResult>,

  programs: () => call(programsList.getPath(), programsList.verb) as Promise<Program[]>,
  criteria: (program_id: number) =>
    call(`${criteriaList.getPath()}?program_id=${program_id}`, criteriaList.verb) as Promise<Criterion[]>,

  submit: (body: SubmitBody) => call(submit.getPath(), submit.verb, body) as Promise<Application>,

  queue: (status?: string) => {
    const path = status ? `${queue.getPath()}?status=${encodeURIComponent(status)}` : queue.getPath();
    return call(path, queue.verb) as Promise<Application[]>;
  },
  detail: (application_id: number) =>
    call(detail.getPath({ params: { application_id } }), detail.verb) as Promise<ApplicationDetail>,

  assign: (body: AssignBody) => call(assign.getPath(), assign.verb, body) as Promise<{ application: Application }>,
  reviewers: () => call(reviewersList.getPath(), reviewersList.verb) as Promise<Reviewer[]>,
  score: (body: ScoreBody) => call(recordScore.getPath(), recordScore.verb, body) as Promise<ScoreRow>,
  compute: (application_id: number) =>
    call(computeScore.getPath(), computeScore.verb, { application_id }) as Promise<Application>,
  decide: (body: DecideBody) => call(decide.getPath(), decide.verb, body) as Promise<Application>,
};
