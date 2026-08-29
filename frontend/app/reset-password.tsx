import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiFetch } from '@/src/api/client';
import { colors, spacing, radius } from '@/src/theme/tokens';

export default function ResetPassword() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const submit = async () => {
    setErr(null);
    if (password.length < 6) { setErr('A senha precisa ter pelo menos 6 caracteres'); return; }
    if (password !== confirm) { setErr('As senhas não coincidem'); return; }
    setLoading(true);
    try {
      await apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, new_password: password }) });
      setDone(true);
    } catch (e: any) { setErr(e?.message || 'Erro'); }
    finally { setLoading(false); }
  };

  if (!token) {
    return (
      <View style={styles.errCenter}>
        <Ionicons name="alert-circle" size={48} color={colors.error} />
        <Text style={styles.errText}>Link inválido</Text>
        <Pressable onPress={() => router.replace('/login')} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>Ir para o login</Text></Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#065F46', '#059669']} style={styles.hero}>
        <Ionicons name="key" size={48} color="#fff" />
        <Text style={styles.heroTitle}>Nova senha</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: spacing.xl }} keyboardShouldPersistTaps="handled">
        {!done ? (
          <>
            <Text style={styles.desc}>Escolha uma nova senha para sua conta.</Text>
            <Text style={styles.label}>Nova senha</Text>
            <TextInput testID="rp-password" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Mínimo 6 caracteres" placeholderTextColor={colors.muted} />
            <Text style={styles.label}>Confirmar senha</Text>
            <TextInput testID="rp-confirm" style={styles.input} value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Repita a senha" placeholderTextColor={colors.muted} />
            {err && <Text style={styles.error}>{err}</Text>}
            <Pressable testID="rp-submit" onPress={submit} disabled={loading} style={[styles.primaryBtn, loading && styles.disabled]}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Redefinir senha</Text>}
            </Pressable>
          </>
        ) : (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
            <Text style={styles.successTitle}>Senha redefinida! ✅</Text>
            <Text style={styles.successText}>Agora você pode entrar com sua nova senha.</Text>
            <Pressable testID="rp-goto-login" onPress={() => router.replace('/login')} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>Entrar agora</Text></Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  hero: { paddingTop: 60, paddingBottom: 40, paddingHorizontal: spacing.xl, alignItems: 'center' },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: spacing.md, letterSpacing: -0.4 },
  desc: { color: colors.onSurfaceTertiary, marginBottom: spacing.lg, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', color: colors.onSurfaceSecondary, marginBottom: 6, marginTop: spacing.sm },
  input: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.onSurface },
  primaryBtn: { backgroundColor: colors.brandPrimary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.5 },
  error: { color: colors.error, marginTop: spacing.sm },
  successBox: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md },
  successTitle: { fontSize: 22, fontWeight: '800', color: colors.onSurface },
  successText: { color: colors.onSurfaceTertiary, textAlign: 'center' },
  errCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, gap: spacing.md, padding: spacing.xl },
  errText: { fontSize: 20, fontWeight: '800', color: colors.onSurface },
});
