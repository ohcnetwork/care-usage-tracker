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
  {
    slug: "tngh",
    name: "TN Govt Hospitals",
    fullName: "Tamil Nadu Government Hospitals",
    description:
      "Digital health adoption across Tamil Nadu's government & public health facilities — ABHAs, record linkage, and per-facility Scan & Share activity, mirrored daily from the NHA's public ABDM dashboard.",
    source: "https://dashboard.abdm.gov.in/abdm/",
    sourceName: "NHA ABDM dashboard",
  },
];
