import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import {
  WorkRecord,
  loadRecords,
  saveRecords,
  loadCustomVehicles,
  saveCustomVehicles,
  loadCustomWorkers,
  saveCustomWorkers,
} from '@/services/storage';
import { OptionItem, VEHICLES, WORKERS } from '@/constants/data';

interface AddJobPayload {
  obcina: string;
  operacija: string;
  vozilo: string;
  voziloValue: string;
  voznik: OptionItem;
  coworker1: OptionItem | null;
  coworker2: OptionItem | null;
  /** Single hours value – applied to each person and to the vehicle */
  ure: number;
}

interface RecordsContextType {
  records: WorkRecord[];
  vehicles: OptionItem[];
  workers: OptionItem[];
  loading: boolean;
  addJob: (payload: AddJobPayload) => Promise<void>;
  deleteGroup: (skupinaId: number) => Promise<void>;
  clearAll: () => Promise<void>;
  addCustomVehicle: (item: OptionItem) => Promise<void>;
  addCustomWorker: (item: OptionItem) => Promise<void>;
}

export const RecordsContext = createContext<RecordsContextType | undefined>(undefined);

export function RecordsProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [vehicles, setVehicles] = useState<OptionItem[]>(VEHICLES);
  const [workers, setWorkers] = useState<OptionItem[]>(WORKERS);
  // Start as FALSE – render UI immediately, hydrate data in the background.
  // This avoids any chance of AsyncStorage blocking the JS thread on first paint.
  const [loading, setLoading] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    // Already hydrated (StrictMode double-mount guard)
    if (hydrated.current) return;
    hydrated.current = true;

    // Defer AsyncStorage reads to AFTER the first render frame so the UI
    // is never blocked. InteractionManager ensures we wait until all
    // animations/transitions have settled.
    const handle = setTimeout(() => {
      async function hydrate() {
        try {
          const [recs, cveh, cwrk] = await Promise.all([
            loadRecords(),
            loadCustomVehicles(),
            loadCustomWorkers(),
          ]);
          setRecords(recs);
          setVehicles([...VEHICLES, ...cveh]);
          setWorkers([...WORKERS, ...cwrk]);
        } catch (e) {
          // On error, silently keep empty state – app remains usable
          console.warn('RecordsContext hydrate error:', e);
        }
      }
      hydrate();
    }, 100); // 100ms after first render – well past initial paint

    return () => clearTimeout(handle);
  }, []);

  /**
   * Creates one WorkRecord per person involved in the job:
   *  - voznik  → tipOsebe: 'voznik'   (linked to vehicle)
   *  - coworker1/2 → tipOsebe: 'sodelavec'
   * All share the same skupinaId for grouped deletion.
   */
  const addJob = useCallback(async (payload: AddJobPayload) => {
    const now = new Date();
    const datum = now.toISOString().slice(0, 10);
    const cas = now.toTimeString().slice(0, 8);
    const skupinaId = Date.now();

    const newRecords: WorkRecord[] = [];
    let idBase = skupinaId;

    const base = {
      datum,
      cas,
      obcina: payload.obcina,
      operacija: payload.operacija,
      vozilo: payload.vozilo,
      voziloValue: payload.voziloValue,
      ure: payload.ure,
      skupinaId,
    };

    // Voznik record
    newRecords.push({
      id: idBase++,
      ...base,
      oseba: payload.voznik.label,
      osebaValue: payload.voznik.value,
      tipOsebe: 'voznik',
    });

    // Coworker 1
    if (payload.coworker1) {
      newRecords.push({
        id: idBase++,
        ...base,
        oseba: payload.coworker1.label,
        osebaValue: payload.coworker1.value,
        tipOsebe: 'sodelavec',
      });
    }

    // Coworker 2
    if (payload.coworker2) {
      newRecords.push({
        id: idBase++,
        ...base,
        oseba: payload.coworker2.label,
        osebaValue: payload.coworker2.value,
        tipOsebe: 'sodelavec',
      });
    }

    const updated = [...records, ...newRecords];
    setRecords(updated);
    await saveRecords(updated);
  }, [records]);

  /** Deletes all records belonging to the same job (skupinaId). */
  const deleteGroup = useCallback(async (skupinaId: number) => {
    const updated = records.filter(r => r.skupinaId !== skupinaId);
    setRecords(updated);
    await saveRecords(updated);
  }, [records]);

  const clearAll = useCallback(async () => {
    setRecords([]);
    await saveRecords([]);
  }, []);

  const addCustomVehicle = useCallback(async (item: OptionItem) => {
    const currentCustom = vehicles.slice(VEHICLES.length);
    const updated = [...currentCustom, item];
    setVehicles([...VEHICLES, ...updated]);
    await saveCustomVehicles(updated);
  }, [vehicles]);

  const addCustomWorker = useCallback(async (item: OptionItem) => {
    const currentCustom = workers.slice(WORKERS.length);
    const updated = [...currentCustom, item];
    setWorkers([...WORKERS, ...updated]);
    await saveCustomWorkers(updated);
  }, [workers]);

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
