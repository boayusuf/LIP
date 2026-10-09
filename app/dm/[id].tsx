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
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AvatarImage from '../../components/AvatarImage';
import { Colors } from '../../constants/Colors';
import { Fonts, Radius, Spacing } from '../../constants/theme';
import { useGroupStore } from '../../lib/groupStore';
import { useStore } from '../../lib/store';
import { Message } from '../../types';

export default function DMScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useStore();
  const { currentGroup, dmGroups, messages, fetchMessages, sendMessage, subscribeToMessages, fetchGroupDetail, markMessagesRead, setActiveChatGroupId } = useGroupStore();

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
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      if (id) markMessagesRead(id);
    }
  }, [messages.length]);

  const groupData = currentGroup?.id === id ? currentGroup : dmGroups.find((g) => g.id === id);
  const otherMember = (groupData?.members || []).find((m: any) => m.user_id !== userId);
  const otherName = otherMember?.profile?.name || otherMember?.profile?.email?.split('@')[0] || 'DM';
  const otherAvatarUrl = otherMember?.profile?.avatar_url ?? null;

  const handleSend = async () => {
    if (!text.trim() || !id) return;
    const msg = text.trim();
    setText('');
    await sendMessage(id, msg, replyTo?.id);
    setReplyTo(null);
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderLeftActions = () => (
    <View style={styles.swipeAction}>
      <Reply color={Colors.accent} size={20} />
    </View>
  );

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.user_id === userId;
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
            {item.reply_to && (
              <View style={styles.replyPreview}>
                <Text style={styles.replyName}>
                  {item.reply_to?.sender?.name || item.reply_to?.sender?.email?.split('@')[0] || 'Unknown'}
                </Text>
                <Text style={styles.replyText} numberOfLines={1}>{item.reply_to.content}</Text>
              </View>
            )}
            <Text style={styles.msgText}>{item.content}</Text>
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={Colors.textPrimary} size={22} />
        </TouchableOpacity>
        <AvatarImage size={36} name={otherName} avatarUrl={otherAvatarUrl} style={{ marginRight: Spacing.md }} />
        <Text style={styles.headerTitle}>{otherName}</Text>
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
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <View style={styles.emptyChatIconWrap}>
              <MessageCircle color={Colors.textMuted} size={26} />
            </View>
            <Text style={styles.emptyChatText}>Start a conversation</Text>
            <Text style={styles.emptyChatSub}>Say hello to {otherName}!</Text>
          </View>
        }
      />

      {replyTo && (
        <View style={styles.replyBar}>
          <View style={styles.replyBarContent}>
            <Text style={styles.replyBarName}>
              Replying to {replyTo.sender?.name || replyTo.sender?.email?.split('@')[0] || 'Unknown'}
            </Text>
            <Text style={styles.replyBarText} numberOfLines={1}>{replyTo.content}</Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <X color={Colors.textMuted} size={18} />
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Message..."
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
            <Send color={text.trim() ? Colors.textPrimary : Colors.textMuted} size={20} />
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
  backBtn: { padding: Spacing.xs, marginRight: Spacing.sm },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 17, color: Colors.textPrimary, flex: 1 },
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
    justifyContent: 'center', alignItems: 'center',
    width: 60, paddingLeft: Spacing.md,
  },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  msgRowMine: { flexDirection: 'row-reverse' },
  msgBubble: { maxWidth: '75%', borderRadius: 16, padding: Spacing.md, paddingHorizontal: Spacing.lg },
  msgBubbleMine: { backgroundColor: Colors.accent, borderBottomRightRadius: 4 },
  msgBubbleOther: {
    backgroundColor: Colors.primary, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  replyPreview: {
    backgroundColor: Colors.recessed, borderLeftWidth: 2,
    borderLeftColor: Colors.accent, borderRadius: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, marginBottom: Spacing.sm,
  },
  replyName: { fontFamily: Fonts.semibold, fontSize: 11, color: Colors.accent },
  replyText: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted },
  msgText: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textPrimary, lineHeight: 20 },
  msgFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.xs, marginTop: Spacing.xs },
  msgTime: { fontFamily: Fonts.regular, fontSize: 10, color: Colors.textMuted, alignSelf: 'flex-end' },
  msgTimeMine: { color: 'rgba(255,255,255,0.55)' },
  readCheck: { fontFamily: Fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  readCheckDone: { color: 'rgba(255,255,255,0.9)' },
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
});
