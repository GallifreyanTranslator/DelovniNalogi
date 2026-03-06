import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, Shadow } from '@/constants/theme';
import { OptionButton, StepHeader } from '@/components';
import { LOCATIONS, OPERATIONS, HOURS, OptionItem } from '@/constants/data';
import { useRecords } from '@/hooks/useRecords';
import { useAlert } from '@/template';

// Steps: 1=Location 2=Operation 3=Vehicle 4=Worker 5=Coworker1 6=Coworker2 7=Hours 8=Summary
const TOTAL_STEPS = 8;

interface Selection {
  location: OptionItem | null;
  operation: OptionItem | null;
  vehicle: OptionItem | null;
  worker: OptionItem | null;
  coworker1: OptionItem | null;
  coworker2: OptionItem | null;
  hours: OptionItem | null;
}

const EMPTY_SEL: Selection = {
  location: null, operation: null, vehicle: null,
  worker: null, coworker1: null, coworker2: null, hours: null,
};

export default function EntryScreen() {
  const { showAlert } = useAlert();
  const { vehicles, workers, addJob, addCustomVehicle, addCustomWorker } = useRecords();
  const [step, setStep] = useState(1);
  const [sel, setSel] = useState<Selection>(EMPTY_SEL);
  const [saving, setSaving] = useState(false);

  const [showAddModal, setShowAddModal] = useState<'vehicle' | 'worker' | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [customValue, setCustomValue] = useState('');

  const goBack = useCallback(() => setStep(s => Math.max(1, s - 1)), []);
  const goNext = useCallback(() => setStep(s => s + 1), []);
  const reset = useCallback(() => { setSel(EMPTY_SEL); setStep(1); }, []);

  const handleSave = useCallback(async () => {
    if (!sel.location || !sel.operation || !sel.vehicle || !sel.worker || !sel.hours) {
      showAlert('Manjkajoči podatki', 'Prosim izpolni vse obvezne korake.');
      return;
    }
    setSaving(true);
    try {
      await addJob({
        obcina: sel.location.value,
        operacija: sel.operation.value,
        vozilo: sel.vehicle.label,
        voziloValue: sel.vehicle.value,
        voznik: sel.worker,
        coworker1: sel.coworker1,
        coworker2: sel.coworker2,
        ure: parseFloat(sel.hours.value),
      });
      showAlert('Shranjeno', 'Zapis je bil uspešno dodan.', [
        { text: 'Nov vnos', style: 'default', onPress: reset },
      ]);
    } catch {
      showAlert('Napaka', 'Shranjevanje ni uspelo.');
    } finally {
      setSaving(false);
    }
  }, [sel, addJob, reset, showAlert]);

  const handleAddCustom = useCallback(async () => {
    const label = customLabel.trim();
    const value = customValue.trim();
    if (!label || !value) {
      showAlert('Napaka', 'Prosim vnesi ime in šifro.');
      return;
    }
    const item: OptionItem = { label, value };
    if (showAddModal === 'vehicle') await addCustomVehicle(item);
    else await addCustomWorker(item);
    setCustomLabel('');
    setCustomValue('');
    setShowAddModal(null);
  }, [customLabel, customValue, showAddModal, addCustomVehicle, addCustomWorker, showAlert]);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <StepContent step={1} totalSteps={TOTAL_STEPS} title="Izberi lokacijo" subtitle="Katera občina?" onBack={undefined}>
            <OptionsGrid items={LOCATIONS} selected={sel.location}
              onSelect={item => { setSel(s => ({ ...s, location: item })); goNext(); }} />
          </StepContent>
        );

      case 2:
        return (
          <StepContent step={2} totalSteps={TOTAL_STEPS} title="Izberi operacijo" subtitle="Vrsta dela" onBack={goBack}>
            <OptionsGrid items={OPERATIONS} selected={sel.operation} columns={1}
              onSelect={item => { setSel(s => ({ ...s, operation: item })); goNext(); }} />
          </StepContent>
        );

      case 3:
        return (
          <StepContent step={3} totalSteps={TOTAL_STEPS} title="Izberi vozilo" onBack={goBack}
            actionLabel="+ Dodaj vozilo" onAction={() => setShowAddModal('vehicle')}>
            <OptionsGrid items={vehicles} selected={sel.vehicle}
              onSelect={item => { setSel(s => ({ ...s, vehicle: item })); goNext(); }} />
          </StepContent>
        );

      case 4:
        return (
          <StepContent step={4} totalSteps={TOTAL_STEPS} title="Izberi voznika" onBack={goBack}
            actionLabel="+ Dodaj delavca" onAction={() => setShowAddModal('worker')}>
            <OptionsGrid items={workers} selected={sel.worker}
              onSelect={item => { setSel(s => ({ ...s, worker: item })); goNext(); }} />
          </StepContent>
        );

      case 5:
        return (
          <StepContent step={5} totalSteps={TOTAL_STEPS} title="Sodelavec 1"
            subtitle="Ni obvezno – preskoči ali izberi" onBack={goBack}
            actionLabel="+ Dodaj delavca" onAction={() => setShowAddModal('worker')}>
            <OptionsGrid
              items={workers}
              selected={sel.coworker1}
              onSelect={item => {
                const next = sel.coworker1?.value === item.value ? null : item;
                setSel(s => ({ ...s, coworker1: next, coworker2: null }));
              }}
            />
            <SkipNextRow
              onSkip={() => { setSel(s => ({ ...s, coworker1: null, coworker2: null })); goNext(); }}
              onNext={sel.coworker1 ? goNext : undefined}
            />
          </StepContent>
        );

      case 6:
        return (
          <StepContent step={6} totalSteps={TOTAL_STEPS} title="Sodelavec 2"
            subtitle="Ni obvezno – preskoči ali izberi" onBack={goBack}
            actionLabel="+ Dodaj delavca" onAction={() => setShowAddModal('worker')}>
            <OptionsGrid
              items={workers.filter(w => w.value !== sel.coworker1?.value)}
              selected={sel.coworker2}
              onSelect={item => {
                const next = sel.coworker2?.value === item.value ? null : item;
                setSel(s => ({ ...s, coworker2: next }));
              }}
            />
            <SkipNextRow
              onSkip={() => { setSel(s => ({ ...s, coworker2: null })); goNext(); }}
              onNext={goNext}
            />
          </StepContent>
        );

      case 7:
        return (
          <StepContent step={7} totalSteps={TOTAL_STEPS} title="Število ur" onBack={goBack}>
            <OptionsGrid items={HOURS} selected={sel.hours} columns={4}
              onSelect={item => { setSel(s => ({ ...s, hours: item })); goNext(); }} />
          </StepContent>
        );

      case 8:
        return (
          <StepContent step={8} totalSteps={TOTAL_STEPS} title="Pregled in potrditev" onBack={goBack}>
            <SummaryCard sel={sel} />
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}
            >
              <MaterialIcons name="check-circle" size={22} color="#fff" />
              <Text style={styles.saveBtnLabel}>{saving ? 'Shranjevanje...' : 'Shrani zapis'}</Text>
            </Pressable>
          </StepContent>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {renderStep()}
      </KeyboardAvoidingView>

      {showAddModal ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {showAddModal === 'vehicle' ? 'Dodaj vozilo' : 'Dodaj delavca'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Vidno ime (npr. KR AB-123)"
              placeholderTextColor={Colors.textMuted}
              value={customLabel}
              onChangeText={setCustomLabel}
            />
            <TextInput
              style={styles.input}
              placeholder="Šifra (npr. 115/001)"
              placeholderTextColor={Colors.textMuted}
              value={customValue}
              onChangeText={setCustomValue}
            />
            <View style={styles.modalRow}>
              <Pressable
                onPress={() => { setShowAddModal(null); setCustomLabel(''); setCustomValue(''); }}
                style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.modalCancelLabel}>Prekliči</Text>
              </Pressable>
              <Pressable
                onPress={handleAddCustom}
                style={({ pressed }) => [styles.modalConfirm, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.modalConfirmLabel}>Dodaj</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StepContent({
  step, totalSteps, title, subtitle, onBack, children, actionLabel, onAction,
}: {
  step: number; totalSteps: number; title: string; subtitle?: string;
  onBack?: () => void; children: React.ReactNode;
  actionLabel?: string; onAction?: () => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <StepHeader step={step} totalSteps={totalSteps} title={title} subtitle={subtitle} onBack={onBack} />
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.actionBtnLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

function OptionsGrid({
  items, selected, onSelect, columns = 2,
}: {
  items: OptionItem[]; selected: OptionItem | null;
  onSelect: (item: OptionItem) => void; columns?: number;
}) {
  return (
    <View style={[styles.grid, { gap: Spacing.sm }]}>
      {items.map(item => (
        <View
          key={item.value}
          style={{ width: columns === 1 ? '100%' : columns === 4 ? '23%' : '48%' }}
        >
          <OptionButton
            label={item.label + (columns !== 1 && item.value !== item.label ? '\n' + item.value : '')}
            selected={selected?.value === item.value}
            onPress={() => onSelect(item)}
          />
        </View>
      ))}
    </View>
  );
}

function SkipNextRow({ onSkip, onNext }: { onSkip: () => void; onNext?: () => void }) {
  return (
    <View style={styles.skipNextRow}>
      <Pressable onPress={onSkip} style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}>
        <Text style={styles.skipBtnLabel}>Preskoči</Text>
      </Pressable>
      {onNext ? (
        <Pressable onPress={onNext} style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.7 }]}>
          <Text style={styles.nextBtnLabel}>Naprej</Text>
          <MaterialIcons name="arrow-forward" size={18} color={Colors.textInverse} />
        </Pressable>
      ) : null}
    </View>
  );
}

function SummaryCard({ sel }: { sel: Selection }) {
  const rows = [
    { label: 'Lokacija', value: sel.location?.value },
    { label: 'Operacija', value: sel.operation?.value },
    { label: 'Vozilo', value: sel.vehicle ? `${sel.vehicle.label} (${sel.vehicle.value})` : null },
    { label: 'Voznik', value: sel.worker ? `${sel.worker.label} · ${sel.worker.value}` : null },
    { label: 'Sodelavec 1', value: sel.coworker1 ? `${sel.coworker1.label} · ${sel.coworker1.value}` : '—' },
    { label: 'Sodelavec 2', value: sel.coworker2 ? `${sel.coworker2.label} · ${sel.coworker2.value}` : '—' },
    { label: 'Ure (na osebo)', value: sel.hours?.value },
  ];
  return (
    <View style={styles.summaryCard}>
      {rows.map(row => (
        <View key={row.label} style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{row.label}</Text>
          <Text style={styles.summaryValue} numberOfLines={2}>{row.value || '—'}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionBtn: {
    marginHorizontal: Spacing.md, marginTop: Spacing.sm,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.primary,
    borderStyle: 'dashed', alignItems: 'center', backgroundColor: Colors.primaryLight,
  },
  actionBtnLabel: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
  skipNextRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  skipBtn: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  skipBtnLabel: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' },
  nextBtn: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md,
    backgroundColor: Colors.primary, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  nextBtnLabel: { fontSize: FontSize.md, color: Colors.textInverse, fontWeight: '700' },
  summaryCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.lg, ...Shadow.md,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  summaryLabel: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600', flex: 1 },
  summaryValue: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '700', flex: 2, textAlign: 'right' },
  saveBtn: {
    backgroundColor: Colors.success, borderRadius: Radius.lg, paddingVertical: Spacing.md + 2,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, ...Shadow.md,
  },
  saveBtnLabel: { fontSize: FontSize.lg, color: Colors.textInverse, fontWeight: '700' },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: Colors.overlay,
    justifyContent: 'center', alignItems: 'center', zIndex: 99,
  },
  modalBox: {
    width: '85%', backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.lg, ...Shadow.lg,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.md, color: Colors.text, marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
  },
  modalRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  modalCancel: {
    flex: 1, paddingVertical: Spacing.sm + 2, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  modalCancelLabel: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' },
  modalConfirm: {
    flex: 1, paddingVertical: Spacing.sm + 2, borderRadius: Radius.md,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  modalConfirmLabel: { fontSize: FontSize.md, color: Colors.textInverse, fontWeight: '700' },
});
