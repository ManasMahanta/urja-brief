import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let email: unknown;
  try {
    ({ email } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    // Graceful dev/demo mode: the site works end-to-end without credentials.
    return NextResponse.json({
      ok: true,
      configured: false,
      message:
        "Email signup isn't configured yet (set BUTTONDOWN_API_KEY). Your address was not stored.",
    });
  }

  const res = await fetch("https://api.buttondown.com/v1/subscribers", {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email_address: email.trim() }),
  });

  if (res.ok) {
    return NextResponse.json({ ok: true, configured: true });
  }

  // Buttondown returns 400 with a code for duplicates; treat as success so we
  // don't leak which addresses are subscribed.
  if (res.status === 400) {
    const body = await res.json().catch(() => null);
    const detail = JSON.stringify(body ?? "");
    if (detail.includes("already")) {
      return NextResponse.json({ ok: true, configured: true });
    }
    return NextResponse.json(
      { error: "That email address was rejected. Please try another." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { error: "Subscription service is unavailable right now. Please try again later." },
    { status: 502 },
  );
}
