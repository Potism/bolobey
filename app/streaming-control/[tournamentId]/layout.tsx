"use client";

import { TournamentProvider } from "@/lib/contexts/TournamentContext";

export default function StreamingControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TournamentProvider>{children}</TournamentProvider>;
}
