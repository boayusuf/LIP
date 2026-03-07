import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { useGroupStore } from '../../../lib/groupStore';
import { Priority, RepeatCycle, TimeBlock } from '../../../types';

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgent', color: Colors.priorityUrgent },
  { value: 'important', label: 'Important', color: Colors.priorityImportant },
  { value: 'low', label: 'Low', color: Colors.priorityLow },
];

const TIME_BLOCKS: { value: TimeBlock; label: string; emoji: string; hours: string }[] = [
  { value: 'morning', label: 'Morning', emoji: '🌅', hours: '6 AM – 12 PM' },
  { value: 'afternoon', label: 'Afternoon', emoji: '☀️', hours: '12 – 6 PM' },
  { value: 'evening', label: 'Evening', emoji: '🌙', hours: '6 PM – 12 AM' },
];

const DURATION_PRESETS = [10, 15, 30, 45, 60, 90, 120];

const REPEAT_OPTIONS: { value: RepeatCycle; label: string }[] = [
  { value: null, label: 'No repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

const PICKER_HOURS = Array.from({ length: 9 }, (_, i) => i);
const PICKER_MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

export default function ProposeTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { createProposal } = useGroupStore();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>('low');
  const [timeBlock, setTimeBlock] = useState<TimeBlock>('morning');
  const [duration, setDuration] = useState(15);
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [pickerHours, setPickerHours] = useState(0);
  const [pickerMinutes, setPickerMinutes] = useState(15);
  const [repeatCycle, setRepeatCycle] = useState<RepeatCycle>(null);
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [requireCheckin, setRequireCheckin] = useState(false);
  const [checkinTime, setCheckinTime] = useState('');
  const [checkinBuffer, setCheckinBuffer] = useState(15);
  const [saving, setSaving] = useState(false);

  const handlePickerChange = (hours: number, minutes: number) => {
    setPickerHours(hours);
    setPickerMinutes(minutes);
    const total = hours * 60 + minutes;
    if (total > 0) setDuration(total);
  };

  const handleSelectPreset = (d: number) => {
    setDuration(d);
    setShowCustomDuration(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }
    if (!id) return;
    setSaving(true);
    const { error } = await createProposal(id, {
      title: title.trim(),
      notes: notes.trim(),
      priority,
      time_block: timeBlock,
      estimated_duration_min: duration,
      repeat_cycle: repeatCycle,
      repeat_interval_days: null,
      require_photo: requirePhoto,
      require_checkin: requireCheckin,
      checkin_time: requireCheckin && checkinTime.match(/^\d{2}:\d{2}$/) ? checkinTime : null,
      checkin_buffer_min: requireCheckin ? checkinBuffer : null,
    });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    router.back();
  };

  const previewXP = Math.floor(
    duration * 2 * (priority === 'urgent' ? 1.5 : priority === 'important' ? 1.2 : 1.0)
  );

  const formatPickerDuration = () => {
    if (pickerHours === 0 && pickerMinutes === 0) return 'Select duration';
    const parts = [];
    if (pickerHours > 0) parts.push(`${pickerHours}h`);
    if (pickerMinutes > 0) parts.push(`${pickerMinutes}m`);
    return parts.join(' ');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color={Colors.textSecondary} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Propose Task</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
            <Text style={[styles.saveBtnText, saving && { opacity: 0.5 }]}>
              {saving ? 'Sending...' : 'Propose'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text style={styles.label}>Task Title</Text>
          <TextInput
            style={styles.input}
            placeholder="What should the group do?"
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />

          {/* Notes */}
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Extra details or rules"
            placeholderTextColor={Colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Priority */}
          <Text style={styles.label}>Priority</Text>
          <View style={styles.optionRow}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.optionBtn,
                  priority === p.value && {
                    borderColor: p.color,
                    backgroundColor: p.color + '15',
                  },
                ]}
                onPress={() => setPriority(p.value)}
              >
                <Text style={[styles.optionText, priority === p.value && { color: p.color }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Time Block */}
          <Text style={styles.label}>Time Block</Text>
          <View style={styles.optionRow}>
            {TIME_BLOCKS.map((tb) => (
              <TouchableOpacity
                key={tb.value}
                style={[
                  styles.timeBlockBtn,
                  timeBlock === tb.value && styles.timeBlockBtnActive,
                ]}
                onPress={() => setTimeBlock(tb.value)}
              >
                <Text style={styles.timeBlockEmoji}>{tb.emoji}</Text>
                <Text style={[styles.timeBlockLabel, timeBlock === tb.value && styles.timeBlockLabelActive]}>
                  {tb.label}
                </Text>
                <Text style={[styles.timeBlockHours, timeBlock === tb.value && styles.timeBlockHoursActive]}>
                  {tb.hours}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Duration */}
          <Text style={styles.label}>Estimated Duration</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.durationScroll}>
            <View style={styles.durationRow}>
              {DURATION_PRESETS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, duration === d && !showCustomDuration && styles.chipActive]}
                  onPress={() => handleSelectPreset(d)}
                >
                  <Text style={[styles.chipText, duration === d && !showCustomDuration && styles.chipTextActive]}>
                    {d >= 60 ? `${d / 60}h` : `${d}m`}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.chip, showCustomDuration && styles.chipActive]}
                onPress={() => setShowCustomDuration(true)}
              >
                <Text style={[styles.chipText, showCustomDuration && styles.chipTextActive]}>Custom</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {showCustomDuration && (
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>{formatPickerDuration()}</Text>
              <View style={styles.pickerRow}>
                <View style={styles.pickerCol}>
                  <Text style={styles.pickerColLabel}>Hours</Text>
                  <View style={styles.pickerWrap}>
                    <Picker
                      selectedValue={pickerHours}
                      onValueChange={(v) => handlePickerChange(v, pickerMinutes)}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      {PICKER_HOURS.map((h) => (
                        <Picker.Item key={h} label={`${h}`} value={h} color={Colors.textPrimary} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <Text style={styles.pickerSep}>:</Text>
                <View style={styles.pickerCol}>
                  <Text style={styles.pickerColLabel}>Minutes</Text>
                  <View style={styles.pickerWrap}>
                    <Picker
                      selectedValue={pickerMinutes}
                      onValueChange={(v) => handlePickerChange(pickerHours, v)}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      {PICKER_MINUTES.map((m) => (
                        <Picker.Item key={m} label={`${m.toString().padStart(2, '0')}`} value={m} color={Colors.textPrimary} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Repeat */}
          <Text style={styles.label}>Repeat</Text>
          <View style={styles.repeatGrid}>
            {REPEAT_OPTIONS.map((r) => (
              <TouchableOpacity
                key={r.label}
                style={[styles.chip, repeatCycle === r.value && styles.chipActive]}
                onPress={() => setRepeatCycle(r.value)}
              >
                <Text style={[styles.chipText, repeatCycle === r.value && styles.chipTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Group-specific options */}
          <Text style={styles.label}>Requirements</Text>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>📸 Require Photo Proof</Text>
              <Text style={styles.switchDesc}>Members must upload a photo to complete</Text>
            </View>
            <Switch
              value={requirePhoto}
              onValueChange={setRequirePhoto}
              trackColor={{ false: Colors.border, true: Colors.accent + '60' }}
              thumbColor={requirePhoto ? Colors.accent : Colors.textMuted}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>✅ Require Check-in</Text>
              <Text style={styles.switchDesc}>Members must check in within a time window</Text>
            </View>
            <Switch
              value={requireCheckin}
              onValueChange={setRequireCheckin}
              trackColor={{ false: Colors.border, true: Colors.accent + '60' }}
              thumbColor={requireCheckin ? Colors.accent : Colors.textMuted}
            />
          </View>

          {requireCheckin && (
            <View style={styles.checkinConfig}>
              <Text style={styles.checkinConfigLabel}>Check-in Time (HH:MM)</Text>
              <TextInput
                style={styles.checkinTimeInput}
                placeholder="07:00"
                placeholderTextColor={Colors.textMuted}
                value={checkinTime}
                onChangeText={(v) => {
                  // Auto-insert colon
                  const digits = v.replace(/\D/g, '');
                  if (digits.length <= 2) setCheckinTime(digits);
                  else setCheckinTime(`${digits.slice(0, 2)}:${digits.slice(2, 4)}`);
                }}
                keyboardType="numeric"
                maxLength={5}
              />
              <Text style={styles.checkinConfigLabel}>Grace Period</Text>
              <View style={styles.bufferRow}>
                {[5, 10, 15, 30].map((min) => (
                  <TouchableOpacity
                    key={min}
                    style={[styles.chip, checkinBuffer === min && styles.chipActive]}
                    onPress={() => setCheckinBuffer(min)}
                  >
                    <Text style={[styles.chipText, checkinBuffer === min && styles.chipTextActive]}>
                      {min}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {checkinTime.match(/^\d{2}:\d{2}$/) && (
                <Text style={styles.checkinPreview}>
                  Window: {checkinTime} – {(() => {
                    const [h, m] = checkinTime.split(':').map(Number);
                    const total = h * 60 + m + checkinBuffer;
                    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
                  })()}
                </Text>
              )}
            </View>
          )}

          {/* XP Preview */}
          <View style={styles.xpPreview}>
            <Text style={styles.xpPreviewLabel}>XP per member on completion:</Text>
            <Text style={styles.xpPreviewValue}>+{previewXP} XP</Text>
          </View>

          <View style={styles.voteNote}>
            <Text style={styles.voteNoteText}>
              This task needs majority approval from the group before it becomes active.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  saveBtn: { paddingVertical: 6, paddingHorizontal: 14, backgroundColor: Colors.accent, borderRadius: 8 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, marginTop: 20 },
  input: {
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary,
  },
  notesInput: { minHeight: 80, paddingTop: 14 },
  optionRow: { flexDirection: 'row', gap: 10 },
  optionBtn: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  optionText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  timeBlockBtn: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: 2,
  },
  timeBlockBtnActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '15' },
  timeBlockEmoji: { fontSize: 16 },
  timeBlockLabel: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  timeBlockLabelActive: { color: Colors.accent },
  timeBlockHours: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  timeBlockHoursActive: { color: Colors.accent },
  durationScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  durationRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  chipActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '15' },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  chipTextActive: { color: Colors.accent },
  pickerContainer: {
    backgroundColor: Colors.primary, borderRadius: 12, padding: 16, marginTop: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  pickerLabel: { fontSize: 16, fontWeight: '700', color: Colors.accent, textAlign: 'center', marginBottom: 8 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  pickerCol: { alignItems: 'center', flex: 1 },
  pickerColLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  pickerWrap: { height: 150, width: '100%', overflow: 'hidden' },
  picker: { height: 150, width: '100%', color: Colors.textPrimary },
  pickerItem: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary, height: 150 },
  pickerSep: { fontSize: 28, fontWeight: '700', color: Colors.textSecondary, marginTop: 20, paddingHorizontal: 4 },
  repeatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.primary, borderRadius: 10, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  switchInfo: { flex: 1, marginRight: 12 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  switchDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  xpPreview: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 28, paddingVertical: 14, backgroundColor: Colors.primary,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.gold + '30',
  },
  xpPreviewLabel: { fontSize: 14, color: Colors.textSecondary },
  xpPreviewValue: { fontSize: 18, fontWeight: '700', color: Colors.gold },
  voteNote: {
    marginTop: 12, padding: 12, backgroundColor: Colors.accent + '10',
    borderRadius: 8, borderWidth: 1, borderColor: Colors.accent + '20',
  },
  voteNoteText: { fontSize: 13, color: Colors.accent, textAlign: 'center' },
  checkinConfig: {
    backgroundColor: Colors.primary, borderRadius: 10, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  checkinConfigLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  checkinTimeInput: {
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 20,
    color: Colors.textPrimary, fontWeight: '700', letterSpacing: 2, width: 100,
  },
  bufferRow: { flexDirection: 'row', gap: 8 },
  checkinPreview: { fontSize: 12, color: Colors.accent, fontWeight: '600' },
});