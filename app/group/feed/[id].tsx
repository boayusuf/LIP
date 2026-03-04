import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react-native';
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
import { Colors } from '../../../constants/Colors';
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

  const getFeedIcon = (type: string) => {
    switch (type) {
      case 'task_completed': return '✅';
      case 'photo_checkin': return '📸';
      case 'streak': return '🔥';
      case 'joined': return '👋';
      default: return '📌';
    }
  };

  const renderFeedItem = ({ item }: { item: FeedItem }) => {
    const authorName = item.author?.name || item.author?.email?.split('@')[0] || 'Unknown';
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
          <View style={styles.feedAvatar}>
            <Text style={styles.feedAvatarText}>
              {authorName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.feedHeaderInfo}>
            <Text style={styles.feedAuthor}>{authorName}</Text>
            <Text style={styles.feedTime}>{formatTime(item.created_at)}</Text>
          </View>
          <Text style={styles.feedTypeIcon}>{getFeedIcon(item.type)}</Text>
        </View>

        <Text style={styles.feedContentText}>
          {item.content || `${authorName} ${item.type.replace('_', ' ')}`}
        </Text>

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
    <SafeAreaView style={styles.container} edges={['top']}>
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
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4, marginRight: 10 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  headerSub: { fontSize: 12, color: Colors.textMuted },
  feedList: { flex: 1 },
  feedListContent: { padding: 16, paddingBottom: 40 },
  emptyFeed: { alignItems: 'center', paddingTop: 80 },
  emptyFeedEmoji: { fontSize: 40, marginBottom: 8 },
  emptyFeedText: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptyFeedSub: { fontSize: 13, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  feedCard: {
    backgroundColor: Colors.primary, borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
  },
  feedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  feedAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accent + '20',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  feedAvatarText: { fontSize: 14, fontWeight: '700', color: Colors.accent },
  feedHeaderInfo: { flex: 1 },
  feedAuthor: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  feedTime: { fontSize: 11, color: Colors.textMuted },
  feedTypeIcon: { fontSize: 18 },
  feedContentText: { fontSize: 15, color: Colors.textPrimary, lineHeight: 20, marginBottom: 8 },
  feedPhoto: {
    width: SCREEN_WIDTH - 62,
    height: 250,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: Colors.border,
  },
  feedXP: { fontSize: 13, fontWeight: '600', color: Colors.gold, marginBottom: 8 },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  reactionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  reactionBtnActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '15' },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  reactionCountActive: { color: Colors.accent },
  commentBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  commentCount: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  commentsSection: {
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  commentItem: { marginBottom: 8 },
  commentAuthor: { fontSize: 12, fontWeight: '600', color: Colors.accent },
  commentText: { fontSize: 13, color: Colors.textPrimary, marginTop: 1 },
  commentInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10,
  },
  commentInput: {
    flex: 1, backgroundColor: Colors.background, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 14,
    color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border,
  },
  commentSendBtn: { padding: 6 },
});