import { Picker } from '@react-native-picker/picker';
import {
  type LucideIcon,
  Moon,
  Sun,
  Sunrise,
  X,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { showAlert } from '../lib/alert';
import { Colors } from '../constants/Colors';
import { Fonts, Spacing, withAlpha } from '../constants/theme';
import { useStore } from '../lib/store';
import { Priority, RepeatCycle, Task, TimeBlock } from '../types';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  editTask?: Task | null;
}

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

const PICKER_HOURS = Array.from({ length: 9 }, (_, i) => i); // 0-8
const PICKER_MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,10...55

export default function AddTaskModal({ visible, onClose, editTask }: AddTaskModalProps) {
  const { addTask, updateTask } = useStore();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>('low');
  const [timeBlock, setTimeBlock] = useState<TimeBlock>('morning');
  const [duration, setDuration] = useState(15);
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [pickerHours, setPickerHours] = useState(0);
  const [pickerMinutes, setPickerMinutes] = useState(15);
  const [repeatCycle, setRepeatCycle] = useState<RepeatCycle>(null);
  const [customRepeatDays, setCustomRepeatDays] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setNotes(editTask.notes || '');
      setPriority(editTask.priority);
      setTimeBlock(editTask.time_block);
      setDuration(editTask.estimated_duration_min);
      setRepeatCycle(editTask.repeat_cycle);
      if (editTask.repeat_interval_days) {
        setCustomRepeatDays(String(editTask.repeat_interval_days));
      }
      if (!DURATION_PRESETS.includes(editTask.estimated_duration_min)) {
        setShowCustomDuration(true);
        const h = Math.floor(editTask.estimated_duration_min / 60);
        const m = editTask.estimated_duration_min % 60;
        setPickerHours(h);
        setPickerMinutes(m - (m % 5)); // snap to nearest 5
      }
    } else {
      resetForm();
    }
  }, [editTask, visible]);

  const resetForm = () => {
    setTitle('');
    setNotes('');
    setPriority('low');
    setTimeBlock('morning');
    setDuration(15);
    setShowCustomDuration(false);
    setPickerHours(0);
    setPickerMinutes(15);
    setRepeatCycle(null);
    setCustomRepeatDays('');
  };

  const handlePickerChange = (hours: number, minutes: number) => {
    setPickerHours(hours);
    setPickerMinutes(minutes);
    const total = hours * 60 + minutes;
    if (total > 0) {
      setDuration(total);
    }
  };

  const handleSelectPresetDuration = (d: number) => {
    setDuration(d);
    setShowCustomDuration(false);
    setPickerHours(Math.floor(d / 60));
    setPickerMinutes(d % 60);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showAlert('Error', 'Please enter a task title');
      return;
    }
    if (showCustomDuration && duration === 0) {
      showAlert('Error', 'Please set a duration greater than 0');
      return;
    }
    if (repeatCycle === 'custom' && (!customRepeatDays || parseInt(customRepeatDays) < 1)) {
      showAlert('Error', 'Please enter a valid number of days for custom repeat');
      return;
    }
    setSaving(true);
    const repeatIntervalDays = repeatCycle === 'custom' ? parseInt(customRepeatDays) : null;

    if (editTask) {
      await updateTask(editTask.id, {
        title: title.trim(),
        notes: notes.trim() || null,
        priority,
        time_block: timeBlock,
        estimated_duration_min: duration,
        is_repeating: repeatCycle !== null,
        repeat_cycle: repeatCycle,
        repeat_interval_days: repeatIntervalDays,
      });
    } else {
      const { error } = await addTask({
        title: title.trim(),
        notes: notes.trim(),
        priority,
        time_block: timeBlock,
        estimated_duration_min: duration,
        is_repeating: repeatCycle !== null,
        repeat_cycle: repeatCycle,
        repeat_interval_days: repeatIntervalDays,
      });
      if (error) {
        showAlert('Error', error);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    resetForm();
    onClose();
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X color={Colors.textSecondary} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editTask ? 'Edit Task' : 'New Task'}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={styles.saveButton}
          >
            <Text style={[styles.saveText, saving && { opacity: 0.5 }]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="What do you need to do?"
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
            autoFocus={!editTask}
          />

          {/* Notes */}
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Add extra details or context"
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
                  styles.optionButton,
                  priority === p.value && {
                    borderColor: p.color,
                    backgroundColor: withAlpha(p.color, 0.13),
                  },
                ]}
                onPress={() => setPriority(p.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    priority === p.value && { color: p.color },
                  ]}
                >
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
                  styles.timeBlockButton,
                  timeBlock === tb.value && styles.timeBlockButtonActive,
                ]}
                onPress={() => setTimeBlock(tb.value)}
              >
                <tb.Icon
                  color={timeBlock === tb.value ? Colors.accent : Colors.textMuted}
                  size={16}
                />
                <Text
                  style={[
                    styles.timeBlockLabel,
                    timeBlock === tb.value && styles.timeBlockLabelActive,
                  ]}
                >
                  {tb.label}
                </Text>
                <Text
                  style={[
                    styles.timeBlockHours,
                    timeBlock === tb.value && styles.timeBlockHoursActive,
                  ]}
                >
                  {tb.hours}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Duration */}
          <Text style={styles.label}>Estimated Duration</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.durationScroll}
          >
            <View style={styles.durationRow}>
              {DURATION_PRESETS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.durationChip,
                    duration === d && !showCustomDuration && styles.durationChipActive,
                  ]}
                  onPress={() => handleSelectPresetDuration(d)}
                >
                  <Text
                    style={[
                      styles.durationText,
                      duration === d && !showCustomDuration && styles.durationTextActive,
                    ]}
                  >
                    {d >= 60 ? `${d / 60}h` : `${d}m`}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.durationChip,
                  showCustomDuration && styles.durationChipActive,
                ]}
                onPress={() => setShowCustomDuration(true)}
              >
                <Text
                  style={[
                    styles.durationText,
                    showCustomDuration && styles.durationTextActive,
                  ]}
                >
                  Custom
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {showCustomDuration && (
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>{formatPickerDuration()}</Text>
              <View style={styles.pickerRow}>
                <View style={styles.pickerColumn}>
                  <Text style={styles.pickerColumnLabel}>Hours</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={pickerHours}
                      onValueChange={(val) => handlePickerChange(val, pickerMinutes)}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      {PICKER_HOURS.map((h) => (
                        <Picker.Item key={h} label={`${h}`} value={h} color={Colors.textPrimary} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <Text style={styles.pickerSeparator}>:</Text>
                <View style={styles.pickerColumn}>
                  <Text style={styles.pickerColumnLabel}>Minutes</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={pickerMinutes}
                      onValueChange={(val) => handlePickerChange(pickerHours, val)}
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
                style={[
                  styles.repeatChip,
                  repeatCycle === r.value && styles.repeatChipActive,
                ]}
                onPress={() => setRepeatCycle(r.value)}
              >
                <Text
                  style={[
                    styles.repeatChipText,
                    repeatCycle === r.value && styles.repeatChipTextActive,
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {repeatCycle === 'custom' && (
            <View style={styles.customRepeatRow}>
              <Text style={styles.customRepeatLabel}>Every</Text>
              <TextInput
                style={styles.customRepeatInput}
                placeholder="3"
                placeholderTextColor={Colors.textMuted}
                value={customRepeatDays}
                onChangeText={setCustomRepeatDays}
                keyboardType="number-pad"
                autoFocus
              />
              <Text style={styles.customRepeatLabel}>days</Text>
            </View>
          )}

          {/* XP Preview */}
          <View style={styles.xpPreview}>
            <Text style={styles.xpPreviewLabel}>XP on completion:</Text>
            <Text style={styles.xpPreviewValue}>+{previewXP} XP</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: Fonts.bold, fontSize: 17,
    color: Colors.textPrimary,
  },
  saveButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.accent,
    borderRadius: 8,
  },
  saveText: {
    fontFamily: Fonts.bold, fontSize: 14,
    color: Colors.onAccent,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxxl,
  },
  label: {
    fontFamily: Fonts.semibold, fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    fontFamily: Fonts.regular, fontSize: 16,
    color: Colors.textPrimary,
  },
  notesInput: {
    minHeight: 80,
    paddingTop: Spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  optionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  optionText: {
    fontFamily: Fonts.semibold, fontSize: 13,
    color: Colors.textMuted,
  },
  timeBlockButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  timeBlockButtonActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSubtle,
  },
  timeBlockLabel: {
    fontFamily: Fonts.semibold, fontSize: 13,
    color: Colors.textMuted,
  },
  timeBlockLabelActive: {
    color: Colors.accent,
  },
  timeBlockHours: {
    fontFamily: Fonts.regular, fontSize: 10,
    color: Colors.textMuted,
    marginTop: Spacing.xxs,
  },
  timeBlockHoursActive: {
    color: Colors.accent,
  },
  durationScroll: {
    marginHorizontal: -20,
    paddingHorizontal: Spacing.xl,
  },
  durationRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  durationChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  durationChipActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSubtle,
  },
  durationText: {
    fontFamily: Fonts.semibold, fontSize: 14,
    color: Colors.textMuted,
  },
  durationTextActive: {
    color: Colors.accent,
  },
  // Wheel picker
  pickerContainer: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerLabel: {
    fontFamily: Fonts.bold, fontSize: 16,
    color: Colors.accent,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerColumn: {
    alignItems: 'center',
    flex: 1,
  },
  pickerColumnLabel: {
    fontFamily: Fonts.regular, fontSize: 12,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  pickerWrapper: {
    height: 150,
    width: '100%',
    overflow: 'hidden',
  },
  picker: {
    height: 150,
    width: '100%',
    color: Colors.textPrimary,
  },
  pickerItem: {
    fontFamily: Fonts.semibold, fontSize: 22,
    color: Colors.textPrimary,
    height: 150,
  },
  pickerSeparator: {
    fontFamily: Fonts.bold, fontSize: 28,
    color: Colors.textSecondary,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  // Repeat
  repeatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  repeatChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  repeatChipActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSubtle,
  },
  repeatChipText: {
    fontFamily: Fonts.semibold, fontSize: 13,
    color: Colors.textMuted,
  },
  repeatChipTextActive: {
    color: Colors.accent,
  },
  customRepeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  customRepeatLabel: {
    fontFamily: Fonts.regular, fontSize: 14,
    color: Colors.textSecondary,
  },
  customRepeatInput: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontFamily: Fonts.regular, fontSize: 16,
    color: Colors.textPrimary,
    width: 60,
    textAlign: 'center',
  },
  xpPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xxxl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
  },
  xpPreviewLabel: {
    fontFamily: Fonts.regular, fontSize: 14,
    color: Colors.textSecondary,
  },
  xpPreviewValue: {
    fontFamily: Fonts.bold, fontSize: 18,
    color: Colors.gold,
  },
});