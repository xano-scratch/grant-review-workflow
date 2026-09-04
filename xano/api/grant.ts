import { apiGroup } from "@xanots/sdk";

// One API group for the whole backend. The canonical slug is PINNED so public
// paths (/api:grant/<name>) are stable and getPath() resolves in the browser
// bundle without needing a lock. Every query sets name to its own sub-path
// (e.g. "applications/submit").
export const grant = apiGroup({ name: "grant", canonical: "grant" });
