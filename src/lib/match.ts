import type { MatchReason, Profile, Study } from "./types";
import { METRO_LABELS, STUDY_TYPE_LABELS } from "./types";

/** Soft match % from profile age/gender/metro vs study eligibility. */
export function computeMatchPercent(
  study: Study,
  profile: Profile | null
): number {
  if (!profile || !profile.onboarded) return 70;

  let score = 55;
  const age = resolveAge(profile);

  // Age fit
  const { ageMin, ageMax, genders, hasKids } = study.eligibility;
  if (age != null) {
    if (ageMin != null && ageMax != null) {
      if (age >= ageMin && age <= ageMax) score += 18;
      else if (age >= ageMin - 3 && age <= ageMax + 3) score += 8;
      else score -= 12;
    } else if (ageMin != null && age >= ageMin) score += 10;
    else if (ageMax != null && age <= ageMax) score += 10;
  }

  // Gender fit
  if (genders && genders.length > 0 && profile.gender) {
    if (genders.includes(profile.gender)) score += 10;
    else if (profile.gender === "prefer-not") score += 4;
    else score -= 8;
  } else {
    score += 5;
  }

  // Metro fit
  if (profile.metro && study.metro.includes(profile.metro)) {
    score += 14;
  } else if (profile.metro) {
    score -= 6;
  }

  // Kids preference on study
  if (hasKids === true) {
    if (profile.hasKids === true) score += 8;
    else if (profile.hasKids === false) score -= 5;
  }

  // Modality preference
  if (profile.modality === "both") score += 4;
  else if (profile.modality === study.modality) score += 8;
  else score -= 10;

  // Study type preference
  if (profile.studyTypes.includes(study.type)) score += 6;
  else score -= 8;

  // Min pay
  if (study.pay >= profile.minPay) score += 5;
  else score -= 10;

  return Math.max(42, Math.min(98, Math.round(score)));
}

/** True when profile is onboarded and match score clears the soft threshold. */
export function isProfileMatch(
  study: Study,
  profile: Profile | null,
  threshold = 70
): boolean {
  if (!profile?.onboarded) return false;
  if (study.expired) return false;
  return computeMatchPercent(study, profile) >= threshold;
}

/** Human-readable why-matched lines for study detail. */
export function explainMatch(
  study: Study,
  profile: Profile | null
): MatchReason[] {
  if (!profile || !profile.onboarded) {
    return [
      {
        ok: true,
        label: "Finish your profile — we’ll explain exactly why each study fits",
      },
    ];
  }

  const reasons: MatchReason[] = [];
  const age = resolveAge(profile);
  const { ageMin, ageMax, genders, hasKids } = study.eligibility;

  if (ageMin != null || ageMax != null) {
    const range =
      ageMin != null && ageMax != null
        ? `${ageMin}–${ageMax}`
        : ageMin != null
          ? `${ageMin}+`
          : `up to ${ageMax}`;
    if (age != null) {
      const inRange =
        (ageMin == null || age >= ageMin) &&
        (ageMax == null || age <= ageMax);
      reasons.push({
        ok: inRange,
        label: inRange
          ? `You’re ${age} — this study wants ages ${range}`
          : `You’re ${age}, but this study wants ages ${range}`,
      });
    } else {
      reasons.push({
        ok: false,
        label: `Study wants ages ${range} — add your age for a clearer score`,
      });
    }
  }

  if (genders && genders.length > 0) {
    if (profile.gender && genders.includes(profile.gender)) {
      reasons.push({ ok: true, label: "Your gender fits this screener" });
    } else if (profile.gender === "prefer-not") {
      reasons.push({
        ok: true,
        label: "Gender isn’t required to open the screener",
      });
    } else if (profile.gender) {
      reasons.push({
        ok: false,
        label: "Gender may not match what this screener asks for",
      });
    }
  }

  if (profile.metro) {
    const metroOk = study.metro.includes(profile.metro);
    reasons.push({
      ok: metroOk,
      label: metroOk
        ? `Listed for ${METRO_LABELS[profile.metro]} — your metro`
        : `${METRO_LABELS[profile.metro]} isn’t on this study’s metro list`,
    });
  }

  if (hasKids === true) {
    reasons.push({
      ok: profile.hasKids === true,
      label:
        profile.hasKids === true
          ? "Parents / kids in household — fits this study"
          : "This study prefers parents — update kids if that changed",
    });
  }

  const modalityOk =
    profile.modality === "both" || profile.modality === study.modality;
  const modalityLabel =
    study.modality === "remote" ? "Remote" : "In-person";
  reasons.push({
    ok: modalityOk,
    label: modalityOk
      ? `${modalityLabel} matches how you like to participate`
      : `This one is ${modalityLabel.toLowerCase()}; you prefer ${
          profile.modality === "both" ? "both" : profile.modality
        }`,
  });

  const typeOk = profile.studyTypes.includes(study.type);
  reasons.push({
    ok: typeOk,
    label: typeOk
      ? `${STUDY_TYPE_LABELS[study.type]} is one of your study types`
      : `${STUDY_TYPE_LABELS[study.type]} isn’t in your preferred types`,
  });

  const payOk = study.pay >= profile.minPay;
  reasons.push({
    ok: payOk,
    label: payOk
      ? `$${study.pay} meets your $${profile.minPay}+ minimum`
      : `$${study.pay} is below your $${profile.minPay} minimum`,
  });

  return reasons;
}

/** Short label for match chip when profile isn’t ready. */
export function matchPercentLabel(
  study: Study,
  profile: Profile | null
): string {
  if (!profile?.onboarded) return "Match TBD";
  return `${computeMatchPercent(study, profile)}% match`;
}

/** Short age phrase for push copy: "ages 25–40" or "all ages". */
export function ageRangeLabel(study: Study): string {
  const { ageMin, ageMax } = study.eligibility;
  if (ageMin != null && ageMax != null) return `ages ${ageMin}–${ageMax}`;
  if (ageMin != null) return `ages ${ageMin}+`;
  if (ageMax != null) return `ages up to ${ageMax}`;
  return "all ages";
}

/** Push / toast title: "New $150 study — ages 25–40". */
export function formatMatchNotifyTitle(study: Study): string {
  const payBit =
    study.payLabel?.trim() ||
    (study.pay > 0 ? `$${study.pay}` : null);
  return payBit
    ? `New ${payBit} study — ${ageRangeLabel(study)}`
    : `New study — ${ageRangeLabel(study)}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return h === 1 ? "1 hour" : `${h} hours`;
  return `${h}h ${m}m`;
}

export function resolveAge(profile: Profile): number | null {
  if (typeof profile.age === "number") return profile.age;
  if (profile.dob) return ageFromDob(profile.dob);
  return null;
}

function ageFromDob(dob: string): number | null {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}
