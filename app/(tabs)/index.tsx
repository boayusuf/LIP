import { ChevronDown, ChevronUp, Plus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddTaskModal from '../../components/AddTaskModal';
import TaskCard from '../../components/TaskCard';
import { Colors } from '../../constants/Colors';
import { useStore } from '../../lib/store';
import { Task, TimeBlock } from '../../types';

const TIME_BLOCKS: { key: TimeBlock; label: string; emoji: string; hours: string }[] = [
  { key: 'morning', label: 'Morning', emoji: '🌅', hours: '6 AM – 12 PM' },
  { key: 'afternoon', label: 'Afternoon', emoji: '☀️', hours: '12 – 6 PM' },
  { key: 'evening', label: 'Evening', emoji: '🌙', hours: '6 PM – 12 AM' },
];

const PRIORITY_ORDER = { urgent: 0, important: 1, low: 2 };

export default function TodoScreen() {
  const { tasks, tasksLoading, fetchTasks, profile } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const [collapsedBlocks, setCollapsedBlocks] = useState<TimeBlock[]>([]);

const toggleBlock = (block: TimeBlock) => {
  setCollapsedBlocks((prev) =>
    prev.includes(block) ? prev.filter((b) => b !== block) : [...prev, block]
  );
};

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  }, []);

  const activeTasks = tasks.filter((t) => t.status !== 'done');
  const completedTasks = tasks.filter((t) => t.status === 'done');

  const getTasksForBlock = (block: TimeBlock): Task[] => {
    return activeTasks
      .filter((t) => t.time_block === block)
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  };

  const totalTasks = tasks.length;
  const doneTasks = completedTasks.length;
  const todayXP = completedTasks.reduce((sum, t) => sum + t.xp_earned, 0);

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingTask(null);
  };

  const hasActiveTasks = activeTasks.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {profile?.name ? `Hey, ${profile.name}` : 'Hey there'} 👋
          </Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
        <View style={styles.xpBadge}>
          <Text style={styles.xpText}>{profile?.total_xp ?? 0} XP</Text>
        </View>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{doneTasks}/{totalTasks}</Text>
          <Text style={styles.statLabel}>Tasks</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.gold }]}>+{todayXP}</Text>
          <Text style={styles.statLabel}>XP Today</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%
          </Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
          />
        }
      >
        {totalTasks === 0 && !tasksLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to add your first one</Text>
          </View>
        ) : (
          <>
            {/* Active tasks by time block */}
            {!hasActiveTasks && doneTasks > 0 && (
              <View style={styles.allDoneState}>
                <Text style={styles.allDoneEmoji}>🎉</Text>
                <Text style={styles.allDoneTitle}>All done for today!</Text>
                <Text style={styles.allDoneSubtitle}>+{todayXP} XP earned</Text>
              </View>
            )}

            {TIME_BLOCKS.map(({ key, label, emoji, hours }) => {
              const blockTasks = getTasksForBlock(key);
              if (blockTasks.length === 0) return null;
              const isCollapsed = collapsedBlocks.includes(key);
              return (
                <View key={key} style={styles.timeBlock}>
                  <TouchableOpacity
                    style={styles.blockHeader}
                    onPress={() => toggleBlock(key)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.blockHeaderLeft}>
                      <Text style={styles.blockTitle}>
                        {emoji} {label}
                      </Text>
                      <View style={styles.blockCountBadge}>
                        <Text style={styles.blockCountText}>{blockTasks.length}</Text>
                      </View>
                    </View>
                    <View style={styles.blockHeaderRight}>
                      <Text style={styles.blockHours}>{hours}</Text>
                      {isCollapsed ? (
                        <ChevronDown color={Colors.textMuted} size={16} />
                      ) : (
                        <ChevronUp color={Colors.textMuted} size={16} />
                      )}
                    </View>
                  </TouchableOpacity>
                  {!isCollapsed &&
                    blockTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={() => handleEdit(task)}
                      />
                    ))
                  }
                </View>
              );
            })}

            {/* Completed tasks folder */}
            {completedTasks.length > 0 && (
              <View style={styles.completedSection}>
                <TouchableOpacity
                  style={styles.completedHeader}
                  onPress={() => setShowCompleted(!showCompleted)}
                  activeOpacity={0.7}
                >
                  <View style={styles.completedHeaderLeft}>
                    <Text style={styles.completedTitle}>
                      ✅ Completed
                    </Text>
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>
                        {completedTasks.length}
                      </Text>
                    </View>
                  </View>
                  {showCompleted ? (
                    <ChevronUp color={Colors.textMuted} size={18} />
                  ) : (
                    <ChevronDown color={Colors.textMuted} size={18} />
                  )}
                </TouchableOpacity>

                {showCompleted &&
                  completedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={() => handleEdit(task)}
                    />
                  ))
                }
              </View>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Plus color={Colors.textPrimary} size={28} />
      </TouchableOpacity>

      <AddTaskModal
        visible={showAddModal}
        onClose={handleCloseModal}
        editTask={editingTask}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  date: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  xpBadge: {
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  xpText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.gold,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  timeBlock: {
    marginBottom: 20,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  blockHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  blockCountBadge: {
    backgroundColor: Colors.accent + '20',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  blockCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accent,
  },
  blockHours: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  },
  allDoneState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  allDoneEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  allDoneTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.green,
  },
  allDoneSubtitle: {
    fontSize: 14,
    color: Colors.gold,
    fontWeight: '600',
    marginTop: 4,
  },
  // Completed folder
  completedSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  completedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  completedBadge: {
    backgroundColor: Colors.green + '20',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.green,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});