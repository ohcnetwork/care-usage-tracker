import type { Metadata } from "next";
import { TnghFacilitiesExplorer } from "@/components/tngh/facilities-explorer";

export const metadata: Metadata = {
  title: "Facilities",
  description:
    "Tamil Nadu government facilities generating Scan & Share OPD registration tokens — filter by district and facility class.",
};

export default function TnghFacilitiesPage() {
  return <TnghFacilitiesExplorer />;
}
