import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import {
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    FileText,
    Maximize2,
    Minimize2,
    Pencil,
    Play,
    Repeat,
    Square,
    Trash2,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { Fonts, Spacing } from '../constants/theme';
import { useStore } from '../lib/store';
import { Task } from '../types';
import SubtaskList from './SubtaskList';
import TimerDisplay from './TimerDisplay';

interface TaskCardProps {
  task: Task;
  onEdit: () => void;
}

const PRIORITY_CONFIG = {
  urgent: { color: Colors.priorityUrgent, label: 'URGENT' },
  important: { color: Colors.priorityImportant, label: 'IMPORTANT' },
  low: { color: Colors.priorityLow, label: 'LOW' },
};

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function TaskCard({ task, onEdit }: TaskCardProps) {
  const { startTimer, stopTimer, completeTask, deleteTask } = useStore();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(0);
  const xpAnim = useRef(new Animated.Value(0)).current;

  const isDone = task.status === 'done';
  const isRunning = task.status === 'doing';
  const priority = PRIORITY_CONFIG[task.priority];

  // Keep focus mode timer ticking
  useEffect(() => {
    if (!focusMode) return;
    const update = () => {
      const extra = task.timer_started_at
        ? Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000)
        : 0;
      setFocusSeconds(task.timer_elapsed_sec + extra);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [focusMode, task.timer_started_at, task.timer_elapsed_sec]);

  const xpOpacity = xpAnim.interpolate({
    inputRange: [0, 0.1, 0.7, 1],
    outputRange: [0, 1, 1, 0],
  });
  const xpTranslateY = xpAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -60],
  });

  const multiplier = task.priority === 'urgent' ? 1.5 : task.priority === 'important' ? 1.2 : 1.0;
  const xpAmount = Math.floor(task.estimated_duration_min * 2 * multiplier);

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    xpAnim.setValue(0);
    Animated.timing(xpAnim, { toValue: 1, duration: 1400, useNativeDriver: true }).start();
    completeTask(task.id);
  };

  const handleDelete = () => {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTask(task.id) },
    ]);
  };

  const handleTimerToggle = () => {
    if (isRunning) {
      stopTimer(task.id);
    } else {
      startTimer(task.id);
    }
  };

  const estimatedSec = task.estimated_duration_min * 60;
  const isOvertime = focusSeconds > estimatedSec;

  return (
    <View style={[styles.card, isDone && styles.cardDone]}>
      {/* Floating XP text */}
      <Animated.View
        pointerEvents="none"
        style={[styles.xpFloat, { opacity: xpOpacity, transform: [{ translateY: xpTranslateY }] }]}
      >
        <Text style={styles.xpFloatText}>+{xpAmount} XP</Text>
      </Animated.View>

      <View style={styles.mainRow}>
        <TouchableOpacity
          onPress={handleComplete}
          disabled={isDone}
          style={styles.completeButton}
        >
          <CheckCircle2
            color={isDone ? Colors.green : Colors.textMuted}
            size={24}
            fill={isDone ? Colors.green : 'transparent'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.taskInfo}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
        >
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, isDone && styles.titleDone]}
              numberOfLines={expanded ? undefined : 1}
            >
              {task.title}
            </Text>
            {task.is_repeating && (
              <Repeat color={Colors.accent} size={13} />
            )}
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.priorityBadge, { borderColor: priority.color }]}>
              <Text style={[styles.priorityText, { color: priority.color }]}>
                {priority.label}
              </Text>
            </View>
            <Text style={styles.duration}>{task.estimated_duration_min}min</Text>
            {isDone && task.xp_earned > 0 && (
              <Text style={styles.xpEarned}>+{task.xp_earned} XP</Text>
            )}
          </View>
        </TouchableOpacity>

        {!isDone && (
          <View style={styles.timerArea}>
            <TimerDisplay
              timerStartedAt={task.timer_started_at}
              timerElapsedSec={task.timer_elapsed_sec}
              estimatedMin={task.estimated_duration_min}
            />
            <View style={styles.timerButtons}>
              <TouchableOpacity
                onPress={handleTimerToggle}
                style={[styles.timerButton, isRunning && styles.timerButtonRunning]}
              >
                {isRunning ? (
                  <Square color={Colors.textPrimary} size={14} fill={Colors.textPrimary} />
                ) : (
                  <Play color={Colors.textPrimary} size={14} fill={Colors.textPrimary} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFocusMode(true)}
                style={styles.focusButton}
              >
                <Maximize2 color={Colors.textMuted} size={13} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {expanded && (
        <View style={styles.expandedSection}>
          {task.notes && (
            <View style={styles.notesSection}>
              <FileText color={Colors.textMuted} size={13} />
              <Text style={styles.notesText}>{task.notes}</Text>
            </View>
          )}
          {task.is_repeating && (
            <Text style={styles.repeatInfo}>
              Repeats {task.repeat_cycle}
            </Text>
          )}
          {isDone && task.completed_at && (
            <Text style={styles.completedDate}>
              Completed {new Date(task.completed_at).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          )}
          <SubtaskList
            taskId={task.id}
            subtasks={task.subtasks || []}
            disabled={isDone}
          />
          {!isDone && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
                <Pencil color={Colors.textMuted} size={14} />
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
                <Trash2 color={Colors.red} size={14} />
                <Text style={[styles.actionText, { color: Colors.red }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={styles.expandToggle}
        onPress={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronUp color={Colors.textMuted} size={16} />
        ) : (
          <ChevronDown color={Colors.textMuted} size={16} />
        )}
      </TouchableOpacity>

      {/* Focus Timer Modal */}
      <Modal
        visible={focusMode}
        animationType="fade"
        onRequestClose={() => setFocusMode(false)}
      >
        <View style={[styles.focusContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {/* Task name pinned at top */}
          <View style={styles.focusHeader}>
            <Text style={styles.focusTitle} numberOfLines={2}>{task.title}</Text>
            <Text style={styles.focusMeta}>{task.estimated_duration_min}min · {priority.label}</Text>
          </View>

          <View style={styles.focusContent}>
            <View style={styles.ringContainer}>
              <Svg width={320} height={320} viewBox="0 0 320 320">
                <Circle
                  cx={160} cy={160} r={140}
                  stroke={Colors.border}
                  strokeWidth={14}
                  fill="none"
                />
                <Circle
                  cx={160} cy={160} r={140}
                  stroke={isOvertime ? Colors.red : isRunning ? Colors.accent : Colors.textSecondary}
                  strokeWidth={14}
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 140}`}
                  strokeDashoffset={`${2 * Math.PI * 140 * (1 - Math.min(focusSeconds / Math.max(estimatedSec, 1), 1))}`}
                  strokeLinecap="round"
                  transform="rotate(-90 160 160)"
                />
              </Svg>
              <View style={styles.ringCenter}>
                <Text style={[
                  styles.focusTimer,
                  isRunning && { color: Colors.accent },
                  isOvertime && { color: Colors.red },
                ]}>
                  {formatTime(focusSeconds)}
                </Text>
                <Text style={styles.focusEstimate}>/ {formatTime(estimatedSec)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.focusActions}>
            <TouchableOpacity
              style={styles.focusBtnClose}
              onPress={() => setFocusMode(false)}
            >
              <Minimize2 color={Colors.textMuted} size={18} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.focusBtn, isRunning ? styles.focusBtnStop : styles.focusBtnStart]}
              onPress={handleTimerToggle}
            >
              {isRunning ? (
                <Square color={Colors.textPrimary} size={20} fill={Colors.textPrimary} />
              ) : (
                <Play color={Colors.textPrimary} size={20} fill={Colors.textPrimary} />
              )}
              <Text style={styles.focusBtnText}>{isRunning ? 'Pause' : 'Start'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.focusBtnComplete}
              onPress={() => { handleComplete(); setFocusMode(false); }}
            >
              <CheckCircle2 color={Colors.textPrimary} size={20} />
              <Text style={styles.focusBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  cardDone: {
    opacity: 0.6,
    borderLeftColor: Colors.green,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  completeButton: {
    paddingTop: Spacing.xxs,
  },
  taskInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.semibold, fontSize: 15,
    color: Colors.textPrimary,
    flex: 1,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  priorityBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  priorityText: {
    fontFamily: Fonts.bold, fontSize: 10,
  },
  duration: {
    fontFamily: Fonts.regular, fontSize: 12,
    color: Colors.textMuted,
  },
  xpEarned: {
    fontFamily: Fonts.bold, fontSize: 12,
    color: Colors.gold,
  },
  timerArea: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  timerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerButtonRunning: {
    backgroundColor: Colors.red,
  },
  focusButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expandedSection: {
    marginTop: Spacing.md,
    paddingLeft: Spacing.xxxl,
  },
  notesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  notesText: {
    flex: 1,
    fontFamily: Fonts.regular, fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  repeatInfo: {
    fontFamily: Fonts.regular, fontSize: 12,
    color: Colors.accent,
    marginBottom: Spacing.sm,
  },
  completedDate: {
    fontFamily: Fonts.regular, fontSize: 12,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionText: {
    fontFamily: Fonts.regular, fontSize: 12,
    color: Colors.textMuted,
  },
  expandToggle: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  // Floating XP
  xpFloat: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  xpFloatText: {
    fontFamily: Fonts.bold, fontSize: 20,
    color: Colors.gold,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  // Focus mode
  focusContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xxl,
  },
  focusHeader: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  focusContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.lg,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusPriorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: Spacing.lg,
  },
  focusTitle: {
    fontFamily: Fonts.bold, fontSize: 26,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: Spacing.sm,
  },
  focusMeta: {
    fontFamily: Fonts.regular, fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.xxxxl,
  },
  focusTimer: {
    fontFamily: Fonts.bold, fontSize: 52,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  focusEstimate: {
    fontFamily: Fonts.regular, fontSize: 16,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  focusActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },
  focusBtnClose: {
    width: 48,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
    borderRadius: 16,
  },
  focusBtnStart: {
    backgroundColor: Colors.accent,
  },
  focusBtnStop: {
    backgroundColor: Colors.red,
  },
  focusBtnComplete: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
    borderRadius: 16,
    backgroundColor: Colors.green,
  },
  focusBtnText: {
    fontFamily: Fonts.bold, fontSize: 16,
    color: Colors.textPrimary,
  },
});
