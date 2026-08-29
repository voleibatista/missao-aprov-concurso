import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiFetch } from '@/src/api/client';
import { colors, spacing, radius } from '@/src/theme/tokens';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const submit = async () => {
    setErr(null); setLoading(true);
    try {
      await apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: email.trim() }) });
      setSent(true);
    } catch (e: any) { setErr(e?.message || 'Erro'); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#065F46', '#059669']} style={styles.hero}>
        <Pressable testID="fp-back" onPress={() => router.back()} style={styles.backBtn}><Ionicons name="chevron-back" size={24} color="#fff" /></Pressable>
        <Ionicons name="lock-closed" size={48} color="#fff" />
        <Text style={styles.heroTitle}>Recuperar senha</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: spacing.xl }} keyboardShouldPersistTaps="handled">
        {!sent ? (
          <>
            <Text style={styles.desc}>Digite o email cadastrado. Enviaremos um link para você criar uma nova senha.</Text>
            <Text style={styles.label}>Email</Text>
            <TextInput testID="fp-email-input" style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="voce@email.com" placeholderTextColor={colors.muted} />
            {err && <Text style={styles.error}>{err}</Text>}
            <Pressable testID="fp-submit-btn" onPress={submit} disabled={loading || !email} style={[styles.primaryBtn, (loading || !email) && styles.disabled]}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Enviar link</Text>}
            </Pressable>
          </>
        ) : (
          <View testID="fp-sent-box" style={styles.successBox}>
            <Ionicons name="mail-open" size={48} color={colors.brandPrimary} />
            <Text style={styles.successTitle}>Verifique seu email 📬</Text>
            <Text style={styles.successText}>Se este email estiver cadastrado, você receberá um link para redefinir a senha. O link expira em 15 minutos.</Text>
            <Pressable testID="fp-back-login" onPress={() => router.replace('/login')} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>Voltar ao login</Text></Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 60, paddingBottom: 40, paddingHorizontal: spacing.xl, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 60, left: spacing.xl },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: spacing.md, letterSpacing: -0.4 },
  desc: { color: colors.onSurfaceTertiary, marginBottom: spacing.lg, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', color: colors.onSurfaceSecondary, marginBottom: 6 },
  input: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.onSurface, marginBottom: spacing.md },
  primaryBtn: { backgroundColor: colors.brandPrimary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.md },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.5 },
  error: { color: colors.error, marginBottom: spacing.sm },
  successBox: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md },
  successTitle: { fontSize: 20, fontWeight: '800', color: colors.onSurface },
  successText: { color: colors.onSurfaceTertiary, textAlign: 'center', lineHeight: 20 },
});
