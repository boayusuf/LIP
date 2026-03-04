import { useRouter } from 'expo-router';
import { LogIn, Plus, Users, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useGroupStore } from '../../lib/groupStore';

export default function GroupsScreen() {
  const router = useRouter();
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
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    setSaving(true);
    const { error } = await createGroup(groupName.trim(), groupDesc.trim());
    setSaving(false);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setGroupName('');
    setGroupDesc('');
    setShowCreateModal(false);
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }
    setSaving(true);
    const { error } = await joinGroup(inviteCode.trim());
    setSaving(false);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setInviteCode('');
    setShowJoinModal(false);
  };

  const regularGroups = groups.filter((g) => !g.is_dm);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptySubtitle}>Create a group or join one with an invite code</Text>
            <View style={styles.emptyButtons}>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => setShowCreateModal(true)}
              >
                <Plus color={Colors.textPrimary} size={18} />
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
        <View style={styles.modalContainer}>
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
        <View style={styles.modalContainer}>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
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
    textAlign: 'center',
  },
  emptyButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  emptyBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.accent,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  groupDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupMemberCount: {
    fontSize: 13,
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalSaveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: Colors.accent,
    borderRadius: 8,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalContent: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 20,
  },
  modalInput: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  modalInputMultiline: {
    minHeight: 80,
    paddingTop: 14,
  },
  codeInput: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 4,
  },
  modalNote: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalNoteText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});