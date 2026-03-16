import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  LogOut,
  Maximize2,
  MessageCircle,
  Minimize2,
  Newspaper,
  Play,
  Plus,
  Square,
  ThumbsDown,
  ThumbsUp,
  X
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import AvatarImage from '../../components/AvatarImage';
import TimerDisplay from '../../components/TimerDisplay';
import { Colors } from '../../constants/Colors';
import { useGroupStore } from '../../lib/groupStore';
import { useStore } from '../../lib/store';

type Tab = 'tasks' | 'chat' | 'feed';

function fmtSec(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const GROUP_LEVELS = [0, 300, 700, 1300, 2200, 3500, 5500, 8000, 11500, 16000, 22000, 30000, 40000, 55000, 75000];
function getGroupLevel(xp: number): number {
  let lvl = 1;
  for (let i = 0; i < GROUP_LEVELS.length; i++) {
    if (xp >= GROUP_LEVELS[i]) lvl = i + 1; else break;
  }
  return lvl;
}

type CheckinStatus = 'none' | 'too_early' | 'upcoming' | 'open' | 'closed';
function getCheckinStatus(task: any): { status: CheckinStatus; label: string } {
  if (!task?.require_checkin || !task?.checkin_time) return { status: 'none', label: '' };
  const [h, m] = task.checkin_time.split(':').map(Number);
  const buf = task.checkin_buffer_min ?? 15;
  const now = new Date();
  const opens = new Date(); opens.setHours(h, m, 0, 0);
  const closes = new Date(opens.getTime() + buf * 60000);
  const closeH = Math.floor((h * 60 + m + buf) / 60) % 24;
  const closeM = (m + buf) % 60;
  const openStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const closeStr = `${String(closeH).padStart(2, '0')}:${String(closeM).padStart(2, '0')}`;
  const tooEarlyThreshold = new Date(opens.getTime() - 60 * 60000);
  if (now < tooEarlyThreshold) return { status: 'too_early', label: `Opens at ${openStr}` };
  if (now < opens) return { status: 'upcoming', label: `Opens ${openStr}–${closeStr}` };
  if (now < closes) return { status: 'open', label: `Open until ${closeStr}` };
  return { status: 'closed', label: `Closed at ${closeStr}` };
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useStore();
  const {
    currentGroup,
    proposals,
    groupTasks,
    fetchGroupDetail,
    fetchProposals,
    fetchGroupTasks,
    voteOnProposal,
    startGroupTimer,
    stopGroupTimer,
    completeGroupTask,
    leaveGroup,
  } = useGroupStore();

  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const [refreshing, setRefreshing] = useState(false);
  const [, setCheckinTick] = useState(0);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showVotes, setShowVotes] = useState(true);
  const [showActive, setShowActive] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showFullyCompleted, setShowFullyCompleted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Photo preview state
  type PendingComplete = { completionId: string; taskId: string; groupId: string; photoUri: string };
  const [pendingPhoto, setPendingPhoto] = useState<PendingComplete | null>(null);

  const [focusGroupTaskId, setFocusGroupTaskId] = useState<string | null>(null);
  const [focusGroupSeconds, setFocusGroupSeconds] = useState(0);

  // Re-render every 30s so check-in window badges update automatically
  useEffect(() => {
    const t = setInterval(() => setCheckinTick(n => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (id) {
      fetchGroupDetail(id);
      fetchProposals(id);
      fetchGroupTasks(id);
    }
  }, [id]);

  const focusGroupTaskData = focusGroupTaskId ? groupTasks.find(t => t.id === focusGroupTaskId) : null;
  const focusGroupCompletion = focusGroupTaskData?.my_completion ?? null;

  useEffect(() => {
    if (!focusGroupTaskId || !focusGroupCompletion) return;
    const update = () => {
      const extra = focusGroupCompletion.timer_started_at
        ? Math.floor((Date.now() - new Date(focusGroupCompletion.timer_started_at).getTime()) / 1000)
        : 0;
      setFocusGroupSeconds((focusGroupCompletion.timer_elapsed_sec || 0) + extra);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [focusGroupTaskId, focusGroupCompletion?.timer_started_at, focusGroupCompletion?.timer_elapsed_sec]);

  const onRefresh = useCallback(async () => {
    if (!id) return;
    setRefreshing(true);
    await Promise.all([
      fetchGroupDetail(id),
      fetchProposals(id),
      fetchGroupTasks(id),
    ]);
    setRefreshing(false);
  }, [id]);

  const handleShareCode = async () => {
    if (!currentGroup) return;
    try {
      await Share.share({
        message: `Join my group "${currentGroup.name}" on LockInPhase! Code: ${currentGroup.invite_code}`,
      });
    } catch (e) {}
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave "${currentGroup?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (id) {
              await leaveGroup(id);
              router.back();
            }
          },
        },
      ]
    );
  };

  const userId = session?.user?.id;
  const pendingProposals = proposals.filter((p) => p.status === 'pending');
  const memberCount = currentGroup?.member_count || 0;
  const members = currentGroup?.members || [];

  const myActiveTasks = groupTasks.filter((t) => {
    if (t.my_completion?.status === 'done') return false;
    if (t.require_checkin && t.checkin_time) {
      const { status } = getCheckinStatus(t);
      if (status === 'closed' || status === 'too_early') return false;
    }
    return true;
  });
  const upcomingCheckins = groupTasks.filter((t) => {
    if (t.my_completion?.status === 'done') return false;
    if (!t.require_checkin || !t.checkin_time) return false;
    return getCheckinStatus(t).status === 'too_early';
  });
  const awaitingOthers = groupTasks.filter((t) => {
    if (t.my_completion?.status !== 'done') return false;
    const all = t.all_completions || [];
    return all.some((c: any) => c.status !== 'done');
  });
  const fullyCompleted = groupTasks.filter((t) => {
    const all = t.all_completions || [];
    return all.length > 0 && all.every((c: any) => c.status === 'done');
  });

  const getMemberName = (member: any) => {
    return member?.profile?.name || member?.profile?.email?.split('@')[0] || 'Unknown';
  };

  const getVoteSummary = (proposal: any) => {
    const votes = proposal.votes || [];
    const yes = votes.filter((v: any) => v.vote === true).length + 1;
    const no = votes.filter((v: any) => v.vote === false).length;
    const myVote = votes.find((v: any) => v.user_id === userId);
    const needed = Math.floor(memberCount / 2) + 1;
    return { yes, no, myVote, needed };
  };

  if (!currentGroup) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={Colors.textPrimary} size={22} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerCenter} onPress={() => setShowGroupInfo(true)}>
          <Text style={styles.headerTitle} numberOfLines={1}>{currentGroup.name}</Text>
          <Text style={styles.headerSub}>
            {memberCount} members{(currentGroup as any).group_streak > 0 ? ` · 🔥 ${(currentGroup as any).group_streak} day streak` : ''}{currentGroup.group_xp ? ` · ⭐ Lvl ${getGroupLevel(currentGroup.group_xp)}` : ''} · tap for info
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShareCode} style={styles.codeBtn}>
          <Copy color={Colors.accent} size={16} />
          <Text style={styles.codeBtnText}>{currentGroup.invite_code}</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {([
          { key: 'tasks', label: 'Tasks', icon: Check },
          { key: 'chat', label: 'Chat', icon: MessageCircle },
          { key: 'feed', label: 'Feed', icon: Newspaper },
        ] as const).map(({ key, label, icon: Icon }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            onPress={() => {
              setActiveTab(key);
              if (key === 'chat') router.push(`/group/chat/${id}`);
              if (key === 'feed') router.push(`/group/feed/${id}`);
            }}
          >
            <Icon color={activeTab === key ? Colors.accent : Colors.textMuted} size={18} />
            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tasks Tab */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
      >
        {/* Pending Proposals */}
        {pendingProposals.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => setShowVotes(!showVotes)}>
              {showVotes ? <ChevronDown color={Colors.textSecondary} size={18} /> : <ChevronRight color={Colors.textSecondary} size={18} />}
              <Text style={styles.sectionTitle}>🗳️ Pending Votes ({pendingProposals.length})</Text>
            </TouchableOpacity>
            {showVotes && pendingProposals.map((proposal) => {
              const { yes, no, myVote, needed } = getVoteSummary(proposal);
              const isProposer = proposal.proposed_by === userId;
              return (
                <TouchableOpacity key={proposal.id} style={styles.proposalCard} onPress={() => setSelectedTask(proposal)}>
                  <View style={styles.proposalHeader}>
                    <Text style={styles.proposalTitle}>{proposal.title}</Text>
                    <View style={[styles.priorityBadge, {
                      backgroundColor:
                        proposal.priority === 'urgent' ? Colors.priorityUrgent + '20' :
                        proposal.priority === 'important' ? Colors.priorityImportant + '20' :
                        Colors.priorityLow + '20',
                    }]}>
                      <Text style={[styles.priorityText, {
                        color:
                          proposal.priority === 'urgent' ? Colors.priorityUrgent :
                          proposal.priority === 'important' ? Colors.priorityImportant :
                          Colors.priorityLow,
                      }]}>{proposal.priority}</Text>
                    </View>
                  </View>
                  <View style={styles.proposalMeta}>
                    <Text style={styles.proposalMetaText}>
                      {proposal.estimated_duration_min}min · {proposal.time_block}
                      {proposal.require_photo ? ' · 📸' : ''}
                      {proposal.require_checkin ? ' · ✅' : ''}
                    </Text>
                  </View>
                  <View style={styles.voteRow}>
                    <View style={styles.voteCount}>
                      <Text style={styles.voteYes}>👍 {yes}</Text>
                      <Text style={styles.voteNo}>👎 {no}</Text>
                      <Text style={styles.voteNeeded}>Need {needed}</Text>
                    </View>
                    {!isProposer && (
                      <View style={styles.voteButtons}>
                        <TouchableOpacity
                          style={[styles.voteBtn, myVote?.vote === true && styles.voteBtnActiveYes]}
                          onPress={() => voteOnProposal(proposal.id, true)}
                        >
                          <ThumbsUp color={myVote?.vote === true ? Colors.green : Colors.textMuted} size={18} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.voteBtn, myVote?.vote === false && styles.voteBtnActiveNo]}
                          onPress={() => voteOnProposal(proposal.id, false)}
                        >
                          <ThumbsDown color={myVote?.vote === false ? Colors.priorityUrgent : Colors.textMuted} size={18} />
                        </TouchableOpacity>
                      </View>
                    )}
                    {isProposer && <Text style={styles.proposerLabel}>Your proposal</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Active Group Tasks */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => setShowActive(!showActive)}>
            {showActive ? <ChevronDown color={Colors.textSecondary} size={18} /> : <ChevronRight color={Colors.textSecondary} size={18} />}
            <Text style={styles.sectionTitle}>📋 Group Tasks ({myActiveTasks.length})</Text>
          </TouchableOpacity>
          {showActive && (myActiveTasks.length === 0 ? (
            <View style={styles.emptyTasks}>
              <Text style={styles.emptyTasksText}>
                {pendingProposals.length > 0 ? 'Vote on proposals above!' : 'No group tasks yet'}
              </Text>
              <Text style={styles.emptyTasksSub}>Propose a task for the group!</Text>
            </View>
          ) : (
            myActiveTasks.map((task) => {
              const completion = task.my_completion;
              if (!completion) return null;
              const isRunning = !!completion.timer_started_at;
              const allCompletions = task.all_completions || [];
              const doneCount = allCompletions.filter((c: any) => c.status === 'done').length;
              const totalCount = allCompletions.length;
              const checkinStatus = task.require_checkin && task.checkin_time ? getCheckinStatus(task) : null;
              const checkinDisabled = !!(checkinStatus && ['closed', 'too_early'].includes(checkinStatus.status));
              return (
                <TouchableOpacity key={task.id} style={styles.taskCard} onPress={() => setSelectedTask(task)}>
                  {/* Check-in banner */}
                  {task.require_checkin && task.checkin_time && (() => {
                    const [h, m] = task.checkin_time.split(':').map(Number);
                    const buf = task.checkin_buffer_min ?? 15;
                    const closeTotal = h * 60 + m + buf;
                    const openStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
                    const closeStr = `${String(Math.floor(closeTotal/60)%24).padStart(2,'0')}:${String(closeTotal%60).padStart(2,'0')}`;
                    const cs = checkinStatus!;
                    const bannerColor = cs.status === 'open' ? Colors.green : cs.status === 'closed' ? Colors.priorityUrgent : cs.status === 'upcoming' ? Colors.accent : Colors.textMuted;
                    return (
                      <View style={[styles.checkinBanner, { borderColor: bannerColor + '50', backgroundColor: bannerColor + '15' }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.checkinBannerLabel, { color: bannerColor }]}>📍 CHECK IN</Text>
                          <Text style={styles.checkinBannerTime}>{openStr} – {closeStr} · {buf}min window</Text>
                        </View>
                        <Text style={[styles.checkinBannerStatus, { color: bannerColor }]}>{cs.label}</Text>
                      </View>
                    );
                  })()}
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <View style={styles.taskActions}>
                      {!task.require_checkin && (
                        <View style={styles.timerArea}>
                          <TimerDisplay
                            timerStartedAt={completion.timer_started_at}
                            timerElapsedSec={completion.timer_elapsed_sec}
                            estimatedMin={task.estimated_duration_min}
                          />
                          <View style={styles.timerBtns}>
                            {isRunning ? (
                              <TouchableOpacity style={styles.timerBtn} onPress={() => stopGroupTimer(completion.id)}>
                                <Square color={Colors.priorityUrgent} size={16} />
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity style={styles.timerBtn} onPress={() => startGroupTimer(completion.id)}>
                                <Play color={Colors.green} size={16} />
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.timerBtn} onPress={() => setFocusGroupTaskId(task.id)}>
                              <Maximize2 color={Colors.textMuted} size={14} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                      <TouchableOpacity
                        style={[styles.completeBtn, task.require_checkin && styles.checkinCompleteBtn, checkinDisabled && { opacity: 0.3 }]}
                        disabled={checkinDisabled}
                        onPress={async () => {
                          const pickPhoto = async (): Promise<string | null> => {
                            return new Promise((resolve) => {
                              Alert.alert('Photo Proof', 'Choose photo source', [
                                {
                                  text: 'Camera',
                                  onPress: async () => {
                                    const perm = await ImagePicker.requestCameraPermissionsAsync();
                                    if (!perm.granted) {
                                      Alert.alert('Permission needed', 'Please allow camera access in settings');
                                      return resolve(null);
                                    }
                                    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
                                    resolve(!result.canceled && result.assets[0] ? result.assets[0].uri : null);
                                  },
                                },
                                {
                                  text: 'Gallery',
                                  onPress: async () => {
                                    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: false });
                                    resolve(!result.canceled && result.assets[0] ? result.assets[0].uri : null);
                                  },
                                },
                                { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
                              ]);
                            });
                          };

                          if (task.require_photo) {
                            const uri = await pickPhoto();
                            if (!uri) return;
                            // Show photo preview
                            setPendingPhoto({ completionId: completion.id, taskId: task.id, groupId: task.group_id, photoUri: uri });
                            return;
                          }

                          if (task.require_checkin && task.checkin_time) {
                            const cs = getCheckinStatus(task);
                            if (cs.status === 'closed') {
                              Alert.alert('Check-in closed', `The check-in window has closed (${cs.label}).`);
                              return;
                            }
                            if (cs.status === 'too_early') {
                              Alert.alert('Too early', `Check-in ${cs.label}.`);
                              return;
                            }
                          }

                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          await completeGroupTask(completion.id, task.id, task.group_id);
                        }}
                      >
                        {task.require_photo ? (
                          <Camera color={Colors.green} size={16} />
                        ) : (
                          <Check color={Colors.green} size={16} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.taskMeta}>
                    {task.estimated_duration_min}min · {task.priority} · {task.time_block}
                    {task.require_photo ? ' · 📸' : ''}
                    {task.require_checkin ? ' · 📍' : ''}
                  </Text>
                  {task.require_checkin && (() => {
                    const cs = getCheckinStatus(task);
                    if (cs.status === 'none') return null;
                    const color = cs.status === 'closed' || cs.status === 'too_early' ? Colors.priorityUrgent : cs.status === 'open' ? Colors.green : Colors.textMuted;
                    return <Text style={[styles.checkinBadge, { color }]}>✅ {cs.label}</Text>;
                  })()}
                  {/* Member progress */}
                  <View style={styles.progressRow}>
                    <Text style={styles.progressText}>{doneCount}/{totalCount} completed</Text>
                    <View style={styles.memberDots}>
                      {allCompletions.map((c: any) => {
                        const windowClosed = task.require_checkin && task.checkin_time && getCheckinStatus(task).status === 'closed';
                        const missed = windowClosed && c.status !== 'done';
                        return (
                        <View
                          key={c.id}
                          style={[
                            styles.memberDot,
                            { borderWidth: 2, borderColor: c.late_checkin ? '#FF9500' : missed ? Colors.priorityUrgent : c.status === 'done' ? Colors.green : Colors.border },
                          ]}
                        >
                          <AvatarImage
                            size={20}
                            name={c.profile?.name || c.profile?.email?.split('@')[0] || '?'}
                            avatarUrl={c.profile?.avatar_url ?? null}
                          />
                        </View>
                        );
                      })}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ))}
        </View>

        {/* Upcoming Check-ins */}
        {upcomingCheckins.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => setShowUpcoming(!showUpcoming)}>
              {showUpcoming ? <ChevronDown color={Colors.textSecondary} size={18} /> : <ChevronRight color={Colors.textSecondary} size={18} />}
              <Text style={styles.sectionTitle}>📍 Upcoming Check-ins ({upcomingCheckins.length})</Text>
            </TouchableOpacity>
            {showUpcoming && upcomingCheckins.map((task) => {
              const [h, m] = task.checkin_time!.split(':').map(Number);
              const buf = task.checkin_buffer_min ?? 15;
              const closeTotal = h * 60 + m + buf;
              const openStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
              const closeStr = `${String(Math.floor(closeTotal / 60) % 24).padStart(2, '0')}:${String(closeTotal % 60).padStart(2, '0')}`;
              return (
                <View key={task.id} style={[styles.taskCard, styles.upcomingCard]}>
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <View style={[styles.checkinBanner, { borderColor: Colors.textMuted + '40', backgroundColor: Colors.textMuted + '10', marginBottom: 0, flex: 0 }]}>
                      <Text style={[styles.checkinBannerLabel, { color: Colors.textMuted }]}>📍</Text>
                    </View>
                  </View>
                  <Text style={styles.taskMeta}>
                    {task.estimated_duration_min}min · {task.priority} · Opens {openStr}–{closeStr}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Completed */}
        {/* Awaiting Others */}
        {awaitingOthers.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => setShowCompleted(!showCompleted)}>
              {showCompleted ? <ChevronDown color={Colors.textSecondary} size={18} /> : <ChevronRight color={Colors.textSecondary} size={18} />}
              <Text style={styles.sectionTitle}>⏳ Awaiting Others ({awaitingOthers.length})</Text>
            </TouchableOpacity>
            {showCompleted && awaitingOthers.map((task) => {
              const allCompletions = task.all_completions || [];
              const doneCount = allCompletions.filter((c: any) => c.status === 'done').length;
              const totalCount = allCompletions.length;
              return (
                <TouchableOpacity key={task.id} style={styles.taskCard} onPress={() => setSelectedTask(task)}>
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.taskXP}>+{task.my_completion?.xp_earned || 0} XP</Text>
                  </View>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressText}>{doneCount}/{totalCount} completed</Text>
                    <View style={styles.memberDots}>
                      {allCompletions.map((c: any) => (
                        <View
                          key={c.id}
                          style={[styles.memberDot, { borderWidth: 2, borderColor: c.status === 'done' ? Colors.green : Colors.border }]}
                        >
                          <AvatarImage
                            size={20}
                            name={c.profile?.name || c.profile?.email?.split('@')[0] || '?'}
                            avatarUrl={c.profile?.avatar_url ?? null}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Fully Completed */}
        {fullyCompleted.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => setShowFullyCompleted(!showFullyCompleted)}>
              {showFullyCompleted ? <ChevronDown color={Colors.textSecondary} size={18} /> : <ChevronRight color={Colors.textSecondary} size={18} />}
              <Text style={styles.sectionTitle}>✅ Completed ({fullyCompleted.length})</Text>
            </TouchableOpacity>
            {showFullyCompleted && fullyCompleted.map((task) => (
              <TouchableOpacity key={task.id} style={[styles.taskCard, styles.taskCardDone]} onPress={() => setSelectedTask(task)}>
                <Text style={styles.taskTitleDone}>{task.title}</Text>
                <Text style={styles.taskXP}>+{task.my_completion?.xp_earned || 0} XP</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (memberCount < 2) {
            Alert.alert('Need more members', 'A group needs at least 2 members before proposing tasks.');
            return;
          }
          router.push(`/group/propose/${id}`);
        }}
        activeOpacity={0.8}
      >
        <Plus color={Colors.textPrimary} size={28} />
      </TouchableOpacity>

      {/* Group Info Modal */}
      <Modal visible={showGroupInfo} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{currentGroup.name}</Text>
              <TouchableOpacity onPress={() => setShowGroupInfo(false)}>
                <X color={Colors.textPrimary} size={22} />
              </TouchableOpacity>
            </View>

            {currentGroup.description ? (
              <Text style={styles.groupDesc}>{currentGroup.description}</Text>
            ) : null}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Invite Code</Text>
              <TouchableOpacity onPress={handleShareCode} style={styles.infoCodeBtn}>
                <Text style={styles.infoCode}>{currentGroup.invite_code}</Text>
                <Copy color={Colors.accent} size={14} />
              </TouchableOpacity>
            </View>

            {currentGroup.group_xp !== undefined && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Group Level</Text>
                <Text style={styles.infoValue}>
                  ⭐ Level {getGroupLevel(currentGroup.group_xp)} · {currentGroup.group_xp} XP
                </Text>
              </View>
            )}

            <Text style={styles.membersTitle}>Members ({memberCount})</Text>
            <ScrollView style={styles.membersList}>
              {members.map((m: any) => (
                <View key={m.id} style={styles.memberItem}>
                  <AvatarImage
                    size={40}
                    name={getMemberName(m)}
                    avatarUrl={m.profile?.avatar_url ?? null}
                    style={{ marginRight: 12 }}
                  />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{getMemberName(m)}</Text>
                    <Text style={styles.memberEmail}>{m.profile?.email || ''}</Text>
                  </View>
                  {m.user_id === currentGroup.created_by && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
              <LogOut color={Colors.priorityUrgent} size={16} />
              <Text style={styles.leaveBtnText}>Leave Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Photo Preview Modal */}
      <Modal visible={!!pendingPhoto} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Photo</Text>
              <TouchableOpacity onPress={() => setPendingPhoto(null)}>
                <X color={Colors.textPrimary} size={22} />
              </TouchableOpacity>
            </View>
            {pendingPhoto && (
              <Image
                source={{ uri: pendingPhoto.photoUri }}
                style={styles.photoPreview}
                contentFit="cover"
              />
            )}
            <View style={styles.photoPreviewActions}>
              <TouchableOpacity
                style={styles.photoRetakeBtn}
                onPress={() => setPendingPhoto(null)}
              >
                <Text style={styles.photoRetakeBtnText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoConfirmBtn}
                onPress={async () => {
                  if (!pendingPhoto) return;
                  const { completionId, taskId, groupId, photoUri } = pendingPhoto;
                  setPendingPhoto(null);
                  const task = groupTasks.find((t) => t.id === taskId);
                  if (task?.require_checkin && task?.checkin_time) {
                    const cs = getCheckinStatus(task);
                    if (cs.status === 'closed') {
                      Alert.alert('Check-in closed', `The check-in window has closed (${cs.label}).`);
                      return;
                    }
                  }
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  await completeGroupTask(completionId, taskId, groupId, photoUri);
                }}
              >
                <Text style={styles.photoConfirmBtnText}>✓ Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Group Task Focus Timer Modal */}
      <Modal
        visible={!!focusGroupTaskId}
        animationType="fade"
        onRequestClose={() => setFocusGroupTaskId(null)}
      >
        <View style={[styles.focusContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {/* Task name pinned at top */}
          <View style={styles.focusHeader}>
            <Text style={styles.focusTitle} numberOfLines={2}>
              {focusGroupTaskData?.title || ''}
            </Text>
            <Text style={styles.focusMeta}>
              {focusGroupTaskData?.estimated_duration_min}min · {focusGroupTaskData?.priority?.toUpperCase()}
            </Text>
          </View>

          <View style={styles.focusContent}>
            {(() => {
              const estSec = (focusGroupTaskData?.estimated_duration_min || 0) * 60;
              const isGRunning = !!focusGroupCompletion?.timer_started_at;
              const isGOver = focusGroupSeconds > estSec;
              const ringColor = isGOver ? Colors.red : isGRunning ? Colors.accent : Colors.textSecondary;
              const circumference = 2 * Math.PI * 140;
              const offset = circumference * (1 - Math.min(focusGroupSeconds / Math.max(estSec, 1), 1));
              return (
                <View style={styles.ringContainer}>
                  <Svg width={320} height={320} viewBox="0 0 320 320">
                    <Circle cx={160} cy={160} r={140} stroke={Colors.border} strokeWidth={14} fill="none" />
                    <Circle
                      cx={160} cy={160} r={140}
                      stroke={ringColor}
                      strokeWidth={14}
                      fill="none"
                      strokeDasharray={`${circumference}`}
                      strokeDashoffset={`${offset}`}
                      strokeLinecap="round"
                      transform="rotate(-90 160 160)"
                    />
                  </Svg>
                  <View style={styles.ringCenter}>
                    <Text style={[styles.focusTimer, { color: ringColor }]}>
                      {fmtSec(focusGroupSeconds)}
                    </Text>
                    <Text style={styles.focusEstimate}>/ {fmtSec(estSec)}</Text>
                  </View>
                </View>
              );
            })()}
          </View>

          <View style={styles.focusActions}>
            <TouchableOpacity style={styles.focusBtnClose} onPress={() => setFocusGroupTaskId(null)}>
              <Minimize2 color={Colors.textMuted} size={18} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.focusBtn, focusGroupCompletion?.timer_started_at ? styles.focusBtnStop : styles.focusBtnStart]}
              onPress={() => {
                if (!focusGroupCompletion) return;
                if (focusGroupCompletion.timer_started_at) {
                  stopGroupTimer(focusGroupCompletion.id);
                } else {
                  startGroupTimer(focusGroupCompletion.id);
                }
              }}
            >
              {focusGroupCompletion?.timer_started_at ? (
                <Square color={Colors.textPrimary} size={20} fill={Colors.textPrimary} />
              ) : (
                <Play color={Colors.textPrimary} size={20} fill={Colors.textPrimary} />
              )}
              <Text style={styles.focusBtnText}>
                {focusGroupCompletion?.timer_started_at ? 'Pause' : 'Start'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.focusBtnComplete,
                !(focusGroupTaskData?.require_photo || focusGroupTaskData?.require_checkin)
                  && { backgroundColor: Colors.green },
              ]}
              onPress={async () => {
                setFocusGroupTaskId(null);
                if (focusGroupTaskData?.require_photo || focusGroupTaskData?.require_checkin) return;
                if (!focusGroupCompletion || !focusGroupTaskData) return;
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                await completeGroupTask(
                  focusGroupCompletion.id,
                  focusGroupTaskData.id,
                  focusGroupTaskData.group_id,
                );
              }}
            >
              {focusGroupTaskData?.require_photo || focusGroupTaskData?.require_checkin ? (
                <>
                  <Minimize2 color={Colors.textPrimary} size={20} />
                  <Text style={styles.focusBtnText}>Back</Text>
                </>
              ) : (
                <>
                  <Check color={Colors.textPrimary} size={20} />
                  <Text style={styles.focusBtnText}>Done</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Task Detail Modal */}
      <Modal visible={!!selectedTask} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedTask?.title}</Text>
              <TouchableOpacity onPress={() => setSelectedTask(null)}>
                <X color={Colors.textPrimary} size={22} />
              </TouchableOpacity>
            </View>

            {selectedTask?.notes ? (
              <Text style={styles.detailNotes}>{selectedTask.notes}</Text>
            ) : null}

            <View style={styles.detailGrid}>
              <View style={styles.detailItem}>
                <Clock color={Colors.textMuted} size={16} />
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>{selectedTask?.estimated_duration_min}min</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Priority</Text>
                <Text style={[styles.detailValue, {
                  color: selectedTask?.priority === 'urgent' ? Colors.priorityUrgent :
                    selectedTask?.priority === 'important' ? Colors.priorityImportant : Colors.priorityLow
                }]}>{selectedTask?.priority}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Time Block</Text>
                <Text style={styles.detailValue}>{selectedTask?.time_block}</Text>
              </View>
            </View>

            <View style={styles.detailFlags}>
              {selectedTask?.require_photo && (
                <View style={styles.flagItem}>
                  <Camera color={Colors.accent} size={16} />
                  <Text style={styles.flagText}>Photo proof required</Text>
                </View>
              )}
              {selectedTask?.require_checkin && (
                <View style={styles.flagItem}>
                  <CheckCircle color={Colors.accent} size={16} />
                  <Text style={styles.flagText}>
                    Check-in required{selectedTask.checkin_time
                      ? ` · ${selectedTask.checkin_time} · ${selectedTask.checkin_buffer_min ?? 15}min window`
                      : ''}
                  </Text>
                </View>
              )}
              {selectedTask?.repeat_cycle && (
                <View style={styles.flagItem}>
                  <Text style={styles.flagText}>
                    🔄 {selectedTask.repeat_cycle === 'custom' && selectedTask.repeat_interval_days
                      ? `every ${selectedTask.repeat_interval_days} day${selectedTask.repeat_interval_days > 1 ? 's' : ''}`
                      : selectedTask.repeat_cycle}
                  </Text>
                </View>
              )}
            </View>

            {selectedTask?.status && (
              <View style={[styles.statusBadge, {
                backgroundColor: selectedTask.status === 'pending' ? Colors.gold + '15' : Colors.green + '15',
              }]}>
                <Text style={[styles.statusText, {
                  color: selectedTask.status === 'pending' ? Colors.gold : Colors.green,
                }]}>
                  {selectedTask.status === 'pending' ? '🗳️ Waiting for votes' : '✅ Approved'}
                </Text>
              </View>
            )}

            {/* Member completion list */}
            {selectedTask?.all_completions && selectedTask.all_completions.length > 0 && (
              <View style={styles.memberProgress}>
                <Text style={styles.memberProgressTitle}>Member Progress</Text>
                {selectedTask.all_completions.map((c: any) => {
                  const name = c.profile?.name || c.profile?.email?.split('@')[0] || 'Unknown';
                  const isDone = c.status === 'done';
                  const completedTime = c.completed_at
                    ? new Date(c.completed_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : null;
                  return (
                    <View key={c.id} style={styles.memberProgressItem}>
                      <AvatarImage
                        size={32}
                        name={name}
                        avatarUrl={c.profile?.avatar_url ?? null}
                        style={{ marginRight: 10, borderWidth: 2, borderColor: isDone ? Colors.green : Colors.border }}
                      />
                      <View style={styles.memberProgressInfo}>
                        <Text style={[styles.memberProgressName, isDone && { color: Colors.green }]}>{name}</Text>
                        {isDone && completedTime && (
                          <Text style={styles.memberProgressTime}>✅ {completedTime} · +{c.xp_earned} XP</Text>
                        )}
                        {!isDone && c.status === 'doing' && (
                          <Text style={styles.memberProgressTime}>⏱️ In progress</Text>
                        )}
                        {!isDone && c.status === 'todo' && (
                          <Text style={styles.memberProgressTime}>⏳ Not started</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
//abc
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingText: { color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4, marginRight: 10 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  headerSub: { fontSize: 12, color: Colors.textMuted },
  codeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary,
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
  },
  codeBtnText: { fontSize: 12, fontWeight: '600', color: Colors.accent, letterSpacing: 1 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 4 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 8,
  },
  tabActive: { backgroundColor: Colors.accent + '15' },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.accent },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  proposalCard: {
    backgroundColor: Colors.primary, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  proposalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  proposalTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 8 },
  priorityText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  proposalMeta: { marginTop: 8 },
  proposalMetaText: { fontSize: 12, color: Colors.textMuted },
  voteRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  voteCount: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  voteYes: { fontSize: 13, color: Colors.green, fontWeight: '600' },
  voteNo: { fontSize: 13, color: Colors.priorityUrgent, fontWeight: '600' },
  voteNeeded: { fontSize: 11, color: Colors.textMuted },
  voteButtons: { flexDirection: 'row', gap: 8 },
  voteBtn: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  voteBtnActiveYes: { backgroundColor: Colors.green + '20', borderColor: Colors.green },
  voteBtnActiveNo: { backgroundColor: Colors.priorityUrgent + '20', borderColor: Colors.priorityUrgent },
  proposerLabel: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },
  emptyTasks: { alignItems: 'center', paddingVertical: 20 },
  emptyTasksText: { fontSize: 14, color: Colors.textMuted },
  emptyTasksSub: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  taskCard: {
    backgroundColor: Colors.primary, borderRadius: 10, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  taskCardDone: { opacity: 0.6 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  taskTitleDone: { fontSize: 14, color: Colors.textMuted, textDecorationLine: 'line-through' },
  taskXP: { fontSize: 13, fontWeight: '600', color: Colors.gold, marginTop: 4 },
  taskActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  timerArea: { alignItems: 'flex-end', gap: 4 },
  timerBtns: { flexDirection: 'row', gap: 4 },
  timerBtn: {
    padding: 8, borderRadius: 8, backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.border,
  },
  completeBtn: {
    padding: 8, borderRadius: 8, backgroundColor: Colors.green + '15',
    borderWidth: 1, borderColor: Colors.green + '30',
  },
  taskMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },
  checkinBadge: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  checkinBadgeOpen: { fontSize: 11, fontWeight: '600', marginTop: 4, color: Colors.textMuted },
  upcomingCard: { opacity: 0.75, borderStyle: 'dashed' },
  checkinBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
    marginBottom: 8,
  },
  checkinBannerLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  checkinBannerTime: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  checkinBannerStatus: { fontSize: 11, fontWeight: '700' },
  checkinCompleteBtn: { width: 40, height: 40, borderRadius: 8 },
  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.priorityUrgent + '40',
  },
  leaveBtnText: { fontSize: 14, fontWeight: '600', color: Colors.priorityUrgent },
  fab: {
    position: 'absolute', bottom: 24, right: 20, width: 58, height: 58, borderRadius: 29,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  groupDesc: { fontSize: 14, color: Colors.textSecondary, marginBottom: 16, lineHeight: 20 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoLabel: { fontSize: 14, color: Colors.textMuted },
  infoCodeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoCode: { fontSize: 16, fontWeight: '700', color: Colors.accent, letterSpacing: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.gold },
  membersTitle: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary, marginBottom: 12 },
  membersList: { maxHeight: 300, marginBottom: 16 },
  memberItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  memberAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.accent + '20',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  memberAvatarText: { fontSize: 16, fontWeight: '700', color: Colors.accent },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  memberEmail: { fontSize: 12, color: Colors.textMuted },
  adminBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: Colors.gold + '20' },
  adminBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.gold },
  detailNotes: { fontSize: 14, color: Colors.textSecondary, marginBottom: 16, lineHeight: 20 },
  detailGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  detailItem: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: 10, padding: 12,
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border,
  },
  detailLabel: { fontSize: 11, color: Colors.textMuted },
  detailValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  detailFlags: { gap: 8, marginBottom: 16 },
  flagItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flagText: { fontSize: 14, color: Colors.textSecondary },
  statusBadge: { padding: 12, borderRadius: 10, alignItems: 'center' },
  statusText: { fontSize: 14, fontWeight: '600' },
  // Member progress on task cards
  progressRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  progressText: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  memberDots: { flexDirection: 'row', gap: 4 },
  memberDot: {
    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  memberDotText: { fontSize: 10, fontWeight: '700', color: Colors.textPrimary },
  // Member progress in detail modal
  memberProgress: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  memberProgressTitle: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary, marginBottom: 10 },
  memberProgressItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  memberProgressDot: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  memberProgressDotText: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  memberProgressInfo: { flex: 1 },
  memberProgressName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  memberProgressTime: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  // Photo preview modal
  photoPreview: { width: '100%', height: 260, borderRadius: 12, marginBottom: 16 },
  photoPreviewActions: { flexDirection: 'row', gap: 12, width: '100%' },
  photoRetakeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  photoRetakeBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  photoConfirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: Colors.green, alignItems: 'center',
  },
  photoConfirmBtnText: { fontSize: 15, fontWeight: '700', color: Colors.background },
  // Check-in modal
  checkinDesc: { fontSize: 14, color: Colors.textSecondary, marginBottom: 12, lineHeight: 20 },
  checkinInput: {
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, padding: 14, fontSize: 15, color: Colors.textPrimary,
    minHeight: 100, marginBottom: 16,
  },
  checkinSubmitBtn: {
    backgroundColor: Colors.accent, paddingVertical: 14, borderRadius: 10, alignItems: 'center',
  },
  checkinSubmitBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  // Focus timer modal
  focusContainer: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 24 },
  focusBtnClose: { width: 48, height: 56, borderRadius: 14, backgroundColor: Colors.primary, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  focusHeader: { alignItems: 'center', paddingTop: 8, paddingBottom: 16 },
  focusContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  focusTitle: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', lineHeight: 32, marginBottom: 8 },
  focusMeta: { fontSize: 14, color: Colors.textMuted, marginBottom: 0 },
  ringContainer: { width: 320, height: 320, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  focusTimer: { fontSize: 52, fontWeight: '700', color: Colors.textSecondary, fontVariant: ['tabular-nums'], letterSpacing: 2 },
  focusEstimate: { fontSize: 16, color: Colors.textMuted, marginTop: 8 },
  focusActions: { flexDirection: 'row', gap: 12, paddingBottom: 24 },
  focusBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderRadius: 16 },
  focusBtnStart: { backgroundColor: Colors.accent },
  focusBtnStop: { backgroundColor: Colors.red },
  focusBtnComplete: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderRadius: 16, backgroundColor: Colors.primary, borderWidth: 1, borderColor: Colors.border },
  focusBtnText: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
});