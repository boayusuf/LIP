import {
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    FileText,
    Pencil,
    Play,
    Repeat,
    Square,
    Trash2,
} from 'lucide-react-native';
import { useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../constants/Colors';
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

export default function TaskCard({ task, onEdit }: TaskCardProps) {
  const { startTimer, stopTimer, completeTask, deleteTask } = useStore();
  const [expanded, setExpanded] = useState(false);

  const isDone = task.status === 'done';
  const isRunning = task.status === 'doing';
  const priority = PRIORITY_CONFIG[task.priority];

  const handleComplete = () => {
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

  return (
    <View style={[styles.card, isDone && styles.cardDone]}>
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
          <SubtaskList
            taskId={task.id}
            subtasks={task.subtasks || []}
          />
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
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
    gap: 10,
  },
  completeButton: {
    paddingTop: 2,
  },
  taskInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
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
    gap: 8,
    marginTop: 6,
  },
  priorityBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  duration: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  xpEarned: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.gold,
  },
  timerArea: {
    alignItems: 'flex-end',
    gap: 6,
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
  expandedSection: {
    marginTop: 10,
    paddingLeft: 34,
  },
  notesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  repeatInfo: {
    fontSize: 12,
    color: Colors.accent,
    marginBottom: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  expandToggle: {
    alignItems: 'center',
    paddingTop: 6,
  },
});