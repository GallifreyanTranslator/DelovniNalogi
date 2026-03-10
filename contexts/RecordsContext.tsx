import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { MMKV } from 'react-native-mmkv';
import { OptionItem, VEHICLES, WORKERS } from '@/constants/data';

// ─── MMKV instance ────────────────────────────────────────────────────────────
// MMKV is 100% synchronous — no async bridge, no promises, no deadlocks.
// It works reliably on HyperOS/MIUI where AsyncStorage and expo-file-system
// can deadlock due to aggressive background process management.
const storage = new MMKV({ id: 'work-records-v1' });

const KEYS = {
  records: 'records',
  vehicles: 'custom_vehicles',
  workers: 'custom_workers',
};

// ─── Storage helpers (synchronous) ────────────────────────────────────────────

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
    console.warn('MMKV write error:', key, e);
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
  // Load synchronously from MMKV — no async, no waiting, instant.
  const [records, setRecords] = useState<WorkRecord[]>(() =>
    readJson<WorkRecord[]>(KEYS.records, [])
  );
  const [vehicles, setVehicles] = useState<OptionItem[]>(() => {
    const custom = readJson<OptionItem[]>(KEYS.vehicles, []);
    return [...VEHICLES, ...custom];
  });
  const [workers, setWorkers] = useState<OptionItem[]>(() => {
    const custom = readJson<OptionItem[]>(KEYS.workers, []);
    return [...WORKERS, ...custom];
  });

  // loading is always false — data is available synchronously on first render
  const loading = false;

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
    setVehicles(prev => {
      const custom = prev.slice(VEHICLES.length);
      const updated = [...custom, item];
      writeJson(KEYS.vehicles, updated);
      return [...VEHICLES, ...updated];
    });
  }, []);

  const addCustomWorker = useCallback((item: OptionItem) => {
    setWorkers(prev => {
      const custom = prev.slice(WORKERS.length);
      const updated = [...custom, item];
      writeJson(KEYS.workers, updated);
      return [...WORKERS, ...updated];
    });
  }, []);

  return (
    <RecordsContext.Provider value={{
      records, vehicles, workers, loading,
      addJob, deleteGroup, clearAll,
      addCustomVehicle, addCustomWorker,
    }}>
      {children}
    </RecordsContext.Provider>
  );
}
