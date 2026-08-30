// Central place for the backend API base URL.
// Override by setting NEXT_PUBLIC_API_URL in a .env.local file (or in your
// deployment platform's environment variables) if the backend isn't running
// on localhost:8000 — e.g. when deploying the frontend separately or running
// the backend on a different host/port during the demo.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
