/**
 * Tracker registry — one entry per upstream dashboard we mirror.
 * Add new trackers here; the home page renders this list.
 */
export type Tracker = {
  slug: string;
  name: string;
  fullName: string;
  description: string;
  source: string;
  sourceName: string;
};

export const trackers: Tracker[] = [
  {
    slug: "abdm",
    name: "ABDM",
    fullName: "Ayushman Bharat Digital Mission",
    description:
      "ABHA numbers created and health records linked by tracked partners, mirrored daily from the National Health Authority's public ABDM dashboard.",
    source: "https://dashboard.abdm.gov.in/abdm/",
    sourceName: "NHA ABDM dashboard",
  },
];
