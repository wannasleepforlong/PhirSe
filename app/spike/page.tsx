import type { Metadata } from "next";
import SpikeClient from "./SpikeClient";

export const metadata: Metadata = { title: "Speech spike · PhirSe" };

export default function SpikePage() {
  return <SpikeClient />;
}
