import { useState, useCallback } from "react";
import { api } from "../../../services/api";
import { messageOf } from "../../../lib/utils";
import type { Dashboard } from "../../../types";

export function useDashboard() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const data = await api.dashboard();
      setDashboard(data);
      return data;
    } catch (reason) {
      setError(messageOf(reason));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  return { dashboard, setDashboard, busy, setBusy, error, setError, loadDashboard };
}
