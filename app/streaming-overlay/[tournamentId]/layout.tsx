"use client";

import { TournamentProvider } from "@/lib/contexts/TournamentContext";

export default function StreamingOverlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TournamentProvider>{children}</TournamentProvider>;
}
