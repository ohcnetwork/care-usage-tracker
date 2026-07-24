import type { Metadata } from "next";
import { TnghFacilitiesExplorer } from "@/components/tngh/facilities-explorer";

export const metadata: Metadata = {
  title: "Facilities",
  description:
    "Tamil Nadu government facilities — Scan & Share tokens, health records linked and ABHAs linked, filterable by district and facility class.",
};

export default function TnghFacilitiesPage() {
  return <TnghFacilitiesExplorer />;
}
