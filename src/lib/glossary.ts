/** Plain-English definitions shown in ⓘ help (B1 English level, ≤ 25 words). Source: UI/UX review, hover-text table. */
export const GLOSSARY = {
  xp: { term: "XP", text: "XP (experience points) grow your level. You earn them only when your hours are verified: 10 + 10 per hour (up to 8 h), +10 with a photo." },
  level: { term: "Level", text: "Your level rises as you earn XP. Level 2 needs 100 XP, Level 3 needs 400 XP." },
  verified: { term: "Verified", text: "Verified: the project organizer confirmed these hours. They count in your totals, badges, leaderboard and certificate." },
  selfReported: { term: "Self-reported", text: "Self-reported: you recorded this, but no one has confirmed it yet. It doesn't count until the organizer verifies it." },
  notVerified: { term: "Not verified", text: "The organizer couldn't confirm this entry. Open it to see their note, fix it and submit again." },
  toVerify: { term: "Contributions to verify", text: "Waiting for you. Check the hours and evidence, then Verify or Reject. The volunteer gets a notification either way." },
  peopleReached: { term: "People reached", text: "People who directly benefited, as reported by volunteers and confirmed with their verified entries." },
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;
