import { useLocalSearchParams, useRouter } from 'expo-router';
// eslint-disable-next-line deprecation/deprecation
import { Swipeable } from 'react-native-gesture-handler';
import {
  ArrowLeft,
  MessageCircle,
  Reply,
  Send,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopAndBottomEdges } from '../../../constants/safeArea';
import { Colors } from '../../../constants/Colors';
import { Fonts, Radius, Spacing } from '../../../constants/theme';
import { useGroupStore } from '../../../lib/groupStore';
import { useStore } from '../../../lib/store';
import { Message } from '../../../types';

const MENTION_REGEX = /@(\w*)$/;

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useStore();
  const {
    currentGroup,
    messages,
    fetchMessages,
    sendMessage,
    subscribeToMessages,
    fetchGroupDetail,
    markMessagesRead,
    setActiveChatGroupId,
  } = useGroupStore();

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  // eslint-disable-next-line deprecation/deprecation
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const userId = session?.user?.id;

  useEffect(() => {
    if (id) {
      setActiveChatGroupId(id);
      fetchGroupDetail(id);
      fetchMessages(id).then(() => markMessagesRead(id));
      const unsub = subscribeToMessages(id);
      return () => { setActiveChatGroupId(null); unsub(); };
    }
  }, [id]);

  useEffect(() => {
    if (messages.length > 0 && id) markMessagesRead(id);
  }, [messages.length]);

  // @mention autocomplete
  const mentionMatch = text.match(MENTION_REGEX);
  const partialMention = mentionMatch ? mentionMatch[1].toLowerCase() : null;
  const members = currentGroup?.members || [];

  const mentionSuggestions = useMemo(() => {
    if (partialMention === null) return [];
    return (members as any[]).filter((m) => {
      const name = (m.profile?.name || m.profile?.email?.split('@')[0] || '').toLowerCase();
      return m.user_id !== userId && name.startsWith(partialMention);
    }).slice(0, 5);
  }, [partialMention, members, userId]);

  const handleMentionSelect = (member: any) => {
    const name = member.profile?.name || member.profile?.email?.split('@')[0] || 'User';
    setText(text.replace(MENTION_REGEX, `@${name} `));
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    if (!text.trim() || !id) return;
    const msg = text.trim();
    setText('');
    await sendMessage(id, msg, replyTo?.id);
    setReplyTo(null);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMentions = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) =>
      /^@\w+$/.test(part) ? (
        <Text key={i} style={styles.mentionHighlight}>{part}</Text>
      ) : (
        <Text key={i}>{part}</Text>
      )
    );
  };

  const renderLeftActions = () => (
    <View style={styles.swipeAction}>
      <Reply color={Colors.accent} size={20} />
    </View>
  );

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.user_id === userId;
    const senderName = item.sender?.name || item.sender?.email?.split('@')[0] || 'Unknown';

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) swipeableRefs.current.set(item.id, ref);
          else swipeableRefs.current.delete(item.id);
        }}
        renderLeftActions={renderLeftActions}
        onSwipeableWillOpen={(direction: string) => {
          if (direction === 'left') {
            swipeableRefs.current.forEach((ref, msgId) => {
              if (msgId !== item.id) ref.close();
            });
            setReplyTo(item);
            inputRef.current?.focus();
            setTimeout(() => swipeableRefs.current.get(item.id)?.close(), 0);
          }
        }}
        friction={1.5}
        leftThreshold={35}
        overshootLeft={false}
        containerStyle={styles.swipeContainer}
      >
        <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
          <View style={[styles.msgBubble, isMine ? styles.msgBubbleMine : styles.msgBubbleOther]}>
            {!isMine && (
              <Text style={styles.msgSender}>{senderName}</Text>
            )}
            {item.reply_to && (
              <View style={styles.replyPreview}>
                <Text style={styles.replyName}>
                  {item.reply_to?.sender?.name || item.reply_to?.sender?.email?.split('@')[0] || 'Unknown'}
                </Text>
                <Text style={styles.replyText} numberOfLines={1}>
                  {item.reply_to.content}
                </Text>
              </View>
            )}
            <Text style={styles.msgText}>{renderMentions(item.content)}</Text>
            <View style={styles.msgFooter}>
              <Text style={[styles.msgTime, isMine && styles.msgTimeMine]}>{formatTime(item.created_at)}</Text>
              {isMine && (
                <Text style={[styles.readCheck, (item.read_by || []).some(uid => uid !== userId) && styles.readCheckDone]}>
                  {(item.read_by || []).some(uid => uid !== userId) ? '✓✓' : '✓'}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={TopAndBottomEdges}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={Colors.textPrimary} size={22} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {currentGroup?.name || 'Chat'}
          </Text>
          <Text style={styles.headerSub}>
            {currentGroup?.member_count || 0} members
          </Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <View style={styles.emptyChatIconWrap}>
              <MessageCircle color={Colors.textMuted} size={26} />
            </View>
            <Text style={styles.emptyChatText}>No messages yet</Text>
            <Text style={styles.emptyChatSub}>Send the first message!</Text>
          </View>
        }
      />

      {replyTo && (
        <View style={styles.replyBar}>
          <View style={styles.replyBarContent}>
            <Text style={styles.replyBarName}>
              Replying to {replyTo.sender?.name || replyTo.sender?.email?.split('@')[0] || 'Unknown'}
            </Text>
            <Text style={styles.replyBarText} numberOfLines={1}>
              {replyTo.content}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <X color={Colors.textMuted} size={18} />
          </TouchableOpacity>
        </View>
      )}

      {/* @mention suggestion overlay */}
      {mentionSuggestions.length > 0 && (
        <View style={styles.mentionOverlay}>
          <ScrollView keyboardShouldPersistTaps="always">
            {mentionSuggestions.map((m: any) => {
              const name = m.profile?.name || m.profile?.email?.split('@')[0] || 'User';
              return (
                <TouchableOpacity
                  key={m.user_id}
                  style={styles.mentionItem}
                  onPress={() => handleMentionSelect(m)}
                >
                  <Text style={styles.mentionName}>@{name}</Text>
                  {m.profile?.email && (
                    <Text style={styles.mentionEmail}>{m.profile.email}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim()}
          >
            <Send color={text.trim() ? Colors.onAccent : Colors.textMuted} size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  messageList: { flex: 1 },
  messageContent: { padding: Spacing.lg, paddingBottom: Spacing.sm },
  emptyChat: { alignItems: 'center', paddingTop: Spacing.hero },
  emptyChatIconWrap: {
    width: 60, height: 60, borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  emptyChatText: { fontFamily: Fonts.semibold, fontSize: 16, color: Colors.textPrimary },
  emptyChatSub: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted, marginTop: Spacing.xs },
  swipeContainer: { marginBottom: Spacing.sm },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    paddingLeft: Spacing.md,
  },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  msgRowMine: { flexDirection: 'row-reverse' },
  msgBubble: { maxWidth: '75%', borderRadius: 16, padding: Spacing.md, paddingHorizontal: Spacing.lg },
  msgBubbleMine: { backgroundColor: Colors.accent, borderBottomRightRadius: 4 },
  msgTextMine: { color: Colors.onAccent },
  msgBubbleOther: {
    backgroundColor: Colors.primary, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  msgSender: { fontFamily: Fonts.bold, fontSize: 12, color: Colors.accent, marginBottom: Spacing.xxs },
  replyPreview: {
    backgroundColor: Colors.recessed, borderLeftWidth: 2,
    borderLeftColor: Colors.accent, borderRadius: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, marginBottom: Spacing.sm,
  },
  replyName: { fontFamily: Fonts.semibold, fontSize: 11, color: Colors.accent },
  replyText: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted },
  msgText: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textPrimary, lineHeight: 20 },
  msgTime: { fontFamily: Fonts.regular, fontSize: 10, color: Colors.textMuted, alignSelf: 'flex-end' },
  msgTimeMine: { color: 'rgba(255,255,255,0.55)' },
  replyBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  replyBarContent: {
    flex: 1, borderLeftWidth: 2, borderLeftColor: Colors.accent,
    paddingLeft: Spacing.sm, marginRight: Spacing.md,
  },
  replyBarName: { fontFamily: Fonts.semibold, fontSize: 12, color: Colors.accent },
  replyBarText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted },
  mentionOverlay: {
    backgroundColor: Colors.primary, borderTopWidth: 1, borderTopColor: Colors.border,
    maxHeight: 160,
  },
  mentionItem: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
  },
  mentionName: { fontFamily: Fonts.semibold, fontSize: 15, color: Colors.accent },
  mentionEmail: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted },
  mentionHighlight: { fontFamily: Fonts.semibold, color: Colors.textSecondary},
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.background, gap: Spacing.sm,
  },
  input: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: 20,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingTop: Spacing.md,
    fontFamily: Fonts.regular, fontSize: 15, color: Colors.textPrimary, maxHeight: 100,
    borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.primary },
  msgFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.xs, marginTop: Spacing.xs },
  readCheck: { fontFamily: Fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  readCheckDone: { color: 'rgba(255,255,255,0.9)' },
});
