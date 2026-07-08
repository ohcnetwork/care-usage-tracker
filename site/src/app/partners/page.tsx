import type { Metadata } from "next";
import { PartnersExplorer } from "@/components/partners-explorer";

export const metadata: Metadata = {
  title: "Partners",
  description:
    "Partner-wise ABDM adoption — ABHA numbers created and health records linked by every integrated partner, filterable by state and partner name.",
};

export default function PartnersPage() {
  return <PartnersExplorer />;
}
