"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useRAGWebSocket } from "@/hooks/useRAGWebSocket";
import { useRAGSessionStore } from "@/stores/ragSessionStore";

export default function Home() {
  const hydrateSession = useRAGSessionStore((state) => state.hydrateSession);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  // Initialize WebSocket transport hook
  useRAGWebSocket();

  return <AppShell />;
}
