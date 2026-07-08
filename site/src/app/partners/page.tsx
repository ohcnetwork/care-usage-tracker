import type { Metadata } from "next";
import { PartnersExplorer } from "@/components/partners-explorer";

export const metadata: Metadata = {
  title: "Partners",
  description:
    "Tracked ABDM partners — ABHA numbers created, health records linked, and daily trends for a curated allowlist of partners, filterable by state.",
};

export default function PartnersPage() {
  return <PartnersExplorer />;
}
