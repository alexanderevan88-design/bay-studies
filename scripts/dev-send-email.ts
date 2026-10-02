/**
 * Inject a test email into the local inbox via POST /api/inbound/dev.
 *
 * Usage:
 *   npx --yes tsx scripts/dev-send-email.ts
 *   npx --yes tsx scripts/dev-send-email.ts --from "x@fieldwork.com" --subject "Hi" --text "Pay: \$100 ..."
 *   BASE_URL=http://localhost:3000 npx --yes tsx scripts/dev-send-email.ts
 *
 * Or curl:
 *   curl -s -X POST http://localhost:3000/api/inbound/dev \
 *     -H 'Content-Type: application/json' \
 *     -d '{"from":"Recruiting <invite@consumerlearningcenter.com>","subject":"Dev \$125 study","text":"Compensation: \$125\nDuration: 60 minutes\nAges: 30-50\nhttps://www.consumerlearningcenter.com/screener/x"}'
 */

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return undefined;
}

async function main() {
  const payload = {
    from:
      arg("--from") ??
      "Recruiting <invite@consumerlearningcenter.com>",
    subject:
      arg("--subject") ??
      `CLI inject: Paid UX interview — $125 / 60 min (${new Date().toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles" })} PT)`,
    text:
      arg("--text") ??
      `CLI inject via scripts/dev-send-email.ts

Compensation: $125
Duration: 60 minutes via Zoom
Ages: 30–55
Location: Remote (Bay Area)

Apply:
https://www.consumerlearningcenter.com/screener/cli-inject

— Dev
`,
    to: arg("--to") ?? "ingest@baystudies.local",
  };

  const res = await fetch(`${BASE}/api/inbound/dev`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
  if (!res.ok || !json.ok) {
    process.exit(1);
  }
  console.log(`\nOpen ${BASE}/admin/ingest — live inbox should list this email.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
