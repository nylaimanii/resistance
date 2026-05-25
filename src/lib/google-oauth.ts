// SERVER-ONLY. `import "server-only"` makes the build fail if this is ever
// imported from a client component — guards the google secrets from the bundle.
import "server-only";
import { google } from "googleapis";

// minimal scopes — drive.file only sees files this app creates (per-file scope).
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/drive.file",
];

export const ACCESS_COOKIE = "google_access_token";

export type GoogleConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

// Returns null when any required env var is missing, so routes can fail
// gracefully with a friendly message instead of crashing at build/runtime.
export function getGoogleConfig(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

export function makeOAuth2Client(config: GoogleConfig) {
  return new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );
}
