import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { facilityApi } from "./api";
import {
  legitimateOperator,
  type AssetCommand,
  type FacilityApi,
  type FacilityCommandResult,
  type FacilityScenarioResult,
  type FacilitySnapshot,
  type OperatorSession,
} from "./types";

type UseFacilityOptions = {
  api?: FacilityApi;
  pollMs?: number;
};

export function useFacility({ api = facilityApi, pollMs = 1000 }: UseFacilityOptions = {}) {
  const [snapshot, setSnapshot] = useState<FacilitySnapshot | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commandPending, setCommandPending] = useState(false);
  const [lastCommand, setLastCommand] = useState<FacilityCommandResult | null>(null);
  const [scenario, setScenario] = useState<FacilityScenarioResult | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return null;
    inFlight.current = true;
    try {
      const next = await api.getSnapshot();
      setSnapshot(next);
      setIsStale(false);
      setError(null);
      return next;
    } catch (reason) {
      setIsStale(true);
      setError(reason instanceof Error ? reason.message : "Facility data is unavailable");
      return null;
    } finally {
      inFlight.current = false;
    }
  }, [api]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(timer);
  }, [pollMs, refresh]);

  const executeCommand = useCallback(
    async (assetId: string, command: AssetCommand, session: OperatorSession = legitimateOperator) => {
      setCommandPending(true);
      setError(null);
      try {
        const result = await api.executeCommand(assetId, { command, session });
        setLastCommand(result);
        setSnapshot((current) =>
          current
            ? {
                ...current,
                revision: current.revision + (result.applied ? 1 : 0),
                assets: current.assets.map((asset) => (asset.id === result.asset.id ? result.asset : asset)),
              }
            : current,
        );
        return result;
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Command failed");
        throw reason;
      } finally {
        setCommandPending(false);
      }
    },
    [api],
  );

  const reset = useCallback(async () => {
    setCommandPending(true);
    try {
      const next = await api.reset();
      setSnapshot(next);
      setScenario(null);
      setLastCommand(null);
      setError(null);
      return next;
    } finally {
      setCommandPending(false);
    }
  }, [api]);

  const runScenario = useCallback(async () => {
    setCommandPending(true);
    setError(null);
    try {
      const result = await api.runScenario();
      setScenario(result);
      setLastCommand(result.attack);
      await refresh();
      return result;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Scenario failed");
      throw reason;
    } finally {
      setCommandPending(false);
    }
  }, [api, refresh]);

  const selectedAsset = useMemo(
    () => snapshot?.assets.find((asset) => asset.id === selectedId) ?? null,
    [selectedId, snapshot],
  );

  return {
    snapshot,
    selectedId,
    selectedAsset,
    selectAsset: setSelectedId,
    isStale,
    error,
    commandPending,
    lastCommand,
    scenario,
    refresh,
    executeCommand,
    reset,
    runScenario,
  };
}
