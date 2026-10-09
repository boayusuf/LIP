import {
  CheckCheck,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  type LucideIcon,
  Moon,
  Plus,
  Search,
  Sun,
  Sunrise,
  Trophy,
  X,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddTaskModal from '../../components/AddTaskModal';
import TaskCard from '../../components/TaskCard';
import { Colors } from '../../constants/Colors';
import { Fonts, Radius, Spacing, Type } from '../../constants/theme';
import { useStore } from '../../lib/store';
import { Task, TimeBlock } from '../../types';

const TIME_BLOCKS: { key: TimeBlock; label: string; Icon: LucideIcon; hours: string }[] = [
  { key: 'morning', label: 'Morning', Icon: Sunrise, hours: '6 AM – 12 PM' },
  { key: 'afternoon', label: 'Afternoon', Icon: Sun, hours: '12 – 6 PM' },
  { key: 'evening', label: 'Evening', Icon: Moon, hours: '6 PM – 12 AM' },
];

const PRIORITY_ORDER = { urgent: 0, important: 1, low: 2 };

export default function TodoScreen() {
  const { tasks, tasksLoading, fetchTasks, profile } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const allActiveTasks = tasks.filter((t) => t.status !== 'done');
  const activeTasks = searchQuery.trim()
    ? allActiveTasks.filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : allActiveTasks;
  const completedTasks = tasks
    .filter((t) => t.status === 'done')
    .sort((a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime())
    .slice(0, 50);

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
            {profile?.name || 'Today'}
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

      <View style={styles.searchBar}>
        <Search color={Colors.textMuted} size={16} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X color={Colors.textMuted} size={16} />
          </TouchableOpacity>
        )}
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
            <View style={styles.emptyIconWrap}>
              <ClipboardList color={Colors.textMuted} size={28} />
            </View>
            <Text style={styles.emptyTitle}>Nothing scheduled</Text>
            <Text style={styles.emptySubtitle}>Add a task to start the day</Text>
          </View>
        ) : (
          <>
            {/* Active tasks by time block */}
            {!hasActiveTasks && doneTasks > 0 && (
              <View style={styles.allDoneState}>
                <View style={styles.allDoneIconWrap}>
                  <Trophy color={Colors.green} size={24} />
                </View>
                <Text style={styles.allDoneTitle}>Everything cleared</Text>
                <Text style={styles.allDoneSubtitle}>+{todayXP} XP earned</Text>
              </View>
            )}

            {TIME_BLOCKS.map(({ key, label, Icon, hours }) => {
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
                      <Icon color={Colors.textSecondary} size={15} />
                      <Text style={styles.blockTitle}>{label}</Text>
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
                    <CheckCheck color={Colors.textSecondary} size={15} />
                    <Text style={styles.completedTitle}>Completed</Text>
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
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  greeting: { ...Type.title, color: Colors.textPrimary },
  date: { ...Type.label, color: Colors.textMuted, marginTop: Spacing.xxs },
  xpBadge: {
    backgroundColor: Colors.goldSubtle,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
  },
  xpText: { ...Type.label, fontFamily: Fonts.bold, color: Colors.gold },

  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.screen,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { ...Type.stat, color: Colors.textPrimary },
  statLabel: {
    ...Type.micro,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    textTransform: 'uppercase',
  },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.border },

  // A filter is a tool, not content: recessed and quieter than the cards it acts on.
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.recessed,
    marginHorizontal: Spacing.screen,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, ...Type.body, color: Colors.textPrimary },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.screen, paddingTop: Spacing.xs },
  timeBlock: { marginBottom: Spacing.xxl },

  // Section headings are rules, not cards. Only task cards carry a fill, so
  // content always outranks the label above it.
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xxs,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  blockHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  blockHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  blockTitle: { ...Type.micro, color: Colors.textSecondary, textTransform: 'uppercase' },
  blockCountBadge: {
    backgroundColor: Colors.accentSubtle,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    minWidth: 20,
    alignItems: 'center',
  },
  blockCountText: { ...Type.caption, fontFamily: Fonts.bold, color: Colors.accent },
  blockHours: { ...Type.caption, color: Colors.textMuted },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.huge + Spacing.xxl },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: { ...Type.heading, color: Colors.textPrimary },
  emptySubtitle: { ...Type.body, color: Colors.textMuted, marginTop: Spacing.xs },

  allDoneState: { alignItems: 'center', paddingVertical: Spacing.xxxl },
  allDoneIconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Colors.greenSubtle,
    borderWidth: 1,
    borderColor: Colors.greenBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  allDoneTitle: { ...Type.heading, color: Colors.textPrimary },
  allDoneSubtitle: { ...Type.bodyStrong, color: Colors.gold, marginTop: Spacing.xs },

  completedSection: { marginTop: Spacing.sm, marginBottom: Spacing.sm },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xxs,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  completedHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  completedTitle: { ...Type.micro, color: Colors.textSecondary, textTransform: 'uppercase' },
  completedBadge: {
    backgroundColor: Colors.greenSubtle,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    minWidth: 20,
    alignItems: 'center',
  },
  completedBadgeText: { ...Type.caption, fontFamily: Fonts.bold, color: Colors.green },

  // Neutral drop shadow rather than an accent-colored glow.
  fab: {
    position: 'absolute',
    bottom: Spacing.xxl,
    right: Spacing.screen,
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
