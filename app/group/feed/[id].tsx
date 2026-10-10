import { useLocalSearchParams, useRouter } from 'expo-router';
import AvatarImage from '../../../components/AvatarImage';
import {
  ArrowLeft,
  BarChart3,
  Camera,
  Flame,
  type LucideIcon,
  MapPin,
  MessageCircle,
  Pin,
  Send,
  UserPlus,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopEdgeOnly } from '../../../constants/safeArea';
import { Colors } from '../../../constants/Colors';
import { Fonts, Spacing } from '../../../constants/theme';
import { useGroupStore } from '../../../lib/groupStore';
import { useStore } from '../../../lib/store';
import { FeedItem } from '../../../types';

const REACTION_EMOJIS = ['🔥', '💪', '🎉', '👏', '❤️'];
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function FeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useStore();
  const {
    currentGroup,
    feedItems,
    fetchFeed,
    fetchGroupDetail,
    subscribeToFeed,
    addFeedReaction,
    removeFeedReaction,
    addFeedComment,
  } = useGroupStore();

  const [refreshing, setRefreshing] = useState(false);
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const userId = session?.user?.id;

  useEffect(() => {
    if (id) {
      fetchGroupDetail(id);
      fetchFeed(id);
      const unsub = subscribeToFeed(id);
      return unsub;
    }
  }, [id]);

  const onRefresh = useCallback(async () => {
    if (!id) return;
    setRefreshing(true);
    await fetchFeed(id);
    setRefreshing(false);
  }, [id]);

  const handleReaction = async (feedItemId: string, emoji: string) => {
    const item = feedItems.find((f) => f.id === feedItemId);
    const myReaction = item?.reactions?.find(
      (r) => r.user_id === userId && r.emoji === emoji
    );
    if (myReaction) {
      await removeFeedReaction(feedItemId, emoji);
    } else {
      await addFeedReaction(feedItemId, emoji);
    }
  };

  const handleComment = async (feedItemId: string) => {
    if (!commentText.trim()) return;
    await addFeedComment(feedItemId, commentText.trim());
    setCommentText('');
    setCommentingOn(null);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getFeedIcon = (type: string): LucideIcon => {
    switch (type) {
      case 'photo_checkin': return Camera;
      case 'checkin_completed': return MapPin;
      case 'checkin_summary': return BarChart3;
      case 'streak': return Flame;
      case 'joined': return UserPlus;
      default: return Pin;
    }
  };

  const renderFeedItem = ({ item }: { item: FeedItem }) => {
    const authorName = item.author?.name || item.author?.email?.split('@')[0] || 'Unknown';
    const FeedIcon = getFeedIcon(item.type);
    const reactions = item.reactions || [];
    const comments = item.comments || [];

    const reactionGroups: { [emoji: string]: { count: number; isMine: boolean } } = {};
    reactions.forEach((r) => {
      if (!reactionGroups[r.emoji]) {
        reactionGroups[r.emoji] = { count: 0, isMine: false };
      }
      reactionGroups[r.emoji].count++;
      if (r.user_id === userId) reactionGroups[r.emoji].isMine = true;
    });

    return (
      <View style={styles.feedCard}>
        <View style={styles.feedHeader}>
          <AvatarImage
            size={36}
            name={authorName}
            avatarUrl={item.author?.avatar_url ?? null}
            style={{ marginRight: Spacing.md }}
          />
          <View style={styles.feedHeaderInfo}>
            <Text style={styles.feedAuthor}>{authorName}</Text>
            <Text style={styles.feedTime}>{formatTime(item.created_at)}</Text>
          </View>
          <FeedIcon color={Colors.textMuted} size={16} />
        </View>

        <Text style={styles.feedContentText}>
          {item.type === 'checkin_summary'
            ? (() => { try { const d = JSON.parse(item.content || '{}'); return `Check-in closed: "${d.task}"`; } catch { return item.content || ''; } })()
            : (item.content || `${authorName} ${item.type.replace('_', ' ')}`)}
        </Text>

        {/* Check-in summary dots */}
        {item.type === 'checkin_summary' && item.content && (() => {
          try {
            const data = JSON.parse(item.content);
            const completions: any[] = data.completions || [];
            if (completions.length === 0) return null;
            return (
              <View style={styles.summaryRow}>
                {completions.map((c: any) => {
                  const dotColor = c.status === 'done'
                    ? (c.lateCheckin ? '#FF9500' : Colors.green)
                    : Colors.priorityUrgent;
                  return (
                    <View key={c.userId} style={styles.summaryMember}>
                      <View style={[styles.summaryDot, { borderColor: dotColor }]}>
                        <AvatarImage size={26} name={c.name} avatarUrl={c.avatarUrl} />
                      </View>
                      <Text style={styles.summaryName} numberOfLines={1}>{c.name.split(' ')[0]}</Text>
                    </View>
                  );
                })}
              </View>
            );
          } catch { return null; }
        })()}

        {/* Check-in note */}
        {item.checkin_note && (
          <View style={styles.checkinNote}>
            <Text style={styles.checkinNoteText}>"{item.checkin_note}"</Text>
          </View>
        )}

        {/* Photo display */}
        {item.photo_url && (
          <Image
            source={{ uri: item.photo_url }}
            style={styles.feedPhoto}
            resizeMode="cover"
          />
        )}

        {item.xp_earned > 0 && (
          <Text style={styles.feedXP}>+{item.xp_earned} XP</Text>
        )}

        <View style={styles.reactionsRow}>
          {REACTION_EMOJIS.map((emoji) => {
            const group = reactionGroups[emoji];
            return (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.reactionBtn,
                  group?.isMine && styles.reactionBtnActive,
                ]}
                onPress={() => handleReaction(item.id, emoji)}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                {group && (
                  <Text style={[
                    styles.reactionCount,
                    group.isMine && styles.reactionCountActive,
                  ]}>
                    {group.count}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={styles.commentBtn}
            onPress={() => setCommentingOn(commentingOn === item.id ? null : item.id)}
          >
            <MessageCircle color={Colors.textMuted} size={16} />
            {comments.length > 0 && (
              <Text style={styles.commentCount}>{comments.length}</Text>
            )}
          </TouchableOpacity>
        </View>

        {comments.length > 0 && (
          <View style={styles.commentsSection}>
            {comments.map((c) => (
              <View key={c.id} style={styles.commentItem}>
                <Text style={styles.commentAuthor}>
                  {c.author?.name || c.author?.email?.split('@')[0] || 'Unknown'}
                </Text>
                <Text style={styles.commentText}>{c.content}</Text>
              </View>
            ))}
          </View>
        )}

        {commentingOn === item.id && (
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor={Colors.textMuted}
              value={commentText}
              onChangeText={setCommentText}
              autoFocus
            />
            <TouchableOpacity
              style={styles.commentSendBtn}
              onPress={() => handleComment(item.id)}
              disabled={!commentText.trim()}
            >
              <Send
                color={commentText.trim() ? Colors.accent : Colors.textMuted}
                size={16}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={TopEdgeOnly}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={Colors.textPrimary} size={22} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            📰 {currentGroup?.name || 'Feed'}
          </Text>
          <Text style={styles.headerSub}>Activity feed</Text>
        </View>
      </View>

      <FlatList
        data={feedItems}
        keyExtractor={(item) => item.id}
        renderItem={renderFeedItem}
        style={styles.feedList}
        contentContainerStyle={styles.feedListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
        ListEmptyComponent={
          <View style={styles.emptyFeed}>
            <Text style={styles.emptyFeedEmoji}>📰</Text>
            <Text style={styles.emptyFeedText}>No activity yet</Text>
            <Text style={styles.emptyFeedSub}>
              Complete group tasks to see updates here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.md },
  headerCenter: { flex: 1 },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 17, color: Colors.textPrimary },
  headerSub: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted },
  feedList: { flex: 1 },
  feedListContent: { padding: Spacing.lg, paddingBottom: Spacing.xxxxl },
  emptyFeed: { alignItems: 'center', paddingTop: Spacing.hero },
  emptyFeedEmoji: { fontFamily: Fonts.regular, fontSize: 40, marginBottom: Spacing.sm },
  emptyFeedText: { fontFamily: Fonts.semibold, fontSize: 16, color: Colors.textPrimary },
  emptyFeedSub: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted, marginTop: Spacing.xs, textAlign: 'center' },
  feedCard: {
    backgroundColor: Colors.primary, borderRadius: 12, padding: Spacing.lg,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  feedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  feedAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accentSubtle,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  feedAvatarText: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.accent },
  feedHeaderInfo: { flex: 1 },
  feedAuthor: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.textPrimary },
  feedTime: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted },
  feedContentText: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textPrimary, lineHeight: 20, marginBottom: Spacing.sm },
  feedPhoto: {
    width: SCREEN_WIDTH - 62,
    height: 250,
    borderRadius: 10,
    marginBottom: Spacing.md,
    backgroundColor: Colors.border,
  },
  feedXP: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.gold, marginBottom: Spacing.sm },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  reactionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  reactionBtnActive: { borderColor: Colors.accent, backgroundColor: Colors.accentSubtle },
  reactionEmoji: { fontFamily: Fonts.regular, fontSize: 14 },
  reactionCount: { fontFamily: Fonts.semibold, fontSize: 12, color: Colors.textMuted},
  reactionCountActive: { color: Colors.accent },
  commentBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  commentCount: { fontFamily: Fonts.semibold, fontSize: 12, color: Colors.textMuted},
  commentsSection: {
    marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  commentItem: { marginBottom: Spacing.sm },
  commentAuthor: { fontFamily: Fonts.semibold, fontSize: 12, color: Colors.accent },
  commentText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textPrimary, marginTop: Spacing.xxs },
  commentInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md,
  },
  commentInput: {
    flex: 1, backgroundColor: Colors.background, borderRadius: 16,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, fontFamily: Fonts.regular, fontSize: 14,
    color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border,
  },
  commentSendBtn: { padding: Spacing.sm },
  checkinNote: {
    borderLeftWidth: 3, borderLeftColor: Colors.accent,
    paddingLeft: Spacing.md, paddingVertical: Spacing.xs, marginBottom: Spacing.sm,
    backgroundColor: Colors.accentFaint, borderRadius: 4,
  },
  checkinNoteText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 18 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.md },
  summaryMember: { alignItems: 'center', gap: Spacing.xs },
  summaryDot: { borderWidth: 2, borderRadius: 16, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  summaryName: { fontFamily: Fonts.regular, fontSize: 10, color: Colors.textMuted, maxWidth: 48, textAlign: 'center' },
});