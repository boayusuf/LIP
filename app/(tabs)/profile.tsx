import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  Camera,
  Check,
  ChevronRight,
  Edit3,
  Flame,
  LogOut,
  Star,
  Target,
  Users,
  X
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AvatarImage from '../../components/AvatarImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useGroupStore } from '../../lib/groupStore';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';

const SCREEN_WIDTH = Dimensions.get('window').width;

const LEVELS = [
  { level: 1,  name: 'Beginner',   minXP: 0 },
  { level: 2,  name: 'Focused',    minXP: 300 },
  { level: 3,  name: 'Consistent', minXP: 700 },
  { level: 4,  name: 'Dedicated',  minXP: 1300 },
  { level: 5,  name: 'Driven',     minXP: 2200 },
  { level: 6,  name: 'Sharp',      minXP: 3500 },
  { level: 7,  name: 'Expert',     minXP: 5500 },
  { level: 8,  name: 'Master',     minXP: 8000 },
  { level: 9,  name: 'Elite',      minXP: 11500 },
  { level: 10, name: 'Champion',   minXP: 16000 },
  { level: 11, name: 'Warrior',    minXP: 22000 },
  { level: 12, name: 'Legend',     minXP: 30000 },
  { level: 13, name: 'Mythic',     minXP: 40000 },
  { level: 14, name: 'Titan',      minXP: 55000 },
  { level: 15, name: 'Apex',       minXP: 75000 },
];

function getLevel(xp: number) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.minXP) current = lvl;
    else break;
  }
  const nextLevel = LEVELS.find((l) => l.minXP > xp);
  const progress = nextLevel
    ? (xp - current.minXP) / (nextLevel.minXP - current.minXP)
    : 1;
  return { ...current, nextLevel, progress, xpToNext: nextLevel ? nextLevel.minXP - xp : 0 };
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getHeatmapColor(count: number): string {
  if (count === 0) return Colors.border;
  if (count === 1) return Colors.green + '40';
  if (count === 2) return Colors.green + '70';
  if (count <= 4) return Colors.green + 'A0';
  return Colors.green;
}

const CELL_SIZE = Math.floor((SCREEN_WIDTH - 80) / 18);
const CELL_GAP = 2;
const WEEKS_TO_SHOW = 17;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface HeatmapData {
  [dateKey: string]: number;
}

function ContributionHeatmap({ data, totalDays }: { data: HeatmapData; totalDays: number }) {
  const scrollRef = useRef<ScrollView>(null);
  const today = new Date();
  const endDate = new Date(today);
  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (WEEKS_TO_SHOW * 7) + 1);
  const startDay = startDate.getDay();
  const mondayOffset = startDay === 0 ? -6 : 1 - startDay;
  startDate.setDate(startDate.getDate() + mondayOffset);

  const weeks: { date: Date; count: number }[][] = [];
  const currentDate = new Date(startDate);
  let currentWeek: { date: Date; count: number }[] = [];
  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  let weekIndex = 0;

  while (currentDate <= endDate) {
    const key = getDateKey(currentDate);
    const count = data[key] || 0;
    const dayOfWeek = currentDate.getDay();

    if (currentDate.getMonth() !== lastMonth && dayOfWeek === 1) {
      monthLabels.push({ label: MONTH_LABELS[currentDate.getMonth()], weekIndex });
      lastMonth = currentDate.getMonth();
    }

    if (dayOfWeek === 1 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
      weekIndex++;
    }

    currentWeek.push({ date: new Date(currentDate), count });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const totalContributions = Object.values(data).reduce((sum, c) => sum + c, 0);

  return (
    <View style={heatStyles.container}>
      <View style={heatStyles.header}>
        <Text style={heatStyles.title}>{totalContributions} tasks in the last {totalDays} days</Text>
      </View>

      <View style={heatStyles.monthRow}>
        <View style={{ width: 20 }} />
        {monthLabels.map((m, i) => (
          <Text
            key={`${m.label}-${i}`}
            style={[heatStyles.monthLabel, { left: 20 + m.weekIndex * (CELL_SIZE + CELL_GAP) }]}
          >
            {m.label}
          </Text>
        ))}
      </View>

      <View style={heatStyles.gridContainer}>
        <View style={heatStyles.dayLabels}>
          {dayLabels.map((label, i) => (
            <Text key={i} style={[heatStyles.dayLabel, { height: CELL_SIZE + CELL_GAP }]}>
              {label}
            </Text>
          ))}
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          <View style={heatStyles.grid}>
            {weeks.map((week, wi) => (
              <View key={wi} style={heatStyles.weekColumn}>
                {week.map((day, di) => {
                  const isFuture = day.date > today;
                  return (
                    <View
                      key={di}
                      style={[
                        heatStyles.cell,
                        {
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          backgroundColor: isFuture ? 'transparent' : getHeatmapColor(day.count),
                          borderWidth: isFuture ? 1 : 0,
                          borderColor: isFuture ? Colors.border + '40' : 'transparent',
                        },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={heatStyles.legend}>
        <Text style={heatStyles.legendText}>Less</Text>
        {[0, 1, 2, 3, 5].map((count, i) => (
          <View key={i} style={[heatStyles.legendCell, { backgroundColor: getHeatmapColor(count) }]} />
        ))}
        <Text style={heatStyles.legendText}>More</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { session, profile, fetchProfile, uploadAvatar } = useStore();
  const { groups, fetchGroups } = useGroupStore();
  const router = useRouter();

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [stats, setStats] = useState({ tasksCompleted: 0, streak: 0, joined: '' });
  const [heatmapData, setHeatmapData] = useState<HeatmapData>({});
  const [levelUpData, setLevelUpData] = useState<{ level: number; name: string } | null>(null);
  const prevLevelRef = useRef<number | null>(null);
  const levelUpScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchProfile();
    fetchGroups();
    loadStats();
    loadHeatmap();
  }, []);

  const totalXP = profile?.total_xp || 0;
  const level = getLevel(totalXP);

  useEffect(() => {
    if (prevLevelRef.current === null) {
      prevLevelRef.current = level.level;
      return;
    }
    if (level.level > prevLevelRef.current) {
      prevLevelRef.current = level.level;
      levelUpScale.setValue(0);
      setLevelUpData({ level: level.level, name: level.name });
      Animated.spring(levelUpScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }).start();
    } else {
      prevLevelRef.current = level.level;
    }
  }, [level.level]);

  const loadHeatmap = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const since = new Date();
    since.setDate(since.getDate() - WEEKS_TO_SHOW * 7);

    const { data: personalTasks } = await supabase
      .from('tasks')
      .select('completed_at')
      .eq('user_id', user.id)
      .eq('status', 'done')
      .not('completed_at', 'is', null)
      .gte('completed_at', since.toISOString());

    const { data: groupCompletions } = await supabase
      .from('group_task_completions')
      .select('completed_at')
      .eq('user_id', user.id)
      .eq('status', 'done')
      .not('completed_at', 'is', null)
      .gte('completed_at', since.toISOString());

    const counts: HeatmapData = {};

    (personalTasks || []).forEach((t) => {
      const key = getDateKey(new Date(t.completed_at));
      counts[key] = (counts[key] || 0) + 1;
    });

    (groupCompletions || []).forEach((c) => {
      const key = getDateKey(new Date(c.completed_at));
      counts[key] = (counts[key] || 0) + 1;
    });

    setHeatmapData(counts);
  };

  const loadStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { count: personalDone } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'done');

    const { count: groupDone } = await supabase
      .from('group_task_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'done');

    const joined = user.created_at
      ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : '';

    const { data: recentPersonalTasks } = await supabase
      .from('tasks')
      .select('completed_at')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(100);

    const { data: recentGroupTasks } = await supabase
      .from('group_task_completions')
      .select('completed_at')
      .eq('user_id', user.id)
      .eq('status', 'done')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(100);

    const recentTasks = [
      ...(recentPersonalTasks || []),
      ...(recentGroupTasks || []),
    ].sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

    let streak = 0;
    if (recentTasks.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let checkDate = new Date(today);

      const lastTask = new Date(recentTasks[0].completed_at);
      lastTask.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - lastTask.getTime()) / 86400000);
      if (diffDays > 1) {
        streak = 0;
      } else {
        if (diffDays === 1) checkDate.setDate(checkDate.getDate() - 1);
        const taskDates = new Set(
          recentTasks.map((t) => {
            const d = new Date(t.completed_at);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
          })
        );
        while (taskDates.has(checkDate.getTime())) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }
    }

    const newStats = {
      tasksCompleted: (personalDone || 0) + (groupDone || 0),
      streak,
      joined,
    };
    setStats(newStats);

  };

  const handleAvatarPress = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access in settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    const { error } = await uploadAvatar(result.assets[0].uri);
    if (error) Alert.alert('Upload failed', error);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('profiles').update({ name: newName.trim() }).eq('id', user.id);
    setEditingName(false);
    fetchProfile();
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const displayName = profile?.name || profile?.email?.split('@')[0] || 'User';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Level-up modal */}
      <Modal visible={!!levelUpData} transparent animationType="none" onRequestClose={() => setLevelUpData(null)}>
        <TouchableOpacity style={styles.levelUpOverlay} activeOpacity={1} onPress={() => setLevelUpData(null)}>
          <Animated.View style={[styles.levelUpCard, { transform: [{ scale: levelUpScale }] }]}>
            <Text style={styles.levelUpEmoji}>⚡</Text>
            <Text style={styles.levelUpTitle}>LEVEL UP!</Text>
            <Text style={styles.levelUpLevel}>Level {levelUpData?.level}</Text>
            <Text style={styles.levelUpName}>{levelUpData?.name}</Text>
            <Text style={styles.levelUpHint}>Tap to dismiss</Text>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <View style={styles.profileCard}>
          <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarWrapper}>
            <AvatarImage
              avatarUrl={profile?.avatar_url ?? null}
              name={displayName}
              size={80}
              style={styles.avatarBorder}
            />
            <View style={styles.cameraBadge}>
              <Camera color={Colors.textPrimary} size={12} />
            </View>
          </TouchableOpacity>
          {editingName ? (
            <View style={styles.editNameRow}>
              <TextInput
                style={styles.editNameInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />
              <TouchableOpacity onPress={handleSaveName} style={styles.editBtn}>
                <Check color={Colors.green} size={18} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingName(false)} style={styles.editBtn}>
                <X color={Colors.priorityUrgent} size={18} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.nameRow}
              onPress={() => { setNewName(displayName); setEditingName(true); }}
            >
              <Text style={styles.displayName}>{displayName}</Text>
              <Edit3 color={Colors.textMuted} size={14} />
            </TouchableOpacity>
          )}
          <Text style={styles.email}>{profile?.email || session?.user?.email}</Text>
          {stats.joined ? <Text style={styles.joinedText}>Joined {stats.joined}</Text> : null}
        </View>

        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View style={styles.levelBadge}>
              <Star color={Colors.gold} size={16} />
              <Text style={styles.levelNumber}>Level {level.level}</Text>
            </View>
            <Text style={styles.levelName}>{level.name}</Text>
          </View>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${Math.min(level.progress * 100, 100)}%` }]} />
          </View>
          <View style={styles.xpRow}>
            <Text style={styles.xpTotal}>{totalXP} XP</Text>
            {level.nextLevel && (
              <Text style={styles.xpToNext}>{level.xpToNext} XP to Level {level.nextLevel.level}</Text>
            )}
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Target color={Colors.accent} size={22} />
            <Text style={styles.statValue}>{stats.tasksCompleted}</Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
          <View style={styles.statCard}>
            <Flame color={Colors.priorityUrgent} size={22} />
            <Text style={styles.statValue}>{stats.streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Users color={Colors.accent} size={22} />
            <Text style={styles.statValue}>{groups.length}</Text>
            <Text style={styles.statLabel}>Groups</Text>
          </View>
        </View>

        <ContributionHeatmap data={heatmapData} totalDays={WEEKS_TO_SHOW * 7} />

        {groups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Groups</Text>
            {groups.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={styles.groupItem}
                onPress={() => router.push(`/group/${g.id}`)}
              >
                <View style={styles.groupAvatar}>
                  <Text style={styles.groupAvatarText}>{g.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{g.name}</Text>
                  <Text style={styles.groupMembers}>{g.member_count || 0} members</Text>
                </View>
                <ChevronRight color={Colors.textMuted} size={18} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut color={Colors.priorityUrgent} size={18} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const heatStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary, borderRadius: 14, padding: 14,
    marginBottom: 20, borderWidth: 1, borderColor: Colors.border,
  },
  header: { marginBottom: 10 },
  title: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  monthRow: { height: 16, position: 'relative', marginBottom: 4 },
  monthLabel: { position: 'absolute', fontSize: 10, color: Colors.textMuted },
  gridContainer: { flexDirection: 'row' },
  dayLabels: { marginRight: 4, justifyContent: 'flex-start' },
  dayLabel: {
    fontSize: 10, color: Colors.textMuted, textAlignVertical: 'center',
    lineHeight: CELL_SIZE + CELL_GAP, width: 16,
  },
  grid: { flexDirection: 'row', gap: CELL_GAP },
  weekColumn: { gap: CELL_GAP },
  cell: { borderRadius: 2 },
  legend: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 3, marginTop: 8,
  },
  legendText: { fontSize: 10, color: Colors.textMuted, marginHorizontal: 2 },
  legendCell: { width: 10, height: 10, borderRadius: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  profileCard: { alignItems: 'center', marginBottom: 20 },
  avatarWrapper: { marginBottom: 12, position: 'relative' },
  avatarBorder: { borderWidth: 3, borderColor: Colors.accent },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  displayName: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  editNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  editNameInput: {
    backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8,
    fontSize: 18, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.accent, minWidth: 180,
  },
  editBtn: { padding: 6 },
  email: { fontSize: 14, color: Colors.textMuted },
  joinedText: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  levelCard: {
    backgroundColor: Colors.primary, borderRadius: 14, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.gold + '30',
  },
  levelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelNumber: { fontSize: 16, fontWeight: '700', color: Colors.gold },
  levelName: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  xpBarBg: {
    height: 8, backgroundColor: Colors.background, borderRadius: 4, overflow: 'hidden', marginBottom: 8,
  },
  xpBarFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 4 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpTotal: { fontSize: 14, fontWeight: '700', color: Colors.gold },
  xpToNext: { fontSize: 12, color: Colors.textMuted },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: 12, padding: 14,
    alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary, marginBottom: 10 },
  groupItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
    borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: Colors.border,
  },
  groupAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.accent + '20',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  groupAvatarText: { fontSize: 16, fontWeight: '700', color: Colors.accent },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  groupMembers: { fontSize: 12, color: Colors.textMuted },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: Colors.priorityUrgent + '40',
    marginTop: 10,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: Colors.priorityUrgent },
  coachCard: {
    backgroundColor: Colors.primary, borderRadius: 14, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: Colors.accent + '30',
  },
  coachHeader: { fontSize: 14, fontWeight: '700', color: Colors.accent, marginBottom: 8 },
  coachMessage: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  levelUpOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center',
  },
  levelUpCard: {
    backgroundColor: Colors.primary, borderRadius: 24, padding: 36,
    alignItems: 'center', borderWidth: 2, borderColor: Colors.gold,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20,
    minWidth: 240,
  },
  levelUpEmoji: { fontSize: 52, marginBottom: 8 },
  levelUpTitle: { fontSize: 22, fontWeight: '900', color: Colors.gold, letterSpacing: 3, marginBottom: 12 },
  levelUpLevel: { fontSize: 48, fontWeight: '800', color: Colors.textPrimary, lineHeight: 52 },
  levelUpName: { fontSize: 20, fontWeight: '700', color: Colors.accent, marginTop: 4, marginBottom: 20 },
  levelUpHint: { fontSize: 12, color: Colors.textMuted },
});