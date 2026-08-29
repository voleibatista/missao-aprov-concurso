import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Linking as RNLinking } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '@/src/context/AuthContext';
import { colors, spacing, radius, typography, shadow } from '@/src/theme/tokens';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { login, register } = useAuth();
  const router = useRouter();

  const submit = async () => {
    setErr(null); setLoading(true);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await register(name.trim(), email.trim(), password);
      router.replace('/');
    } catch (e: any) { setErr(e?.message || 'Erro ao autenticar'); }
    finally { setLoading(false); }
  };

  const googleLogin = async () => {
    try {
      const redirectUrl = Platform.OS === 'web'
        ? window.location.origin + '/'
        : Linking.createURL('');
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      if (Platform.OS === 'web') {
        window.location.href = authUrl;
      } else {
        await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      }
    } catch (e: any) { setErr(e?.message || 'Erro no login Google'); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#065F46', '#059669', '#10B981']} style={styles.hero}>
        <View style={styles.brandBox}>
          <View style={styles.logoCircle}>
            <Ionicons name="trophy" size={32} color={colors.brandSecondary} />
          </View>
          <Text style={styles.brandTitle}>MISSÃO APROV{"\n"}CONCURSO</Text>
          <Text style={styles.brandSubtitle}>Estude menos. Memorize mais.{"\n"}Aproxime-se da aprovação.</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.card} contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing['3xl'] }} keyboardShouldPersistTaps="handled">
        <View style={styles.tabs}>
          <Pressable testID="login-tab-btn" onPress={() => setMode('login')} style={[styles.tab, mode === 'login' && styles.tabActive]}>
            <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Entrar</Text>
          </Pressable>
          <Pressable testID="register-tab-btn" onPress={() => setMode('register')} style={[styles.tab, mode === 'register' && styles.tabActive]}>
            <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Criar Conta</Text>
          </Pressable>
        </View>

        {mode === 'register' && (
          <View style={styles.field}>
            <Text style={styles.label}>Nome</Text>
            <TextInput testID="register-name-input" style={styles.input} placeholder="Seu nome completo" value={name} onChangeText={setName} autoCapitalize="words" placeholderTextColor={colors.muted} />
          </View>
        )}
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput testID="auth-email-input" style={styles.input} placeholder="voce@email.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor={colors.muted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Senha</Text>
          <TextInput testID="auth-password-input" style={styles.input} placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={colors.muted} />
        </View>

        {err && <Text testID="auth-error" style={styles.error}>{err}</Text>}

        {mode === 'login' && (
          <Pressable testID="forgot-password-link" onPress={() => router.push('/forgot-password')} style={{ alignSelf: 'flex-end', marginBottom: spacing.sm }}>
            <Text style={{ color: colors.brandPrimary, fontSize: 13, fontWeight: '600' }}>Esqueci minha senha</Text>
          </Pressable>
        )}

        <Pressable testID="auth-submit-btn" onPress={submit} disabled={loading} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{mode === 'login' ? 'Entrar' : 'Criar conta'}</Text>}
        </Pressable>

        <View style={styles.divider}><View style={styles.line}/><Text style={styles.dividerText}>ou</Text><View style={styles.line}/></View>

        <Pressable testID="google-login-btn" onPress={googleLogin} style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.9 }]}>
          <Ionicons name="logo-google" size={20} color={colors.onSurface} />
          <Text style={styles.googleBtnText}>Continuar com Google</Text>
        </Pressable>

        <Text style={styles.terms}>Ao continuar, você concorda com os termos de uso da plataforma.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 60, paddingBottom: 40, paddingHorizontal: spacing.xl, alignItems: 'center' },
  brandBox: { alignItems: 'center' },
  logoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  brandTitle: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5, lineHeight: 30 },
  brandSubtitle: { color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: spacing.sm, fontSize: 13, lineHeight: 18 },
  card: { flex: 1, backgroundColor: colors.surface, marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  tabs: { flexDirection: 'row', backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, padding: 4, marginBottom: spacing.xl },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.surfaceSecondary, ...shadow.card },
  tabText: { color: colors.onSurfaceTertiary, fontWeight: '600' },
  tabTextActive: { color: colors.onSurface },
  field: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: colors.onSurfaceSecondary, marginBottom: 6 },
  input: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.onSurface },
  primaryBtn: { backgroundColor: colors.brandPrimary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.md },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { marginHorizontal: spacing.md, color: colors.info, fontSize: 12, fontWeight: '600' },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12, gap: 10 },
  googleBtnText: { color: colors.onSurface, fontWeight: '600', fontSize: 15 },
  error: { color: colors.error, fontSize: 13, marginTop: spacing.sm, marginBottom: spacing.sm, textAlign: 'center' },
  terms: { color: colors.info, fontSize: 11, textAlign: 'center', marginTop: spacing.lg, lineHeight: 16 },
});
