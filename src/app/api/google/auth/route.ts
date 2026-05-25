// Server-only. Redirects the user to Google's OAuth consent screen.
import { NextResponse } from "next/server";
import {
  GOOGLE_SCOPES,
  getGoogleConfig,
  makeOAuth2Client,
} from "@/lib/google-oauth";

export const runtime = "nodejs";

export async function GET() {
  const config = getGoogleConfig();
  if (!config) {
    return NextResponse.json(
      {
        error:
          "google export not configured — set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI in env.",
      },
      { status: 503 }
    );
  }

  const oauth2 = makeOAuth2Client(config);
  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    include_granted_scopes: true,
  });

  return NextResponse.redirect(url);
}
