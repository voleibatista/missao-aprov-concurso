import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiFetch } from '@/src/api/client';
import { colors, spacing, radius, shadow } from '@/src/theme/tokens';

type Dashboard = {
  user: { name: string; xp: number; streak: number; concurso_id?: string };
  questoes_respondidas: number;
  acertos: number;
  taxa_acerto: number;
  flashcards_pendentes: number;
  simulados_realizados: number;
  percentual_preparacao: number;
  por_disciplina: any[];
  meta_diaria: { questoes: number; feito: number };
  estudo?: {
    minutos_hoje: number;
    sessoes_hoje: number;
    minutos_7_dias: number;
    sessoes_7_dias: number;
  };
  conquista_nova?: {
    id: string;
    titulo: string;
    descricao: string;
    icone: string;
  } | null;
};

export default function Home() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [concurso, setConcurso] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const d = await apiFetch('/dashboard');

      try {
        const conquistas = await apiFetch('/conquistas/novas');
        d.conquista_nova = conquistas.novas?.[0] || null;
      } catch {
        d.conquista_nova = null;
      }

      setData(d);
      if (d.user.concurso_id) {
        const c = await apiFetch(`/concursos/${d.user.concurso_id}`);
        setConcurso(c.concurso);
      }
    } catch (e) { console.warn(e); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (!data) return <View style={styles.loading}><ActivityIndicator color={colors.brandPrimary} size="large" /></View>;

  const metaPct = Math.min(100, Math.round(100 * data.meta_diaria.feito / data.meta_diaria.questoes));

  return (
    <ScrollView testID="home-screen" style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}>
      <LinearGradient colors={['#065F46', '#059669']} style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.hello}>Olá, {data.user.name?.split(' ')[0] || 'Aluno'} 👋</Text>
            <Text style={styles.heroTitle}>{concurso?.nome || 'Escolha um concurso'}</Text>
          </View>
          <View style={styles.streakBadge} testID="streak-badge">
            <Ionicons name="flame" size={18} color={colors.warning} />
            <Text style={styles.streakText}>{data.user.streak}</Text>
          </View>
        </View>
        <View style={styles.prepBox}>
          <Text style={styles.prepLabel}>Preparação</Text>
          <Text style={styles.prepValue} testID="prep-percent">{data.percentual_preparacao}%</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${data.percentual_preparacao}%` }]} />
          </View>
        </View>
      </LinearGradient>

      <Pressable testID="continue-studying-btn" onPress={() => router.push('/(tabs)/estudar')} style={styles.ctaCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaLabel}>CONTINUAR ESTUDANDO</Text>
          <Text style={styles.ctaSubtitle}>Retome de onde parou</Text>
        </View>
        <View style={styles.ctaArrow}><Ionicons name="arrow-forward" size={20} color="#fff" /></View>
      </Pressable>

      {data.conquista_nova && (
        <Pressable
          onPress={async () => {
            try {
              await apiFetch('/conquistas/vistas', {
                method: 'POST',
                body: JSON.stringify({
                  ids: [data.conquista_nova!.id],
                }),
              });
            } catch {}

            router.push('/conquistas');
          }}
          style={styles.achievementBanner}
        >
          <View style={styles.achievementIcon}>
            <Ionicons
              name={(data.conquista_nova.icone || 'trophy') as any}
              size={24}
              color={colors.warning}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.achievementLabel}>
              NOVA CONQUISTA
            </Text>

            <Text style={styles.achievementTitle}>
              {data.conquista_nova.titulo}
            </Text>

            <Text style={styles.achievementDesc}>
              {data.conquista_nova.descricao}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.warning}
          />
        </Pressable>
      )}

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard} testID="metric-questoes"><Ionicons name="checkmark-done" size={20} color={colors.brandPrimary} /><Text style={styles.metricVal}>{data.questoes_respondidas}</Text><Text style={styles.metricLabel}>Questões</Text></View>
        <View style={styles.metricCard} testID="metric-taxa"><Ionicons name="trending-up" size={20} color={colors.success} /><Text style={styles.metricVal}>{data.taxa_acerto}%</Text><Text style={styles.metricLabel}>Acertos</Text></View>
        <View style={styles.metricCard} testID="metric-xp"><Ionicons name="trophy" size={20} color={colors.warning} /><Text style={styles.metricVal}>{data.user.xp}</Text><Text style={styles.metricLabel}>XP</Text></View>
        <View style={styles.metricCard} testID="metric-simulados"><Ionicons name="document-text" size={20} color={colors.brand} /><Text style={styles.metricVal}>{data.simulados_realizados}</Text><Text style={styles.metricLabel}>Simulados</Text></View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meta diária</Text>
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{data.meta_diaria.feito} / {data.meta_diaria.questoes} questões</Text>
            <Text style={styles.metaPct}>{metaPct}%</Text>
          </View>
          <View style={styles.progressTrackLight}><View style={[styles.progressFillLight, { width: `${metaPct}%` }]} /></View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ações rápidas</Text>
        <View style={styles.actionsGrid}>
          <ActionBtn testID="action-flashcards" icon="albums" label="Flashcards" badge={data.flashcards_pendentes} onPress={() => router.push('/flashcards')} />
          <ActionBtn testID="action-simulado" icon="timer" label="Simulado" onPress={() => router.push('/simulado')} />
          <ActionBtn testID="action-chat-ia" icon="sparkles" label="Prof. IA" onPress={() => router.push('/chat-ia')} />
          <ActionBtn testID="action-historico" icon="bar-chart" label="Histórico" onPress={() => router.push('/historico-estudos')} />
          <ActionBtn testID="action-concursos" icon="search" label="Concursos" onPress={() => router.push('/concursos')} />
        </View>
      </View>

      {data.por_disciplina.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Desempenho por disciplina</Text>
          {data.por_disciplina.slice(0, 6).map((d: any) => (
            <View key={d.disciplina} style={styles.discRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.discName}>{d.nome}</Text>
                <View style={styles.progressTrackLight}><View style={[styles.progressFillLight, { width: `${d.percentual}%`, backgroundColor: d.percentual >= 70 ? colors.success : d.percentual >= 40 ? colors.warning : colors.error }]} /></View>
              </View>
              <Text style={styles.discPct}>{d.percentual}%</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function ActionBtn({ icon, label, onPress, badge, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.actionBtn}>
      <View style={styles.actionIcon}><Ionicons name={icon} size={22} color={colors.brandPrimary} />
        {typeof badge === 'number' && badge > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  hero: { paddingTop: 60, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hello: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500' },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 2, letterSpacing: -0.3, maxWidth: 240 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, gap: 4 },
  streakText: { color: '#fff', fontWeight: '800' },
  prepBox: { marginTop: spacing.xl },
  prepLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  prepValue: { color: '#fff', fontSize: 40, fontWeight: '800', letterSpacing: -1, marginTop: 2 },
  progressTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#fff' },
  ctaCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.brand, marginHorizontal: spacing.xl, marginTop: -18, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  ctaLabel: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  ctaSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  ctaArrow: { backgroundColor: 'rgba(255,255,255,0.15)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  metricCard: { width: '47%', backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  metricVal: { fontSize: 22, fontWeight: '800', color: colors.onSurface, marginTop: 6, letterSpacing: -0.4 },
  metricLabel: { fontSize: 12, color: colors.onSurfaceTertiary, fontWeight: '500' },
  section: { marginTop: spacing.xl, paddingHorizontal: spacing.xl },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.onSurface, marginBottom: spacing.sm },
  metaCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  metaText: { color: colors.onSurface, fontWeight: '600' },
  metaPct: { color: colors.brandPrimary, fontWeight: '800' },
  progressTrackLight: { height: 6, backgroundColor: colors.surfaceTertiary, borderRadius: 3, overflow: 'hidden' },
  progressFillLight: { height: 6, backgroundColor: colors.brandPrimary },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionBtn: { width: '23.5%', backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  actionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandTertiary, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  actionLabel: { fontSize: 11, color: colors.onSurface, fontWeight: '600' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: colors.error, borderRadius: 999, minWidth: 18, height: 18, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  discRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  discName: { color: colors.onSurface, fontWeight: '600', fontSize: 13, marginBottom: 6 },
  discPct: { color: colors.onSurface, fontWeight: '800', fontSize: 14, minWidth: 44, textAlign: 'right' },

  achievementBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    backgroundColor: '#FFFBEB',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    ...shadow.card,
  },

  achievementIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  achievementLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.warning,
    letterSpacing: 0.6,
  },

  achievementTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.onSurface,
    marginTop: 2,
  },

  achievementDesc: {
    fontSize: 11,
    color: colors.onSurfaceTertiary,
    marginTop: 2,
  },

});
