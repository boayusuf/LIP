import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { Fonts, Spacing } from '../constants/theme';
import { useGroupStore } from '../lib/groupStore';

export default function InAppNotification() {
  const { inAppNotif, clearInAppNotif } = useGroupStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!inAppNotif) {
      Animated.timing(translateY, { toValue: -120, duration: 250, useNativeDriver: true }).start();
      return;
    }

    Animated.spring(translateY, { toValue: insets.top + 8, useNativeDriver: true, tension: 80, friction: 10 }).start();

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      clearInAppNotif();
    }, 4000);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [inAppNotif?.id]);

  const handlePress = () => {
    clearInAppNotif();
    if (inAppNotif?.isDM) {
      router.push(`/dm/${inAppNotif.groupId}` as any);
    } else {
      router.push(`/group/chat/${inAppNotif?.groupId}` as any);
    }
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <TouchableOpacity style={styles.inner} onPress={handlePress} activeOpacity={0.92}>
        <Text style={styles.title} numberOfLines={1}>
          {inAppNotif?.isDM
            ? inAppNotif.senderName
            : `${inAppNotif?.senderName} · ${inAppNotif?.groupName}`}
        </Text>
        <Text style={styles.message} numberOfLines={2}>
          {inAppNotif?.content}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  inner: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontFamily: Fonts.bold, fontSize: 14,
    color: Colors.accent,
    marginBottom: Spacing.xxs,
  },
  message: {
    fontFamily: Fonts.regular, fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 19,
  },
});
