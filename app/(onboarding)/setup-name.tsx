import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Fonts, Spacing } from '../../constants/theme';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';

export default function SetupNameScreen() {
  const router = useRouter();
  const { fetchProfile, session } = useStore();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!name.trim()) return;
    setLoading(true);
    if (session?.user) {
      await supabase.from('profiles').update({ name: name.trim() }).eq('id', session.user.id);
      await fetchProfile();
    }
    setLoading(false);
    router.push('/(onboarding)/notifications');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>👤</Text>
        <Text style={styles.title}>What's your name?</Text>
        <Text style={styles.sub}>This is how your teammates will see you.</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={setName}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleContinue}
        />
      </View>
      <TouchableOpacity
        style={[styles.btn, (!name.trim() || loading) && styles.btnDisabled]}
        disabled={!name.trim() || loading}
        onPress={handleContinue}
      >
        <Text style={styles.btnText}>{loading ? 'Saving…' : 'Continue →'}</Text>
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
  input: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    fontFamily: Fonts.regular, fontSize: 18, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border,
  },
  btn: {
    backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: Spacing.lg,
    alignItems: 'center', marginBottom: Spacing.lg,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontFamily: Fonts.bold, fontSize: 17, color: Colors.textPrimary },
});
