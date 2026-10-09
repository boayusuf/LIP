import { useRouter } from 'expo-router';
import {
  Edit,
  MessageCircle,
} from 'lucide-react-native';
import { useCallback, useEffect } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AvatarImage from '../../components/AvatarImage';
import { Colors } from '../../constants/Colors';
import { Fonts, Radius, Spacing } from '../../constants/theme';
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
                style={{ marginRight: Spacing.lg }}
              />
              <View style={styles.dmInfo}>
                <View style={styles.dmRow}>
                  <Text style={styles.dmName}>{name}</Text>
                  {item.last_message_at && (
                    <Text style={styles.dmTime}>
                      {new Date(item.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
                <Text style={styles.dmSub} numberOfLines={1}>
                  {item.last_message || other?.profile?.email || ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <MessageCircle color={Colors.textMuted} size={28} />
            </View>
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
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: Spacing.lg,
  },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 28, color: Colors.textPrimary },
  newBtn: { padding: Spacing.sm },
  listContent: { paddingHorizontal: Spacing.lg },
  dmItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  dmInfo: { flex: 1 },
  dmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dmName: { fontFamily: Fonts.semibold, fontSize: 16, color: Colors.textPrimary },
  dmTime: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted },
  dmSub: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted, marginTop: Spacing.xxs },
  empty: { alignItems: 'center', paddingTop: Spacing.hero },
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
  emptyTitle: { fontFamily: Fonts.semibold, fontSize: 17, color: Colors.textPrimary },
  emptySub: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted, marginTop: Spacing.xs },
});
