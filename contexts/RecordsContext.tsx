import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { storage, hydrateStorage } from '@/services/mmkv';
import { OptionItem, VEHICLES, WORKERS } from '@/constants/data';

// ─── Storage keys ─────────────────────────────────────────────────────────────
const KEYS = {
  records: 'records',
  vehicles: 'custom_vehicles',
  workers: 'custom_workers',
};

// ─── Storage helpers (synchronous reads from in-memory cache) ─────────────────

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = storage.getString(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    storage.set(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage write error:', key, e);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkRecord {
  id: number;
  datum: string;
  cas: string;
  obcina: string;
  operacija: string;
  vozilo: string;
  voziloValue: string;
  oseba: string;
  osebaValue: string;
  tipOsebe: 'voznik' | 'sodelavec';
  ure: number;
  skupinaId: number;
}

interface AddJobPayload {
  obcina: string;
  operacija: string;
  vozilo: string;
  voziloValue: string;
  voznik: OptionItem;
  coworker1: OptionItem | null;
  coworker2: OptionItem | null;
  ure: number;
}

interface RecordsContextType {
  records: WorkRecord[];
  vehicles: OptionItem[];
  workers: OptionItem[];
  loading: boolean;
  addJob: (payload: AddJobPayload) => void;
  deleteGroup: (skupinaId: number) => void;
  clearAll: () => void;
  addCustomVehicle: (item: OptionItem) => void;
  addCustomWorker: (item: OptionItem) => void;
}

export const RecordsContext = createContext<RecordsContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function RecordsProvider({ children }: { children: ReactNode }) {
  // Start with empty state — renders immediately, never blocks.
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [customVehicles, setCustomVehicles] = useState<OptionItem[]>([]);
  const [customWorkers, setCustomWorkers] = useState<OptionItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from AsyncStorage AFTER first render — non-blocking.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        // Give the UI exactly one frame to paint before touching storage.
        await new Promise(r => setTimeout(r, 16));
        if (cancelled) return;

        await hydrateStorage(Object.values(KEYS));
        if (cancelled) return;

        const savedRecords = readJson<WorkRecord[]>(KEYS.records, []);
        const savedVehicles = readJson<OptionItem[]>(KEYS.vehicles, []);
        const savedWorkers = readJson<OptionItem[]>(KEYS.workers, []);

        if (!cancelled) {
          if (savedRecords.length > 0) setRecords(savedRecords);
          if (savedVehicles.length > 0) setCustomVehicles(savedVehicles);
          if (savedWorkers.length > 0) setCustomWorkers(savedWorkers);
          setHydrated(true);
        }
      } catch {
        // Hydration failed — app continues with empty state.
        if (!cancelled) setHydrated(true);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const vehicles = [...VEHICLES, ...customVehicles];
  const workers = [...WORKERS, ...customWorkers];

  const addJob = useCallback((payload: AddJobPayload) => {
    const now = new Date();
    const datum = now.toISOString().slice(0, 10);
    const cas = now.toTimeString().slice(0, 8);
    const skupinaId = Date.now();

    const base = {
      datum, cas,
      obcina: payload.obcina,
      operacija: payload.operacija,
      vozilo: payload.vozilo,
      voziloValue: payload.voziloValue,
      ure: payload.ure,
      skupinaId,
    };

    const newRecords: WorkRecord[] = [];
    let idBase = skupinaId;

    newRecords.push({
      id: idBase++, ...base,
      oseba: payload.voznik.label,
      osebaValue: payload.voznik.value,
      tipOsebe: 'voznik',
    });

    if (payload.coworker1) {
      newRecords.push({
        id: idBase++, ...base,
        oseba: payload.coworker1.label,
        osebaValue: payload.coworker1.value,
        tipOsebe: 'sodelavec',
      });
    }

    if (payload.coworker2) {
      newRecords.push({
        id: idBase++, ...base,
        oseba: payload.coworker2.label,
        osebaValue: payload.coworker2.value,
        tipOsebe: 'sodelavec',
      });
    }

    setRecords(prev => {
      const updated = [...prev, ...newRecords];
      writeJson(KEYS.records, updated);
      return updated;
    });
  }, []);

  const deleteGroup = useCallback((skupinaId: number) => {
    setRecords(prev => {
      const updated = prev.filter(r => r.skupinaId !== skupinaId);
      writeJson(KEYS.records, updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setRecords([]);
    writeJson(KEYS.records, []);
  }, []);

  const addCustomVehicle = useCallback((item: OptionItem) => {
    setCustomVehicles(prev => {
      const updated = [...prev, item];
      writeJson(KEYS.vehicles, updated);
      return updated;
    });
  }, []);

  const addCustomWorker = useCallback((item: OptionItem) => {
    setCustomWorkers(prev => {
      const updated = [...prev, item];
      writeJson(KEYS.workers, updated);
      return updated;
    });
  }, []);

  return (
    <RecordsContext.Provider value={{
      records, vehicles, workers,
      loading: !hydrated,
      addJob, deleteGroup, clearAll,
      addCustomVehicle, addCustomWorker,
    }}>
      {children}
    </RecordsContext.Provider>
  );
}
