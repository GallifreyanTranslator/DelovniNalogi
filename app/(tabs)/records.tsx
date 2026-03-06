import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, Shadow } from '@/constants/theme';
import { useRecords } from '@/hooks/useRecords';
import { WorkRecord } from '@/services/storage';
import { exportWorkersXlsx, exportVehiclesXlsx } from '@/services/export';
import { useAlert } from '@/template';

type TabType = 'workers' | 'vehicles';

// ─── Aggregated row types ─────────────────────────────────────────────────────

interface PersonRow {
  key: string;
  obcina: string;
  operacija: string;
  oseba: string;
  osebaValue: string;
  tipOsebe: 'voznik' | 'sodelavec';
  ure: number;
  datum: string;
  skupinaIds: number[];
}

interface VehicleRow {
  key: string;
  obcina: string;
  operacija: string;
  vozilo: string;
  voziloValue: string;
  ure: number;
  datum: string;
  skupinaIds: number[];
}

export default function RecordsScreen() {
  const { showAlert } = useAlert();
  const { records, deleteGroup, clearAll, loading } = useRecords();
  const [activeTab, setActiveTab] = useState<TabType>('workers');
  const [exportingW, setExportingW] = useState(false);
  const [exportingV, setExportingV] = useState(false);

  // ─── Aggregate: one row per (obcina|operacija|osebaValue) ────────────────
  const personRows = useMemo((): PersonRow[] => {
    const map = new Map<string, PersonRow>();
    records.forEach(r => {
      const key = [r.obcina, r.operacija, r.osebaValue].join('|');
      if (!map.has(key)) {
        map.set(key, {
          key,
          obcina: r.obcina,
          operacija: r.operacija,
          oseba: r.oseba,
          osebaValue: r.osebaValue,
          tipOsebe: r.tipOsebe,
          ure: 0,
          datum: r.datum,
          skupinaIds: [],
        });
      }
      const entry = map.get(key)!;
      entry.ure += r.ure;
      if (!entry.skupinaIds.includes(r.skupinaId)) entry.skupinaIds.push(r.skupinaId);
    });
    return Array.from(map.values()).sort((a, b) => a.oseba.localeCompare(b.oseba));
  }, [records]);

  // ─── Aggregate: one row per (obcina|operacija|voziloValue) ───────────────
  const vehicleRows = useMemo((): VehicleRow[] => {
    const map = new Map<string, VehicleRow>();
    records
      .filter(r => r.tipOsebe === 'voznik')
      .forEach(r => {
        const key = [r.obcina, r.operacija, r.voziloValue].join('|');
        if (!map.has(key)) {
          map.set(key, {
            key,
            obcina: r.obcina,
            operacija: r.operacija,
            vozilo: r.vozilo,
            voziloValue: r.voziloValue,
            ure: 0,
            datum: r.datum,
            skupinaIds: [],
          });
        }
        const entry = map.get(key)!;
        entry.ure += r.ure;
        if (!entry.skupinaIds.includes(r.skupinaId)) entry.skupinaIds.push(r.skupinaId);
      });
    return Array.from(map.values());
  }, [records]);

  const handleDeleteGroup = useCallback((skupinaIds: number[]) => {
    showAlert('Izbriši zapis?', 'Izbrisani bodo vsi vnosi te delovne naloge.', [
      { text: 'Prekliči', style: 'cancel' },
      {
        text: 'Izbriši', style: 'destructive',
        onPress: async () => {
          for (const id of skupinaIds) await deleteGroup(id);
        },
      },
    ]);
  }, [deleteGroup, showAlert]);

  const handleClearAll = useCallback(() => {
    showAlert('Izbriši vse zapise?', 'Vsi podatki bodo trajno izbrisani!', [
      { text: 'Prekliči', style: 'cancel' },
      { text: 'Izbriši vse', style: 'destructive', onPress: clearAll },
    ]);
  }, [clearAll, showAlert]);

  const handleExportWorkers = useCallback(async () => {
    if (records.length === 0) { showAlert('Ni podatkov', 'Ni zapisov za izvoz.'); return; }
    setExportingW(true);
    try { await exportWorkersXlsx(records); }
    catch { showAlert('Napaka', 'Izvoz ni uspel.'); }
    finally { setExportingW(false); }
  }, [records, showAlert]);

  const handleExportVehicles = useCallback(async () => {
    if (records.length === 0) { showAlert('Ni podatkov', 'Ni zapisov za izvoz.'); return; }
    setExportingV(true);
    try { await exportVehiclesXlsx(records); }
    catch { showAlert('Napaka', 'Izvoz ni uspel.'); }
    finally { setExportingV(false); }
  }, [records, showAlert]);

  const totalUre = useMemo(() =>
    records.filter(r => r.tipOsebe === 'voznik').reduce((s, r) => s + r.ure, 0),
    [records]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.loader}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Zapisi</Text>
          <Text style={styles.headerSub}>{records.length} vnosov · {totalUre.toFixed(1)} ur skupaj</Text>
        </View>
        <Pressable
          onPress={handleClearAll}
          style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.7 }]}
        >
          <MaterialIcons name="delete-sweep" size={20} color={Colors.danger} />
        </Pressable>
      </View>

      {/* Export buttons */}
      <View style={styles.exportRow}>
        <Pressable
          onPress={handleExportWorkers}
          disabled={exportingW}
          style={({ pressed }) => [styles.exportBtn, pressed && { opacity: 0.7 }]}
        >
          {exportingW
            ? <ActivityIndicator size="small" color={Colors.textInverse} />
            : <MaterialIcons name="people" size={16} color={Colors.textInverse} />}
          <Text style={styles.exportBtnLabel}>Delavci .xlsx</Text>
        </Pressable>
        <Pressable
          onPress={handleExportVehicles}
          disabled={exportingV}
          style={({ pressed }) => [styles.exportBtnAlt, pressed && { opacity: 0.7 }]}
        >
          {exportingV
            ? <ActivityIndicator size="small" color={Colors.textInverse} />
            : <MaterialIcons name="directions-car" size={16} color={Colors.textInverse} />}
          <Text style={styles.exportBtnLabel}>Vozila .xlsx</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['workers', 'vehicles'] as TabType[]).map(t => (
          <Pressable
            key={t}
            onPress={() => setActiveTab(t)}
            style={[styles.tab, activeTab === t && styles.tabActive]}
          >
            <MaterialIcons
              name={t === 'workers' ? 'people' : 'directions-car'}
              size={16}
              color={activeTab === t ? Colors.primary : Colors.textMuted}
            />
            <Text style={[styles.tabLabel, activeTab === t && styles.tabLabelActive]}>
              {t === 'workers' ? `Delavci (${personRows.length})` : `Vozila (${vehicleRows.length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Lists */}
      {activeTab === 'workers' ? (
        personRows.length === 0
          ? <EmptyState />
          : <FlatList
              data={personRows}
              keyExtractor={item => item.key}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <PersonCard row={item} onDelete={() => handleDeleteGroup(item.skupinaIds)} />
              )}
            />
      ) : (
        vehicleRows.length === 0
          ? <EmptyState />
          : <FlatList
              data={vehicleRows}
              keyExtractor={item => item.key}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <VehicleCard row={item} onDelete={() => handleDeleteGroup(item.skupinaIds)} />
              )}
            />
      )}
    </SafeAreaView>
  );
}

// ─── Cards ─────────────────────────────────────────────────────────────────────

function PersonCard({ row, onDelete }: { row: PersonRow; onDelete: () => void }) {
  const isVoznik = row.tipOsebe === 'voznik';
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.badge, isVoznik ? styles.badgeVoznik : styles.badgeSodel]}>
          <Text style={styles.badgeText}>{isVoznik ? 'Voznik' : 'Sodelavec'}</Text>
        </View>
        <View style={styles.badgeObcina}>
          <Text style={styles.badgeObcinaText}>{row.obcina}</Text>
        </View>
        <Text style={styles.cardDate}>{row.datum}</Text>
        <Pressable onPress={onDelete} hitSlop={8} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}>
          <MaterialIcons name="delete-outline" size={20} color={Colors.danger} />
        </Pressable>
      </View>

      <Text style={styles.cardName}>{row.oseba}</Text>
      <Text style={styles.cardCode}>Šifra: {row.osebaValue}</Text>
      <Text style={styles.cardOp} numberOfLines={2}>{row.operacija}</Text>

      <View style={styles.hoursRow}>
        <MaterialIcons name="schedule" size={16} color={Colors.accent} />
        <Text style={styles.hoursLabel}>Skupaj ur:</Text>
        <Text style={styles.hoursValue}>{row.ure.toFixed(1)}</Text>
      </View>
    </View>
  );
}

function VehicleCard({ row, onDelete }: { row: VehicleRow; onDelete: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.badgeObcina}>
          <Text style={styles.badgeObcinaText}>{row.obcina}</Text>
        </View>
        <Text style={styles.cardDate}>{row.datum}</Text>
        <Pressable onPress={onDelete} hitSlop={8} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}>
          <MaterialIcons name="delete-outline" size={20} color={Colors.danger} />
        </Pressable>
      </View>

      <Text style={styles.cardName}>{row.vozilo}</Text>
      <Text style={styles.cardCode}>Šifra: {row.voziloValue}</Text>
      <Text style={styles.cardOp} numberOfLines={2}>{row.operacija}</Text>

      <View style={styles.hoursRow}>
        <MaterialIcons name="schedule" size={16} color={Colors.accent} />
        <Text style={styles.hoursLabel}>Skupaj ur:</Text>
        <Text style={styles.hoursValue}>{row.ure.toFixed(1)}</Text>
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <MaterialIcons name="inbox" size={64} color={Colors.borderLight} />
      <Text style={styles.emptyTitle}>Ni zapisov</Text>
      <Text style={styles.emptySub}>Dodaj prvi zapis v zavihku Vnos</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  headerSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  clearBtn: {
    width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.dangerLight,
    justifyContent: 'center', alignItems: 'center',
  },
  exportRow: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  exportBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: Colors.primary, paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
  },
  exportBtnAlt: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: Colors.accent, paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
  },
  exportBtnLabel: { fontSize: FontSize.sm, color: Colors.textInverse, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: Spacing.md,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textMuted },
  tabLabelActive: { color: Colors.primary },
  listContent: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, ...Shadow.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  badge: {
    paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full,
  },
  badgeVoznik: { backgroundColor: Colors.primaryLight },
  badgeSodel: { backgroundColor: Colors.accentLight },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  badgeObcina: {
    backgroundColor: Colors.surfaceAlt, paddingHorizontal: Spacing.sm,
    paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderLight,
  },
  badgeObcinaText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  cardDate: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted },
  cardName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  cardCode: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.xs },
  cardOp: {
    fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },
  hoursRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.xs,
    backgroundColor: Colors.accentLight, padding: Spacing.sm, borderRadius: Radius.md,
  },
  hoursLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  hoursValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.accent },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textSecondary },
  emptySub: { fontSize: FontSize.sm, color: Colors.textMuted },
});
