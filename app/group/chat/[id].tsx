import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, X } from 'lucide-react-native';
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
import { Colors } from '../../../constants/Colors';
import { useGroupStore } from '../../../lib/groupStore';
import { useStore } from '../../../lib/store';
import { Message } from '../../../types';

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
  } = useGroupStore();

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const userId = session?.user?.id;

  useEffect(() => {
    if (id) {
      fetchGroupDetail(id);
      fetchMessages(id);
      const unsub = subscribeToMessages(id);
      return unsub;
    }
  }, [id]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

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

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.user_id === userId;
    const senderName = item.sender?.name || item.sender?.email?.split('@')[0] || 'Unknown';

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onLongPress={() => setReplyTo(item)}
        delayLongPress={300}
        style={styles.swipeContainer}
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
            <Text style={styles.msgText}>{item.content}</Text>
            <Text style={styles.msgTime}>{formatTime(item.created_at)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={Colors.textPrimary} size={22} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            💬 {currentGroup?.name || 'Chat'}
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
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatEmoji}>💬</Text>
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.inputBar}>
          <TextInput
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
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4, marginRight: 10 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  headerSub: { fontSize: 12, color: Colors.textMuted },
  messageList: { flex: 1 },
  messageContent: { padding: 16, paddingBottom: 8 },
  emptyChat: { alignItems: 'center', paddingTop: 80 },
  emptyChatEmoji: { fontSize: 40, marginBottom: 8 },
  emptyChatText: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptyChatSub: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  swipeContainer: { marginBottom: 8 },
  // Messages
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  msgRowMine: { flexDirection: 'row-reverse' },
  msgBubble: { maxWidth: '75%', borderRadius: 16, padding: 10, paddingHorizontal: 14 },
  msgBubbleMine: { backgroundColor: Colors.accent, borderBottomRightRadius: 4 },
  msgBubbleOther: {
    backgroundColor: Colors.primary, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  msgSender: { fontSize: 12, fontWeight: '700', color: Colors.accent, marginBottom: 2 },
  replyPreview: {
    backgroundColor: Colors.background + '40', borderLeftWidth: 2,
    borderLeftColor: Colors.accent, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 4, marginBottom: 6,
  },
  replyName: { fontSize: 11, fontWeight: '600', color: Colors.accent },
  replyText: { fontSize: 12, color: Colors.textMuted },
  msgText: { fontSize: 15, color: Colors.textPrimary, lineHeight: 20 },
  msgTime: { fontSize: 10, color: Colors.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  // Reply bar
  replyBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: Colors.primary,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  replyBarContent: {
    flex: 1, borderLeftWidth: 2, borderLeftColor: Colors.accent,
    paddingLeft: 8, marginRight: 12,
  },
  replyBarName: { fontSize: 12, fontWeight: '600', color: Colors.accent },
  replyBarText: { fontSize: 13, color: Colors.textMuted },
  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.background, gap: 8,
  },
  input: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, paddingTop: 10,
    fontSize: 15, color: Colors.textPrimary, maxHeight: 100,
    borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.primary },
});