import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '@/src/api/client';
import { colors, spacing, radius, shadow } from '@/src/theme/tokens';

export default function Questoes() {
  const params = useLocalSearchParams<{ disciplina?: string }>();
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [selDisc, setSelDisc] = useState<string | undefined>(params.disciplina);
  const [questoes, setQuestoes] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);

  useEffect(() => { apiFetch('/disciplinas').then((d) => setDisciplinas(d.disciplinas)); }, []);

  const loadQuestoes = useCallback(async (disc?: string) => {
    setLoading(true); setChoice(null); setResultado(null); setIdx(0); setFavorited(false);
    try {
      const q = await apiFetch(`/questoes${disc ? `?disciplina=${disc}` : ''}`);
      setQuestoes(q.questoes);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadQuestoes(selDisc); }, [selDisc, loadQuestoes]);

  const responder = async () => {
    if (choice == null) return;

    const q = questoes[idx];

    const r = await apiFetch('/questoes/answer', {
      method: 'POST',
      body: JSON.stringify({
        questao_id: q.id,
        resposta: choice,
      }),
    });

    setResultado(r);
  };
  const proxima = () => {
    setChoice(null); setResultado(null);
    if (idx + 1 < questoes.length) setIdx(idx + 1);
    else loadQuestoes(selDisc);
  };

  const q = questoes[idx];
  const favoritar = async () => {
    if (!q) return;
    const r = await apiFetch(`/questoes/${q.id}/favorite`, { method: 'POST' });
    setFavorited(r.favorited);
  };

  return (
    <View testID="questoes-screen" style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.h1}>Questões</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.xl }} style={{ marginTop: spacing.md, marginHorizontal: -spacing.xl, paddingHorizontal: spacing.xl }}>
          <Pressable testID="chip-all" onPress={() => setSelDisc(undefined)} style={[styles.chip, !selDisc && styles.chipActive]}>
            <Text style={[styles.chipText, !selDisc && styles.chipTextActive]}>Todas</Text>
          </Pressable>
          {disciplinas.map((d) => (
            <Pressable key={d.id} testID={`chip-${d.id}`} onPress={() => setSelDisc(d.id)} style={[styles.chip, selDisc === d.id && styles.chipActive]}>
              <Text style={[styles.chipText, selDisc === d.id && styles.chipTextActive]}>{d.nome}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} size="large" /></View>
      ) : !q ? (
        <View style={styles.center}><Text style={styles.empty}>Sem questões desta disciplina.</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }}>
          <View style={styles.qHeader}>
            <Text style={styles.qMeta}>{q.banca} • {q.ano} • {q.dificuldade?.toUpperCase()}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={styles.qCount}>Questão {idx + 1} de {questoes.length}</Text>
              <Pressable onPress={favoritar}><Ionicons name={favorited ? 'heart' : 'heart-outline'} size={22} color={favorited ? colors.error : colors.info} /></Pressable>
            </View>
          </View>
          <Text style={styles.qEnunciado}>{q.enunciado}</Text>

          {q.alternativas.map((alt: string, i: number) => {
            const isSelected = choice === i;
            const showRes = !!resultado;
            const isCorrect = showRes && q.correta === i;
            const isWrong = showRes && choice === i && q.correta !== i;
            return (
              <Pressable
                key={i}
                testID={`alt-${i}`}
                disabled={showRes}
                onPress={() => setChoice(i)}
                style={[styles.alt, isSelected && !showRes && styles.altSelected, isCorrect && styles.altCorrect, isWrong && styles.altWrong]}
              >
                <View style={[styles.altLetter, isSelected && !showRes && { backgroundColor: colors.brandPrimary }, isCorrect && { backgroundColor: colors.success }, isWrong && { backgroundColor: colors.error }]}>
                  <Text style={[styles.altLetterText, (isSelected || showRes) && { color: '#fff' }]}>{String.fromCharCode(65 + i)}</Text>
                </View>
                <Text style={styles.altText}>{alt}</Text>
              </Pressable>
            );
          })}

          {resultado && (
            <View
              style={[
                styles.explain,
                {
                  borderColor: resultado.correta
                    ? colors.success
                    : colors.error,
                },
              ]}
            >
              <View style={styles.resultHeader}>
                <Text style={styles.explainTitle}>
                  {resultado.correta ? '✅ Correto!' : '❌ Errou'}
                </Text>

                <View style={styles.xpBadge}>
                  <Ionicons
                    name="trophy"
                    size={15}
                    color={colors.warning}
                  />
                  <Text style={styles.xpBadgeText}>
                    +{resultado.xp_gain} XP
                  </Text>
                </View>
              </View>

              {resultado.streak > 0 && (
                <View style={styles.streakResult}>
                  <Ionicons
                    name="flame"
                    size={15}
                    color={colors.warning}
                  />
                  <Text style={styles.streakResultText}>
                    {resultado.streak} dia(s) de sequência
                  </Text>
                </View>
              )}

              <Text style={styles.explainText}>
                {resultado.explicacao}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {q && (
        <View style={styles.footer}>
          {!resultado ? (
            <Pressable testID="responder-btn" disabled={choice == null} onPress={responder} style={[styles.primaryBtn, choice == null && styles.disabled]}>
              <Text style={styles.primaryBtnText}>Responder</Text>
            </Pressable>
          ) : (
            <Pressable testID="proxima-btn" onPress={proxima} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Próxima questão</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingTop: 60, paddingHorizontal: spacing.xl, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  h1: { fontSize: 24, fontWeight: '800', color: colors.onSurface, letterSpacing: -0.4 },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurface, fontWeight: '600', fontSize: 12 },
  chipTextActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  empty: { color: colors.onSurfaceTertiary },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  qMeta: { fontSize: 11, fontWeight: '700', color: colors.brandPrimary, letterSpacing: 0.5 },
  qCount: { fontSize: 11, color: colors.info },
  qEnunciado: { fontSize: 16, color: colors.onSurface, lineHeight: 24, marginBottom: spacing.lg, fontWeight: '500' },
  alt: { flexDirection: 'row', backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1.5, borderColor: colors.border, gap: spacing.md, alignItems: 'flex-start' },
  altSelected: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  altCorrect: { borderColor: colors.success, backgroundColor: '#F0FDF4' },
  altWrong: { borderColor: colors.error, backgroundColor: '#FEF2F2' },
  altLetter: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceTertiary, alignItems: 'center', justifyContent: 'center' },
  altLetterText: { fontWeight: '800', color: colors.onSurface },
  altText: { flex: 1, color: colors.onSurface, fontSize: 14, lineHeight: 20 },
  explain: { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, backgroundColor: colors.surfaceSecondary, marginTop: spacing.md },
  explainTitle: { fontSize: 15, fontWeight: '800', color: colors.onSurface, marginBottom: 6 },
  explainText: { fontSize: 14, color: colors.onSurfaceSecondary, lineHeight: 20 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, paddingBottom: 28, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  primaryBtn: { backgroundColor: colors.brandPrimary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.4 },

  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },

  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },

  xpBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.warning,
  },

  streakResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: spacing.sm,
  },

  streakResultText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurfaceSecondary,
  },

});
