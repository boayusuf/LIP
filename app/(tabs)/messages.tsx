import { useRouter } from 'expo-router';
import { Edit } from 'lucide-react-native';
import { useCallback, useEffect } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AvatarImage from '../../components/AvatarImage';
import { Colors } from '../../constants/Colors';
import { useGroupStore } from '../../lib/groupStore';
import { useStore } from '../../lib/store';

export default function MessagesScreen() {
  const router = useRouter();
  const { session } = useStore();
  const { dmGroups, fetchDMs } = useGroupStore();
  const userId = session?.user?.id;

  useEffect(() => { fetchDMs(); }, []);

  const onRefresh = useCallback(async () => { await fetchDMs(); }, []);

  const getOtherMember = (group: any) => {
    const members = group.members || [];
    return members.find((m: any) => m.user_id !== userId);
  };

  const getOtherName = (group: any) => {
    const other = getOtherMember(group);
    return other?.profile?.name || other?.profile?.email?.split('@')[0] || 'Unknown';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/dm/new')}>
          <Edit color={Colors.accent} size={22} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={dmGroups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={Colors.accent} />}
        renderItem={({ item }) => {
          const other = getOtherMember(item);
          const name = getOtherName(item);
          return (
            <TouchableOpacity
              style={styles.dmItem}
              onPress={() => router.push(`/dm/${item.id}`)}
            >
              <AvatarImage
                size={48}
                name={name}
                avatarUrl={other?.profile?.avatar_url ?? null}
                style={{ marginRight: 14 }}
              />
              <View style={styles.dmInfo}>
                <Text style={styles.dmName}>{name}</Text>
                <Text style={styles.dmSub}>{other?.profile?.email || ''}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySub}>Tap the pencil icon to start a DM</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  newBtn: { padding: 6 },
  listContent: { paddingHorizontal: 16 },
  dmItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  dmInfo: { flex: 1 },
  dmName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  dmSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  emptySub: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
});
