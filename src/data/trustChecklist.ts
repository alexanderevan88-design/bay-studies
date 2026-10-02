/**
 * Trust checklist — “How we verify sources” (Week 4 soft-launch).
 * Sourced from product wireframes + ingest allowlist rules.
 */
export type TrustCheckItem = {
  id: string;
  title: string;
  body: string;
};

export const TRUST_CHECKLIST: TrustCheckItem[] = [
  {
    id: "allowlist",
    title: "Firm on our allowlist",
    body:
      "Sender From domain must match a known research firm (Bay Area facilities, sensory labs, big-tech public panels, and vetted playtest/UX platforms). Unknown senders never auto-publish.",
  },
  {
    id: "apply-domain",
    title: "Apply link on the firm’s domain",
    body:
      "Screener / apply URLs must live on the firm’s own allowlisted host (e.g. fieldwork.com). Off-domain links get a warning and stay in review.",
  },
  {
    id: "pay-time",
    title: "Pay and time upfront",
    body:
      "We surface incentive ($) and session length before you tap. If the parser can’t find them, confidence drops and a human reviews.",
  },
  {
    id: "verified-badge",
    title: "Verified firm badge",
    body:
      "Cards show Verified when From is allowlisted and parse confidence is solid — so you can spot trusted invites at a glance.",
  },
  {
    id: "no-fee",
    title: "No fee. Ever.",
    body:
      "We never charge you to apply. You leave Bay Studies and finish on the firm’s site — we don’t take a cut or collect screener answers.",
  },
  {
    id: "new-domain",
    title: "New From domains need review",
    body:
      "The first time we see a From domain (even if allowlisted), it stays in manual review. After you Approve once, high-confidence mail from that domain can auto-publish.",
  },
  {
    id: "link-health",
    title: "Link health checks",
    body:
      "Admins can HEAD/GET apply URLs. Non-2xx responses mark the study expired so you don’t chase a closed screener.",
  },
  {
    id: "human-gate",
    title: "Human gate for soft launch",
    body:
      "Auto-publish only runs when confidence ≥ 75%, From is allowlisted, and the domain was previously approved. Manual Approve / Reject always available.",
  },
];

export const TRUST_FIRMS = [
  "Fieldwork",
  "Tasteocracy",
  "CLC",
  "Curion",
  "Nichols",
  "Fleischman",
  "L&E Opinions",
  "Focus Group (Sago)",
  "VGM",
  "Google UX",
  "EA Playtesting",
  "Salesforce Research",
  "PlaytestCloud",
  "User Interviews",
  "Meta AR/VR",
] as const;
