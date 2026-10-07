/**
 * Soft near-duplicate check: title normalize, pay, metro overlap.
 * Run: npm run test:near-dup
 */
import assert from "node:assert/strict";
import {
  compareTitles,
  craigslistFeedSkipReason,
  findLiveNearDuplicate,
  normalizeTitle,
  samePay,
} from "../src/lib/nearDuplicate";
import type { Metro } from "../src/lib/types";

const BAY: Metro[] = ["sf", "oakland", "peninsula", "san-jose", "east-bay"];

function study(partial: {
  id: string;
  title: string;
  pay?: number;
  payLabel?: string;
  metro?: Metro[];
  applyUrl?: string;
}) {
  return {
    id: partial.id,
    title: partial.title,
    pay: partial.pay ?? 0,
    payLabel: partial.payLabel,
    metro: partial.metro ?? BAY,
    applyUrl: partial.applyUrl ?? "https://example.com/apply",
  };
}

const live = [
  study({
    id: "pub-cl-7974124959",
    title: "Participants needed, paid Market Research Study — pays $400",
    pay: 400,
    applyUrl: "https://paidfocusgroupstudies.com",
  }),
  study({
    id: "pub-cl-7975583982",
    title: "Get paid for your opinions — Research America panel (Bay Area)",
    pay: 0,
    payLabel: "Varies / panel",
    applyUrl: "https://survey.metrixmatrix.com/SE/?st=abc",
  }),
  study({
    id: "pub-em-ui-palo",
    title: "November Palo Alto Customer Clinic (1:1)",
    pay: 75,
    payLabel: "$75 via digital gift card",
    metro: ["peninsula", "sf", "san-jose"],
    applyUrl: "https://www.userinterviews.com/projects/lPQ46bMxzA/apply",
  }),
  study({
    id: "pub-rwc-a",
    title: "Redwood City beverage study (RWC_J105195_10)",
    pay: 40,
    metro: ["peninsula"],
    applyUrl: "https://curioninsights.com/",
  }),
  study({
    id: "pub-rwc-b",
    title: "Redwood City in-person study (RWC_J105148)",
    pay: 40,
    metro: ["peninsula"],
    applyUrl: "https://curioninsights.com/other",
  }),
];

assert.equal(
  normalizeTitle("  🔥  Paid Focus-Group!!!  "),
  "paid focus group"
);

assert.equal(samePay({ pay: 400 }, { pay: 0, payLabel: "pays $400" }), true);
assert.equal(
  samePay({ pay: 0, payLabel: "Varies / panel" }, { payLabel: "varies / panel" }),
  true
);
assert.equal(samePay({ pay: 150 }, { pay: 75, payLabel: "$75 gift card" }), false);
assert.equal(samePay({ pay: 0 }, { pay: 0 }), false);

const paraphrased = findLiveNearDuplicate(
  study({
    id: "pub-new",
    title: "Participants needed — paid Market Research Study (pays $400)",
    pay: 400,
  }),
  live
);
assert.ok(paraphrased, "fuzzy/normalized $400 study should warn");
assert.equal(paraphrased?.id, "pub-cl-7974124959");

const emojiTwin = findLiveNearDuplicate(
  study({
    id: "pub-new-2",
    title: "Participants needed, paid Market Research Study — pays $400",
    pay: 0,
    payLabel: "$400",
  }),
  live
);
assert.equal(emojiTwin?.titleKind, "normalized");

const differentPay = findLiveNearDuplicate(
  study({
    id: "pub-new-3",
    title: "November Palo Alto Customer Clinic (1:1)",
    pay: 150,
    metro: ["peninsula"],
  }),
  live
);
assert.equal(differentPay, null, "same title, different pay is not a dup");

const otherMetro = findLiveNearDuplicate(
  study({
    id: "pub-new-4",
    title: "November Palo Alto Customer Clinic (1:1)",
    pay: 75,
    metro: ["oakland"],
  }),
  live
);
assert.equal(otherMetro, null, "no shared metro");

const sameId = findLiveNearDuplicate(
  study({
    id: "pub-cl-7974124959",
    title: "Participants needed, paid Market Research Study — pays $400",
    pay: 400,
  }),
  live
);
assert.equal(sameId, null, "same id is an upsert");

const redwood = compareTitles(
  "Redwood City beverage study (RWC_J105195_10)",
  "Redwood City in-person study (RWC_J105148)"
);
assert.equal(redwood.equal, false);
assert.equal(redwood.fuzzy, false, `redwood score ${redwood.score}`);

const panel = findLiveNearDuplicate(
  study({
    id: "pub-panel-2",
    title: "Get paid for your opinions — Research America panel (Bay Area)!",
    payLabel: "Varies / panel",
  }),
  live
);
assert.equal(panel?.id, "pub-cl-7975583982");

assert.equal(
  craigslistFeedSkipReason(
    study({
      id: "pub-cl-new",
      title: "Something else entirely here",
      pay: 20,
      applyUrl: "https://paidfocusgroupstudies.com/",
    }),
    live
  ),
  "apply URL already published (pub-cl-7974124959)"
);

assert.match(
  craigslistFeedSkipReason(
    study({
      id: "pub-cl-new",
      title: "Participants needed, paid Market Research Study — pays $400",
      pay: 400,
      applyUrl: "https://other.example/apply",
    }),
    live
  ) ?? "",
  /normalized title \+ pay already on feed/
);

assert.equal(
  craigslistFeedSkipReason(
    study({
      id: "pub-cl-7974124959",
      title: "Participants needed, paid Market Research Study — pays $400",
      pay: 400,
      applyUrl: "https://paidfocusgroupstudies.com",
    }),
    live
  ),
  null,
  "same published id is not a skip"
);

const firstTime = findLiveNearDuplicate(
  study({
    id: "pub-brand-new",
    title: "Walnut Creek snack taste test Tuesday evening",
    pay: 125,
    metro: ["east-bay"],
    applyUrl: "https://brand-new.example/screener",
  }),
  live
);
assert.equal(firstTime, null);

console.log("near-duplicate tests ok");
