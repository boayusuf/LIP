import { Flame, ListChecks, Lock, Users, type LucideIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Fonts, Radius, Spacing, Type } from '../../constants/theme';

const BULLETS: { Icon: LucideIcon; title: string; desc: string }[] = [
  { Icon: ListChecks, title: 'Build real habits', desc: 'Track tasks daily and build streaks that keep you accountable.' },
  { Icon: Users, title: 'Stay accountable together', desc: 'Join groups, vote on shared tasks, and celebrate each other\'s wins.' },
  { Icon: Flame, title: 'Earn XP & level up', desc: 'Complete tasks to earn XP, climb levels, and see your progress on the heatmap.' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoBlock}>
          <View style={styles.logoBadge}>
            <Lock color={Colors.accent} size={26} />
          </View>
          <Text style={styles.logoTitle}>LockInPhase</Text>
          <Text style={styles.logoSub}>Accountability, gamified.</Text>
        </View>

        <View style={styles.bullets}>
          {BULLETS.map((b) => (
            <View key={b.title} style={styles.bullet}>
              <View style={styles.bulletIconWrap}>
                <b.Icon color={Colors.accent} size={18} />
              </View>
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
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing.screen },
  content: { flex: 1, justifyContent: 'center' },
  logoBlock: { alignItems: 'center', marginBottom: Spacing.huge },
  logoBadge: {
    width: 60, height: 60, borderRadius: Radius.xxl,
    backgroundColor: Colors.accentSubtle,
    borderWidth: 1, borderColor: Colors.accentBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
  },
  logoTitle: { ...Type.display, color: Colors.textPrimary },
  logoSub: { fontFamily: Fonts.regular, fontSize: 16, color: Colors.textMuted, marginTop: Spacing.xs },
  bullets: { gap: Spacing.xxl },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
  bulletIconWrap: {
    width: 38, height: 38, borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  bulletText: { flex: 1 },
  bulletTitle: { fontFamily: Fonts.bold, fontSize: 17, color: Colors.textPrimary, marginBottom: Spacing.xs },
  bulletDesc: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted, lineHeight: 20 },
  btn: {
    backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: Spacing.lg,
    alignItems: 'center', marginBottom: Spacing.lg,
  },
  btnText: { fontFamily: Fonts.bold, fontSize: 17, color: Colors.onAccent },
});
