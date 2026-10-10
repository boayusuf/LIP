import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  CircleCheckBig,
  type LucideIcon,
  Moon,
  Sun,
  Sunrise,
} from 'lucide-react-native';
import { useState } from 'react';
import {
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
import { showAlert } from '../../../lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { Fonts, Spacing, withAlpha } from '../../../constants/theme';
import { useGroupStore } from '../../../lib/groupStore';
import { Priority, RepeatCycle, TimeBlock } from '../../../types';

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgent', color: Colors.priorityUrgent },
  { value: 'important', label: 'Important', color: Colors.priorityImportant },
  { value: 'low', label: 'Low', color: Colors.priorityLow },
];

const TIME_BLOCKS: { value: TimeBlock; label: string; Icon: LucideIcon; hours: string }[] = [
  { value: 'morning', label: 'Morning', Icon: Sunrise, hours: '6 AM – 12 PM' },
  { value: 'afternoon', label: 'Afternoon', Icon: Sun, hours: '12 – 6 PM' },
  { value: 'evening', label: 'Evening', Icon: Moon, hours: '6 PM – 12 AM' },
];

const DURATION_PRESETS = [10, 15, 30, 45, 60, 90, 120];

const REPEAT_OPTIONS: { value: RepeatCycle; label: string }[] = [
  { value: null, label: 'No repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

const PICKER_HOURS = Array.from({ length: 9 }, (_, i) => i);
const PICKER_MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const CHECKIN_HOURS = Array.from({ length: 24 }, (_, i) => i);
const CHECKIN_MINUTES = Array.from({ length: 60 }, (_, i) => i);
const BUFFER_MINUTES_CUSTOM = Array.from({ length: 59 }, (_, i) => i + 1);

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
  const [repeatIntervalDays, setRepeatIntervalDays] = useState<number | null>(null);
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [requireCheckin, setRequireCheckin] = useState(false);
  const [checkinHour, setCheckinHour] = useState(7);
  const [checkinMinute, setCheckinMinute] = useState(0);
  const [checkinBuffer, setCheckinBuffer] = useState(15);
  const [showCustomBuffer, setShowCustomBuffer] = useState(false);
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
      showAlert('Error', 'Please enter a task title');
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
      repeat_interval_days: repeatCycle === 'custom' ? (repeatIntervalDays ?? 7) : null,
      require_photo: requirePhoto,
      require_checkin: requireCheckin,
      checkin_time: requireCheckin ? `${String(checkinHour).padStart(2, '0')}:${String(checkinMinute).padStart(2, '0')}` : null,
      checkin_buffer_min: requireCheckin ? checkinBuffer : null,
    });
    setSaving(false);
    if (error) {
      showAlert('Error', error);
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
                    backgroundColor: withAlpha(p.color, 0.13),
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
                <tb.Icon
                  color={timeBlock === tb.value ? Colors.accent : Colors.textMuted}
                  size={16}
                />
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

          {repeatCycle === 'custom' && (
            <View style={styles.customRepeatContainer}>
              <Text style={styles.checkinConfigLabel}>Repeat every</Text>
              <View style={styles.customRepeatRow}>
                <TextInput
                  style={[styles.input, styles.customRepeatInput]}
                  value={repeatIntervalDays?.toString() ?? ''}
                  onChangeText={(v) => {
                    const n = parseInt(v, 10);
                    setRepeatIntervalDays(isNaN(n) ? null : n);
                  }}
                  keyboardType="number-pad"
                  placeholder="7"
                  placeholderTextColor={Colors.textMuted}
                />
                <Text style={styles.customRepeatLabel}>days</Text>
              </View>
            </View>
          )}

          {/* Group-specific options */}
          <Text style={styles.label}>Requirements</Text>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <View style={styles.switchLabelRow}>
                <Camera color={Colors.textSecondary} size={14} />
                <Text style={styles.switchLabel}>Require photo proof</Text>
              </View>
              <Text style={styles.switchDesc}>Members must upload a photo to complete</Text>
            </View>
            <Switch
              value={requirePhoto}
              onValueChange={setRequirePhoto}
              trackColor={{ false: Colors.border, true: Colors.accentTrack }}
              thumbColor={requirePhoto ? Colors.accent : Colors.textMuted}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <View style={styles.switchLabelRow}>
                <CircleCheckBig color={Colors.textSecondary} size={14} />
                <Text style={styles.switchLabel}>Require check-in</Text>
              </View>
              <Text style={styles.switchDesc}>Members must check in within a time window</Text>
            </View>
            <Switch
              value={requireCheckin}
              onValueChange={setRequireCheckin}
              trackColor={{ false: Colors.border, true: Colors.accentTrack }}
              thumbColor={requireCheckin ? Colors.accent : Colors.textMuted}
            />
          </View>

          {requireCheckin && (
            <View style={styles.checkinConfig}>
              <Text style={styles.checkinConfigLabel}>Check-in Time</Text>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>
                  {String(checkinHour).padStart(2, '0')}:{String(checkinMinute).padStart(2, '0')}
                </Text>
                <View style={styles.pickerRow}>
                  <View style={styles.pickerCol}>
                    <Text style={styles.pickerColLabel}>Hour</Text>
                    <View style={styles.pickerWrap}>
                      <Picker
                        selectedValue={checkinHour}
                        onValueChange={setCheckinHour}
                        style={styles.picker}
                        itemStyle={styles.pickerItem}
                      >
                        {CHECKIN_HOURS.map((h) => (
                          <Picker.Item key={h} label={String(h).padStart(2, '0')} value={h} color={Colors.textPrimary} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                  <Text style={styles.pickerSep}>:</Text>
                  <View style={styles.pickerCol}>
                    <Text style={styles.pickerColLabel}>Minute</Text>
                    <View style={styles.pickerWrap}>
                      <Picker
                        selectedValue={checkinMinute}
                        onValueChange={setCheckinMinute}
                        style={styles.picker}
                        itemStyle={styles.pickerItem}
                      >
                        {CHECKIN_MINUTES.map((m) => (
                          <Picker.Item key={m} label={String(m).padStart(2, '0')} value={m} color={Colors.textPrimary} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                </View>
              </View>
              <Text style={styles.checkinConfigLabel}>Grace Period</Text>
              <View style={styles.bufferRow}>
                {[5, 10, 15, 30].map((min) => (
                  <TouchableOpacity
                    key={min}
                    style={[styles.chip, !showCustomBuffer && checkinBuffer === min && styles.chipActive]}
                    onPress={() => { setCheckinBuffer(min); setShowCustomBuffer(false); }}
                  >
                    <Text style={[styles.chipText, !showCustomBuffer && checkinBuffer === min && styles.chipTextActive]}>
                      {min}m
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.chip, showCustomBuffer && styles.chipActive]}
                  onPress={() => setShowCustomBuffer(true)}
                >
                  <Text style={[styles.chipText, showCustomBuffer && styles.chipTextActive]}>Custom</Text>
                </TouchableOpacity>
              </View>
              {showCustomBuffer && (
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>{checkinBuffer} min</Text>
                  <View style={styles.pickerWrap}>
                    <Picker
                      selectedValue={checkinBuffer}
                      onValueChange={setCheckinBuffer}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      {BUFFER_MINUTES_CUSTOM.map((m) => (
                        <Picker.Item key={m} label={`${m} min`} value={m} color={Colors.textPrimary} />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}
              <Text style={styles.checkinPreview}>
                Window: {String(checkinHour).padStart(2, '0')}:{String(checkinMinute).padStart(2, '0')} – {(() => {
                  const total = checkinHour * 60 + checkinMinute + checkinBuffer;
                  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
                })()}
              </Text>
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
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 17, color: Colors.textPrimary },
  saveBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, backgroundColor: Colors.accent, borderRadius: 8 },
  saveBtnText: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.onAccent },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.xl, paddingBottom: Spacing.xxxxl },
  label: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.xl },
  input: {
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, fontFamily: Fonts.regular, fontSize: 16, color: Colors.textPrimary,
  },
  notesInput: { minHeight: 80, paddingTop: Spacing.lg },
  optionRow: { flexDirection: 'row', gap: Spacing.md },
  optionBtn: {
    flex: 1, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  optionText: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.textMuted },
  timeBlockBtn: {
    flex: 1, paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: Spacing.xxs,
  },
  timeBlockBtnActive: { borderColor: Colors.accent, backgroundColor: Colors.accentSubtle },
  timeBlockLabel: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.textMuted },
  timeBlockLabelActive: { color: Colors.accent },
  timeBlockHours: { fontFamily: Fonts.regular, fontSize: 10, color: Colors.textMuted, marginTop: Spacing.xxs },
  timeBlockHoursActive: { color: Colors.accent },
  durationScroll: { marginHorizontal: -20, paddingHorizontal: Spacing.xl },
  durationRow: { flexDirection: 'row', gap: Spacing.sm },
  chip: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  chipActive: { borderColor: Colors.accent, backgroundColor: Colors.accentSubtle },
  chipText: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.textMuted },
  chipTextActive: { color: Colors.accent },
  pickerContainer: {
    backgroundColor: Colors.primary, borderRadius: 12, padding: Spacing.lg, marginTop: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  pickerLabel: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.accent, textAlign: 'center', marginBottom: Spacing.sm },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  pickerCol: { alignItems: 'center', flex: 1 },
  pickerColLabel: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted, marginBottom: Spacing.xs },
  pickerWrap: { height: 150, width: '100%', overflow: 'hidden' },
  picker: { height: 150, width: '100%', color: Colors.textPrimary },
  pickerItem: { fontFamily: Fonts.semibold, fontSize: 22, color: Colors.textPrimary, height: 150 },
  pickerSep: { fontFamily: Fonts.bold, fontSize: 28, color: Colors.textSecondary, marginTop: Spacing.xl, paddingHorizontal: Spacing.xs },
  repeatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.primary, borderRadius: 10, padding: Spacing.lg, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  switchInfo: { flex: 1, marginRight: Spacing.md },
  switchLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  switchLabel: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.textPrimary },
  switchDesc: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted, marginTop: Spacing.xxs },
  xpPreview: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    marginTop: Spacing.xxxl, paddingVertical: Spacing.lg, backgroundColor: Colors.primary,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.goldBorder,
  },
  xpPreviewLabel: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textSecondary },
  xpPreviewValue: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.gold },
  voteNote: {
    marginTop: Spacing.md, padding: Spacing.md, backgroundColor: Colors.accentFaint,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.accentSubtle,
  },
  voteNoteText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.accent, textAlign: 'center' },
  checkinConfig: {
    backgroundColor: Colors.primary, borderRadius: 10, padding: Spacing.lg, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.md,
  },
  checkinConfigLabel: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.textSecondary },
  checkinTimeInput: {
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontFamily: Fonts.bold, fontSize: 20,
    color: Colors.textPrimary, letterSpacing: 2, width: 100,
  },
  bufferRow: { flexDirection: 'row', gap: Spacing.sm },
  checkinPreview: { fontFamily: Fonts.semibold, fontSize: 12, color: Colors.accent},
  customRepeatContainer: { marginTop: Spacing.md },
  customRepeatRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  customRepeatInput: { width: 80, textAlign: 'center', paddingVertical: Spacing.md },
  customRepeatLabel: { fontFamily: Fonts.semibold, fontSize: 15, color: Colors.textSecondary},
});