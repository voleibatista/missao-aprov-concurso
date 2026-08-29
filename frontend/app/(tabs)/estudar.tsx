import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '@/src/api/client';
import { colors, spacing, radius, shadow } from '@/src/theme/tokens';

export default function Estudar() {
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [concurso, setConcurso] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const dash = await apiFetch('/dashboard');
      if (dash.user.concurso_id) {
        const c = await apiFetch(`/concursos/${dash.user.concurso_id}`);
        setConcurso(c.concurso);
        setDisciplinas(c.disciplinas);
      } else {
        const d = await apiFetch('/disciplinas');
        setDisciplinas(d.disciplinas);
      }
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.brandPrimary} size="large" /></View>;

  return (
    <ScrollView testID="estudar-screen" style={styles.container} contentContainerStyle={{ padding: spacing.xl, paddingTop: 60, paddingBottom: 40 }}>
      <Text style={styles.h1}>Estudar</Text>
      {concurso && <Text style={styles.subtitle}>{concurso.nome}</Text>}

      <Pressable testID="quick-flashcards" onPress={() => router.push('/flashcards')} style={styles.bigCard}>
        <View style={styles.bigIcon}><Ionicons name="albums" size={26} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bigTitle}>Flashcards</Text>
          <Text style={styles.bigDesc}>Revisão espaçada inteligente</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.brandPrimary} />
      </Pressable>
      <Pressable testID="quick-simulado" onPress={() => router.push('/simulado')} style={styles.bigCard}>
        <View style={[styles.bigIcon, { backgroundColor: colors.warning }]}><Ionicons name="timer" size={26} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bigTitle}>Simulado</Text>
          <Text style={styles.bigDesc}>Teste-se com tempo cronometrado</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.brandPrimary} />
      </Pressable>
      <Pressable testID="quick-chat-ia" onPress={() => router.push('/chat-ia')} style={styles.bigCard}>
        <View style={[styles.bigIcon, { backgroundColor: colors.brand }]}><Ionicons name="sparkles" size={26} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bigTitle}>Professor IA</Text>
          <Text style={styles.bigDesc}>Tire dúvidas com o tutor virtual</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.brandPrimary} />
      </Pressable>

      <Text style={[styles.h2, { marginTop: spacing.xl }]}>Ferramentas de estudo</Text>
      <Pressable onPress={() => router.push('/enem')} style={styles.bigCard}>
        <View style={[styles.bigIcon, { backgroundColor: '#7C3AED' }]}><Ionicons name="school" size={26} color="#fff" /></View>
        <View style={{ flex: 1 }}><Text style={styles.bigTitle}>ENEM</Text><Text style={styles.bigDesc}>Áreas, questões e simulados</Text></View><Ionicons name="chevron-forward" size={22} color={colors.brandPrimary} />
      </Pressable>
      <Pressable onPress={() => router.push('/caderno-erros')} style={styles.bigCard}>
        <View style={[styles.bigIcon, { backgroundColor: colors.error }]}><Ionicons name="refresh-circle" size={26} color="#fff" /></View>
        <View style={{ flex: 1 }}><Text style={styles.bigTitle}>Caderno de erros</Text><Text style={styles.bigDesc}>Revise o que você errou</Text></View><Ionicons name="chevron-forward" size={22} color={colors.brandPrimary} />
      </Pressable>
      <Pressable onPress={() => router.push('/favoritos')} style={styles.bigCard}>
        <View style={[styles.bigIcon, { backgroundColor: '#DB2777' }]}><Ionicons name="heart" size={26} color="#fff" /></View>
        <View style={{ flex: 1 }}><Text style={styles.bigTitle}>Favoritos</Text><Text style={styles.bigDesc}>Questões salvas para revisar</Text></View><Ionicons name="chevron-forward" size={22} color={colors.brandPrimary} />
      </Pressable>
      <Pressable onPress={() => router.push('/pomodoro')} style={styles.bigCard}>
        <View style={[styles.bigIcon, { backgroundColor: '#EA580C' }]}><Ionicons name="stopwatch" size={26} color="#fff" /></View>
        <View style={{ flex: 1 }}><Text style={styles.bigTitle}>Pomodoro</Text><Text style={styles.bigDesc}>Foco com ciclos de estudo</Text></View><Ionicons name="chevron-forward" size={22} color={colors.brandPrimary} />
      </Pressable>
      <Pressable onPress={() => router.push('/ranking')} style={styles.bigCard}>
        <View style={[styles.bigIcon, { backgroundColor: colors.warning }]}><Ionicons name="trophy" size={26} color="#fff" /></View>
        <View style={{ flex: 1 }}><Text style={styles.bigTitle}>Ranking</Text><Text style={styles.bigDesc}>Compare seu XP e sequência</Text></View><Ionicons name="chevron-forward" size={22} color={colors.brandPrimary} />
      </Pressable>

      <Text style={[styles.h2, { marginTop: spacing.xl }]}>Disciplinas</Text>
      <View style={styles.discGrid}>
        {disciplinas.map((d) => (
          <Pressable
            key={d.id}
            testID={`disc-${d.id}`}
            onPress={() => router.push({ pathname: '/(tabs)/questoes', params: { disciplina: d.id } })}
            style={styles.discCard}
          >
            <View style={[styles.discIcon, { backgroundColor: d.cor + '22' }]}>
              <Ionicons name="book" size={20} color={d.cor} />
            </View>
            <Text style={styles.discName} numberOfLines={2}>{d.nome}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  h1: { fontSize: 28, fontWeight: '800', color: colors.onSurface, letterSpacing: -0.5 },
  subtitle: { color: colors.onSurfaceTertiary, marginTop: 4, marginBottom: spacing.lg },
  h2: { fontSize: 18, fontWeight: '700', color: colors.onSurface, marginBottom: spacing.md },
  bigCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, gap: spacing.md, ...shadow.card },
  bigIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.brandPrimary, alignItems: 'center', justifyContent: 'center' },
  bigTitle: { fontSize: 16, fontWeight: '700', color: colors.onSurface },
  bigDesc: { fontSize: 12, color: colors.onSurfaceTertiary, marginTop: 2 },
  discGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  discCard: { width: '31.5%', backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border, minHeight: 100 },
  discIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  discName: { fontSize: 11, fontWeight: '600', color: colors.onSurface, textAlign: 'center' },
});
