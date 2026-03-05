import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';

const BULLETS = [
  { icon: '✅', title: 'Build real habits', desc: 'Track tasks daily and build streaks that keep you accountable.' },
  { icon: '👥', title: 'Stay accountable together', desc: 'Join groups, vote on shared tasks, and celebrate each other\'s wins.' },
  { icon: '🔥', title: 'Earn XP & level up', desc: 'Complete tasks to earn XP, climb levels, and see your progress on the heatmap.' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoBlock}>
          <Text style={styles.logoIcon}>🔒</Text>
          <Text style={styles.logoTitle}>LockInPhase</Text>
          <Text style={styles.logoSub}>Accountability, gamified.</Text>
        </View>

        <View style={styles.bullets}>
          {BULLETS.map((b) => (
            <View key={b.icon} style={styles.bullet}>
              <Text style={styles.bulletIcon}>{b.icon}</Text>
              <View style={styles.bulletText}>
                <Text style={styles.bulletTitle}>{b.title}</Text>
                <Text style={styles.bulletDesc}>{b.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.btn} onPress={() => router.push('/(onboarding)/setup-name')}>
        <Text style={styles.btnText}>Get Started →</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 28 },
  content: { flex: 1, justifyContent: 'center' },
  logoBlock: { alignItems: 'center', marginBottom: 48 },
  logoIcon: { fontSize: 56, marginBottom: 12 },
  logoTitle: { fontSize: 32, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  logoSub: { fontSize: 16, color: Colors.textMuted, marginTop: 4 },
  bullets: { gap: 24 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  bulletIcon: { fontSize: 28, marginTop: 2 },
  bulletText: { flex: 1 },
  bulletTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  bulletDesc: { fontSize: 14, color: Colors.textMuted, lineHeight: 20 },
  btn: {
    backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: 16,
  },
  btnText: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
});
