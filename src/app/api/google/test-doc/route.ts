// Server-only. Reads the user's access token from the httpOnly cookie and
// creates a tiny test doc in their Google Drive to prove the pipeline works.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { google } from "googleapis";
import { ACCESS_COOKIE } from "@/lib/google-oauth";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "not connected to google" });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const docs = google.docs({ version: "v1", auth });

    const created = await docs.documents.create({
      requestBody: { title: "RESISTANCE test export" },
    });
    const documentId = created.data.documentId;
    if (!documentId) {
      return NextResponse.json({ error: "no document id returned" }, { status: 502 });
    }

    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: "hello from resistance — export pipeline works.\n",
            },
          },
        ],
      },
    });

    return NextResponse.json({
      docUrl: `https://docs.google.com/document/d/${documentId}/edit`,
    });
  } catch {
    // never leak the raw error / token to the client
    return NextResponse.json(
      { error: "failed to create the test doc — try reconnecting google." },
      { status: 502 }
    );
  }
}
