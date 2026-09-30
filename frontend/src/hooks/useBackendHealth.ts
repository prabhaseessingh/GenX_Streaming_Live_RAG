import { useEffect } from "react";
import { useRAGSessionStore } from "@/stores/ragSessionStore";

export function useBackendHealth(pollIntervalMs: number = 30000) {
  const fetchHealth = useRAGSessionStore((state) => state.fetchHealth);
  const health = useRAGSessionStore((state) => state.health);
  const isRefreshingHealth = useRAGSessionStore((state) => state.isRefreshingHealth);

  useEffect(() => {
    fetchHealth();

    if (pollIntervalMs > 0) {
      const timer = setInterval(() => {
        fetchHealth();
      }, pollIntervalMs);

      return () => clearInterval(timer);
    }
  }, [fetchHealth, pollIntervalMs]);

  return {
    health,
    isRefreshingHealth,
    refreshHealth: fetchHealth,
  };
}
