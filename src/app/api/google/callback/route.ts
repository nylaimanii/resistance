// Server-only. Google redirects here with ?code=... after the user consents.
// We exchange the code for tokens and stash the access token in an httpOnly
// cookie so it never touches the client bundle / localStorage.
import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  getGoogleConfig,
  makeOAuth2Client,
} from "@/lib/google-oauth";

export const runtime = "nodejs";

function homeRedirect(request: Request, params: Record<string, string>) {
  const url = new URL("/", request.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return homeRedirect(request, { google: "error", reason: oauthError });
  }
  if (!code) {
    return homeRedirect(request, { google: "error", reason: "missing_code" });
  }

  const config = getGoogleConfig();
  if (!config) {
    return homeRedirect(request, { google: "error", reason: "not_configured" });
  }

  try {
    const oauth2 = makeOAuth2Client(config);
    const { tokens } = await oauth2.getToken(code);
    const accessToken = tokens.access_token;
    if (!accessToken) {
      return homeRedirect(request, { google: "error", reason: "no_access_token" });
    }

    const response = homeRedirect(request, { google: "connected" });
    // expiry_date is ms-since-epoch when present; default to 3600s otherwise
    const maxAgeSec = tokens.expiry_date
      ? Math.max(60, Math.floor((tokens.expiry_date - Date.now()) / 1000))
      : 3600;

    response.cookies.set(ACCESS_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: maxAgeSec,
    });

    return response;
  } catch {
    // never leak the raw error / secrets to the client
    return homeRedirect(request, { google: "error", reason: "exchange_failed" });
  }
}
