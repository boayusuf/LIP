import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Fonts, Spacing } from '../../constants/theme';
import { useStore } from '../../lib/store';

export default function NotificationsScreen() {
  const router = useRouter();
  const { completeOnboarding } = useStore();

  const finish = async (allow: boolean) => {
    if (allow) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        try {
          const token = (await Notifications.getExpoPushTokenAsync()).data;
          // Token will be saved after completeOnboarding triggers fetchProfile + registerPushToken
        } catch (_) {}
      }
    }
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🔔</Text>
        <Text style={styles.title}>Stay in the loop</Text>
        <Text style={styles.sub}>
          Get notified when group tasks are completed, teammates mention you, or a new group challenge starts.
        </Text>
        <View style={styles.card}>
          {['Group task completed', 'New proposal to vote on', '@mention in chat', 'Streak reminder'].map((item) => (
            <View key={item} style={styles.cardRow}>
              <Text style={styles.cardDot}>•</Text>
              <Text style={styles.cardText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
      <TouchableOpacity style={styles.btnPrimary} onPress={() => finish(true)}>
        <Text style={styles.btnPrimaryText}>Allow Notifications</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnSecondary} onPress={() => finish(false)}>
        <Text style={styles.btnSecondaryText}>Skip for Now</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing.xxxl },
  content: { flex: 1, justifyContent: 'center' },
  emoji: { fontFamily: Fonts.regular, fontSize: 52, marginBottom: Spacing.lg },
  title: { fontFamily: Fonts.bold, fontSize: 28, color: Colors.textPrimary, marginBottom: Spacing.sm },
  sub: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textMuted, marginBottom: Spacing.xxxl, lineHeight: 22 },
  card: {
    backgroundColor: Colors.primary, borderRadius: 14, padding: Spacing.xl,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.md,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cardDot: { color: Colors.accent, fontFamily: Fonts.bold, fontSize: 18},
  cardText: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textPrimary },
  btnPrimary: {
    backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: Spacing.lg,
    alignItems: 'center', marginBottom: Spacing.md,
  },
  btnPrimaryText: { fontFamily: Fonts.bold, fontSize: 17, color: Colors.onAccent },
  btnSecondary: {
    borderRadius: 14, paddingVertical: Spacing.lg, alignItems: 'center', marginBottom: Spacing.lg,
  },
  btnSecondaryText: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textMuted },
});
