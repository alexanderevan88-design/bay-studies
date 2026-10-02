import { NextResponse } from "next/server";

/**
 * Server-side link health check (avoids browser CORS on HEAD/GET).
 * Demo-safe: no auth; only checks absolute http(s) URLs.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url")?.trim() ?? "";

  if (!url) {
    return NextResponse.json(
      { ok: false, status: null, error: "Missing url", checkedAt: now() },
      { status: 400 }
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json(
      { ok: false, status: null, error: "Invalid URL", checkedAt: now() },
      { status: 400 }
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json(
      {
        ok: false,
        status: null,
        error: "Only http(s) URLs allowed",
        checkedAt: now(),
      },
      { status: 400 }
    );
  }

  const checkedAt = now();

  try {
    let res = await fetch(parsed.toString(), {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "BayStudies-LinkCheck/1.0" },
    });

    // Some hosts reject HEAD — fall back to GET
    if (res.status === 405 || res.status === 501) {
      res = await fetch(parsed.toString(), {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "BayStudies-LinkCheck/1.0" },
      });
    }

    const status = res.status;
    const ok = status >= 200 && status < 300;
    return NextResponse.json({
      ok,
      status,
      url: parsed.toString(),
      expired: !ok,
      checkedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json({
      ok: false,
      status: null,
      url: parsed.toString(),
      expired: true,
      error: message,
      checkedAt,
    });
  }
}

function now() {
  return new Date().toISOString();
}
