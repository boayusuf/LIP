import { useRouter } from 'expo-router';
import { LogIn, Plus, Users, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { showAlert } from '../../lib/alert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopEdgeOnly } from '../../constants/safeArea';
import { Colors } from '../../constants/Colors';
import { Fonts, Radius, Spacing } from '../../constants/theme';
import { useGroupStore } from '../../lib/groupStore';

export default function GroupsScreen() {
  const router = useRouter();
  // The create and join sheets below are presentationStyle="pageSheet", which
  // react-native-web's Modal ignores -- it renders position: fixed at all four
  // offsets, so the sheet covers the status bar and its header goes under the
  // notch. The sheet reserves the insets itself.
  const insets = useSafeAreaInsets();
  const { groups, groupsLoading, fetchGroups, createGroup, joinGroup } = useGroupStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
  }, []);

  const handleCreate = async () => {
    if (!groupName.trim()) {
      showAlert('Error', 'Please enter a group name');
      return;
    }
    setSaving(true);
    const { error } = await createGroup(groupName.trim(), groupDesc.trim());
    setSaving(false);
    if (error) {
      showAlert('Error', error);
      return;
    }
    setGroupName('');
    setGroupDesc('');
    setShowCreateModal(false);
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      showAlert('Error', 'Please enter an invite code');
      return;
    }
    setSaving(true);
    const { error } = await joinGroup(inviteCode.trim());
    setSaving(false);
    if (error) {
      showAlert('Error', error);
      return;
    }
    setInviteCode('');
    setShowJoinModal(false);
  };

  const regularGroups = groups.filter((g) => !g.is_dm);

  return (
    <SafeAreaView style={styles.container} edges={TopEdgeOnly}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Groups</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowJoinModal(true)}
          >
            <LogIn color={Colors.accent} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowCreateModal(true)}
          >
            <Plus color={Colors.accent} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
      >
        {regularGroups.length === 0 && !groupsLoading ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Users color={Colors.textMuted} size={28} />
            </View>
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptySubtitle}>Create a group or join one with an invite code</Text>
            <View style={styles.emptyButtons}>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => setShowCreateModal(true)}
              >
                <Plus color={Colors.onAccent} size={18} />
                <Text style={styles.emptyBtnText}>Create Group</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.emptyBtn, styles.emptyBtnOutline]}
                onPress={() => setShowJoinModal(true)}
              >
                <LogIn color={Colors.accent} size={18} />
                <Text style={[styles.emptyBtnText, { color: Colors.accent }]}>Join Group</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          regularGroups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={styles.groupCard}
              onPress={() => router.push(`/group/${group.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.groupIcon}>
                <Text style={styles.groupIconText}>
                  {group.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{group.name}</Text>
                {group.description ? (
                  <Text style={styles.groupDesc} numberOfLines={1}>
                    {group.description}
                  </Text>
                ) : null}
              </View>
              <View style={styles.groupMeta}>
                <Users color={Colors.textMuted} size={14} />
                <Text style={styles.groupMemberCount}>{group.member_count}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Create Group Modal */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
        <View
          style={[
            styles.modalContainer,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <X color={Colors.textSecondary} size={24} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Group</Text>
            <TouchableOpacity onPress={handleCreate} disabled={saving} style={styles.modalSaveBtn}>
              <Text style={[styles.modalSaveText, saving && { opacity: 0.5 }]}>
                {saving ? 'Creating...' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.modalLabel}>Group Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Gym Bros, Study Squad"
              placeholderTextColor={Colors.textMuted}
              value={groupName}
              onChangeText={setGroupName}
              autoFocus
            />
            <Text style={styles.modalLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline]}
              placeholder="What's this group about?"
              placeholderTextColor={Colors.textMuted}
              value={groupDesc}
              onChangeText={setGroupDesc}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.modalNote}>
              <Text style={styles.modalNoteText}>
                You'll get an invite code to share with friends after creating the group.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Join Group Modal */}
      <Modal visible={showJoinModal} animationType="slide" presentationStyle="pageSheet">
        <View
          style={[
            styles.modalContainer,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowJoinModal(false)}>
              <X color={Colors.textSecondary} size={24} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Join Group</Text>
            <TouchableOpacity onPress={handleJoin} disabled={saving} style={styles.modalSaveBtn}>
              <Text style={[styles.modalSaveText, saving && { opacity: 0.5 }]}>
                {saving ? 'Joining...' : 'Join'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.modalLabel}>Invite Code</Text>
            <TextInput
              style={[styles.modalInput, styles.codeInput]}
              placeholder="Enter 8-character code"
              placeholderTextColor={Colors.textMuted}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <View style={styles.modalNote}>
              <Text style={styles.modalNoteText}>
                Ask a group member for their invite code to join.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontFamily: Fonts.bold, fontSize: 22,
    color: Colors.textPrimary,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.hero,
  },
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
  emptyTitle: {
    fontFamily: Fonts.semibold, fontSize: 18,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily: Fonts.regular, fontSize: 14,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  emptyButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xxl,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 10,
  },
  emptyBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  emptyBtnText: {
    fontFamily: Fonts.semibold, fontSize: 14,
    color: Colors.onAccent,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  groupIconText: {
    fontFamily: Fonts.bold, fontSize: 18,
    color: Colors.accent,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontFamily: Fonts.semibold, fontSize: 16,
    color: Colors.textPrimary,
  },
  groupDesc: {
    fontFamily: Fonts.regular, fontSize: 13,
    color: Colors.textMuted,
    marginTop: Spacing.xxs,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  groupMemberCount: {
    fontFamily: Fonts.regular, fontSize: 13,
    color: Colors.textMuted,
  },
  // Modals
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontFamily: Fonts.bold, fontSize: 17,
    color: Colors.textPrimary,
  },
  modalSaveBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.accent,
    borderRadius: 8,
  },
  modalSaveText: {
    fontFamily: Fonts.bold, fontSize: 14,
    color: Colors.onAccent,
  },
  modalContent: {
    padding: Spacing.xl,
  },
  modalLabel: {
    fontFamily: Fonts.semibold, fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  },
  modalInput: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    fontFamily: Fonts.regular, fontSize: 16,
    color: Colors.textPrimary,
  },
  modalInputMultiline: {
    minHeight: 80,
    paddingTop: Spacing.lg,
  },
  codeInput: {
    fontFamily: Fonts.semibold, fontSize: 20,
    textAlign: 'center',
    letterSpacing: 4,
  },
  modalNote: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalNoteText: {
    fontFamily: Fonts.regular, fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});