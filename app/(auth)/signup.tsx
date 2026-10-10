import { Lock, MailCheck } from 'lucide-react-native';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { showAlert } from '../../lib/alert';
import { Colors } from '../../constants/Colors';
import { Fonts, Radius, Spacing } from '../../constants/theme';
import { useStore } from '../../lib/store';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // Validation and rejection belong in the form, not in a dialog.
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const router = useRouter();
  const signUp = useStore((s) => s.signUp);

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setFormError('Fill in your name, email and password.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    setFormError(null);
    setLoading(true);
    const { error } = await signUp(email.trim(), password, name.trim());
    setLoading(false);
    if (error) {
      setFormError(error);
    } else {
      // A dialog here was invisible on web, so the account appeared not to have
      // been created at all. Replace the screen with the instruction instead.
      setSentTo(email.trim());
    }
  };

  if (sentTo) {
    return (
      <View style={[styles.container, styles.sentWrap]}>
        <View style={styles.logoBadge}>
          <MailCheck color={Colors.green} size={26} />
        </View>
        <Text style={styles.title}>Confirm your email</Text>
        <Text style={styles.sentBody}>
          We sent a confirmation link to {sentTo}. Open it on this device, then
          come back and sign in.
        </Text>
        <Text style={styles.sentHint}>
          No email? Check spam, or sign up again with a different address.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.buttonText}>Back to sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Lock color={Colors.accent} size={26} />
          </View>
          <Text style={styles.title}>Join LockInPhase</Text>
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="At least 6 characters"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {formError && <Text style={styles.formError}>{formError}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxxxl,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: Radius.xxl,
    backgroundColor: Colors.accentSubtle,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.bold, fontSize: 28,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Fonts.regular, fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  form: {
    gap: Spacing.xs,
  },
  label: {
    fontFamily: Fonts.semibold, fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    fontFamily: Fonts.regular, fontSize: 16,
    color: Colors.textPrimary,
  },
  sentWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  sentBody: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  sentHint: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  formError: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.red,
    marginBottom: Spacing.md,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.xxl,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: Fonts.bold, fontSize: 16,
    color: Colors.onAccent,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
  },
  footerText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.regular, fontSize: 14,
  },
  footerLink: {
    color: Colors.accent,
    fontFamily: Fonts.semibold, fontSize: 14,
  },
});