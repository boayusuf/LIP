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
  MessageCircle,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useGroupStore } from '../../lib/groupStore';
import { useStore } from '../../lib/store';

type Tab = 'tasks' | 'chat' | 'feed';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showVotes, setShowVotes] = useState(true);
  const [showActive, setShowActive] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showFullyCompleted, setShowFullyCompleted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchGroupDetail(id);
      fetchProposals(id);
      fetchGroupTasks(id);
    }
  }, [id]);

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

  const myActiveTasks = groupTasks.filter((t) => t.my_completion?.status !== 'done');
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
            {memberCount} members{(currentGroup as any).group_streak > 0 ? ` · 🔥 ${(currentGroup as any).group_streak} day streak` : ''} · tap for info
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
              return (
                <TouchableOpacity key={task.id} style={styles.taskCard} onPress={() => setSelectedTask(task)}>
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <View style={styles.taskActions}>
                      {isRunning ? (
                        <TouchableOpacity style={styles.timerBtn} onPress={() => stopGroupTimer(completion.id)}>
                          <Square color={Colors.priorityUrgent} size={16} />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity style={styles.timerBtn} onPress={() => startGroupTimer(completion.id)}>
                          <Play color={Colors.green} size={16} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.completeBtn}
                        onPress={async () => {
                          if (task.require_photo) {
                            Alert.alert('Photo Proof', 'Choose photo source', [
                              {
                                text: 'Camera',
                                onPress: async () => {
                                  const perm = await ImagePicker.requestCameraPermissionsAsync();
                                  if (!perm.granted) {
                                    Alert.alert('Permission needed', 'Please allow camera access in settings');
                                    return;
                                  }
                                  const result = await ImagePicker.launchCameraAsync({
                                    quality: 0.7,
                                    allowsEditing: false,
                                  });
                                  if (!result.canceled && result.assets[0]) {
                                    await completeGroupTask(completion.id, task.id, task.group_id, result.assets[0].uri);
                                  }
                                },
                              },
                              {
                                text: 'Gallery',
                                onPress: async () => {
                                  const result = await ImagePicker.launchImageLibraryAsync({
                                    mediaTypes: ['images'],
                                    quality: 0.7,
                                    allowsEditing: false,
                                  });
                                  if (!result.canceled && result.assets[0]) {
                                    await completeGroupTask(completion.id, task.id, task.group_id, result.assets[0].uri);
                                  }
                                },
                              },
                              { text: 'Cancel', style: 'cancel' },
                            ]);
                          } else {
                            await completeGroupTask(completion.id, task.id, task.group_id);
                          }
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
                    {task.require_checkin ? ' · ✅' : ''}
                  </Text>
                  {/* Member progress */}
                  <View style={styles.progressRow}>
                    <Text style={styles.progressText}>{doneCount}/{totalCount} completed</Text>
                    <View style={styles.memberDots}>
                      {allCompletions.map((c: any) => (
                        <View
                          key={c.id}
                          style={[
                            styles.memberDot,
                            { backgroundColor: c.status === 'done' ? Colors.green : Colors.border },
                          ]}
                        >
                          <Text style={styles.memberDotText}>
                            {(c.profile?.name || c.profile?.email?.split('@')[0] || '?').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ))}
        </View>

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
                          style={[styles.memberDot, { backgroundColor: c.status === 'done' ? Colors.green : Colors.border }]}
                        >
                          <Text style={styles.memberDotText}>
                            {(c.profile?.name || c.profile?.email?.split('@')[0] || '?').charAt(0).toUpperCase()}
                          </Text>
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

        {/* Leave */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
            <LogOut color={Colors.priorityUrgent} size={16} />
            <Text style={styles.leaveBtnText}>Leave Group</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push(`/group/propose/${id}`)}
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

            <Text style={styles.membersTitle}>Members ({memberCount})</Text>
            <ScrollView style={styles.membersList}>
              {members.map((m: any) => (
                <View key={m.id} style={styles.memberItem}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {getMemberName(m).charAt(0).toUpperCase()}
                    </Text>
                  </View>
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
                  <Text style={styles.flagText}>Check-in required</Text>
                </View>
              )}
              {selectedTask?.repeat_cycle && (
                <View style={styles.flagItem}>
                  <Text style={styles.flagText}>🔄 Repeats: {selectedTask.repeat_cycle}</Text>
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
                      <View style={[styles.memberProgressDot, { backgroundColor: isDone ? Colors.green : Colors.border }]}>
                        <Text style={styles.memberProgressDotText}>{name.charAt(0).toUpperCase()}</Text>
                      </View>
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
  taskActions: { flexDirection: 'row', gap: 8 },
  timerBtn: {
    padding: 8, borderRadius: 8, backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.border,
  },
  completeBtn: {
    padding: 8, borderRadius: 8, backgroundColor: Colors.green + '15',
    borderWidth: 1, borderColor: Colors.green + '30',
  },
  taskMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },
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
});