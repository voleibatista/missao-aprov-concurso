import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '@/src/api/client';
import { colors, spacing, radius, shadow } from '@/src/theme/tokens';

type Stage = 'config' | 'running' | 'done';

export default function Simulado() {
  const [stage, setStage] = useState<Stage>('config');
  const [num, setNum] = useState(10);
  const [simuladoId, setSimuladoId] = useState<string | null>(null);
  const [questoes, setQuestoes] = useState<any[]>([]);
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [idx, setIdx] = useState(0);
  const [time, setTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (stage !== 'running') return;
    const t = setInterval(() => setTime((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [stage]);

  const start = async () => {
    setLoading(true);
    try {
      const d = await apiFetch('/simulado/start', { method: 'POST', body: JSON.stringify({ num_questoes: num }) });
      setSimuladoId(d.simulado_id); setQuestoes(d.questoes); setIdx(0); setRespostas({}); setTime(0);
      setStage('running');
    } catch (e: any) { console.warn(e); } finally { setLoading(false); }
  };

  const submit = async () => {
    setLoading(true);
    try {
      const d = await apiFetch('/simulado/submit', { method: 'POST', body: JSON.stringify({ simulado_id: simuladoId, respostas }) });
      setResult(d); setStage('done');
    } finally { setLoading(false); }
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2,'0')}:${(s % 60).toString().padStart(2,'0')}`;

  if (stage === 'config') {
    return (
      <ScrollView testID="simulado-config" style={styles.container} contentContainerStyle={{ padding: spacing.xl, paddingTop: 60, paddingBottom: 100 }}>
        <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={colors.onSurface} /></Pressable>
        <Text style={styles.h1}>Novo Simulado</Text>
        <Text style={styles.subtitle}>Configure e teste seus conhecimentos.</Text>

        <Text style={styles.label}>Número de questões</Text>
        <View style={styles.chipsRow}>
          {[5, 10, 20, 30].map((n) => (
            <Pressable key={n} testID={`sim-num-${n}`} onPress={() => setNum(n)} style={[styles.chip, num === n && styles.chipActive]}>
              <Text style={[styles.chipText, num === n && styles.chipTextActive]}>{n}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable testID="sim-start-btn" onPress={start} disabled={loading} style={[styles.primaryBtn, { marginTop: spacing.xl }]}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Começar simulado</Text>}
        </Pressable>
      </ScrollView>
    );
  }

  if (stage === 'running') {
    const q = questoes[idx];
    const answered = Object.keys(respostas).length;
    return (
      <View testID="simulado-run" style={styles.container}>
        <View style={styles.simHeader}>
          <Pressable testID="sim-exit-btn" onPress={() => setStage('config')}><Ionicons name="close" size={24} color={colors.onSurface} /></Pressable>
          <View style={styles.timerBox}><Ionicons name="time" size={14} color={colors.brandPrimary} /><Text style={styles.timer}>{fmtTime(time)}</Text></View>
          <Text style={styles.simCount}>{idx + 1}/{questoes.length}</Text>
        </View>
        <View style={styles.progressBar}><View style={[styles.progressBarFill, { width: `${((idx + 1) / questoes.length) * 100}%` }]} /></View>

        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 140 }}>
          <Text style={styles.simMeta}>{q.disciplina} • {q.banca}</Text>
          <Text style={styles.qText}>{q.enunciado}</Text>
          {q.alternativas.map((alt: string, i: number) => (
            <Pressable key={i} testID={`sim-alt-${i}`} onPress={() => setRespostas({ ...respostas, [q.id]: i })} style={[styles.alt, respostas[q.id] === i && styles.altSelected]}>
              <View style={[styles.altLetter, respostas[q.id] === i && { backgroundColor: colors.brandPrimary }]}><Text style={[styles.altLetterText, respostas[q.id] === i && { color: '#fff' }]}>{String.fromCharCode(65 + i)}</Text></View>
              <Text style={styles.altText}>{alt}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.simFooter}>
          <Pressable testID="sim-prev-btn" disabled={idx === 0} onPress={() => setIdx(idx - 1)} style={[styles.navBtn, idx === 0 && styles.disabled]}><Ionicons name="chevron-back" size={20} color={colors.onSurface} /></Pressable>
          {idx < questoes.length - 1 ? (
            <Pressable testID="sim-next-btn" onPress={() => setIdx(idx + 1)} style={styles.primaryBtnSm}><Text style={styles.primaryBtnText}>Próxima</Text></Pressable>
          ) : (
            <Pressable testID="sim-finish-btn" disabled={loading || answered === 0} onPress={submit} style={[styles.primaryBtnSm, (loading || answered === 0) && styles.disabled]}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Finalizar ({answered}/{questoes.length})</Text>}
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // done
  return (
    <ScrollView testID="simulado-result" style={styles.container} contentContainerStyle={{ padding: spacing.xl, paddingTop: 60 }}>
      <Text style={styles.h1}>Resultado</Text>
      <View style={styles.resultBox}>
        <Text style={styles.resultPct} testID="sim-result-pct">{result.percentual}%</Text>
        <Text style={styles.resultLabel}>{result.acertos} de {result.total} acertos</Text>
        <Text style={styles.resultXp}>+{result.xp_gain} XP</Text>
      </View>
      <Text style={styles.h2}>Por disciplina</Text>
      {Object.entries(result.por_disciplina || {}).map(([d, v]: any) => {
        const pct = v.total > 0 ? Math.round(100 * v.acertos / v.total) : 0;
        return (
          <View key={d} style={styles.discRow}>
            <Text style={styles.discName}>{d}</Text>
            <Text style={[styles.discPct, { color: pct >= 60 ? colors.success : colors.error }]}>{v.acertos}/{v.total} ({pct}%)</Text>
          </View>
        );
      })}
      <Pressable testID="sim-new-btn" onPress={() => { setStage('config'); setResult(null); }} style={[styles.primaryBtn, { marginTop: spacing.xl }]}><Text style={styles.primaryBtnText}>Novo simulado</Text></Pressable>
      <Pressable testID="sim-home-btn" onPress={() => router.replace('/(tabs)')} style={[styles.secondaryBtn, { marginTop: spacing.sm, marginBottom: 40 }]}><Text style={styles.secondaryBtnText}>Voltar ao início</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  h1: { fontSize: 28, fontWeight: '800', color: colors.onSurface, letterSpacing: -0.5, marginTop: spacing.md },
  h2: { fontSize: 16, fontWeight: '700', color: colors.onSurface, marginTop: spacing.xl, marginBottom: spacing.md },
  subtitle: { color: colors.onSurfaceTertiary, marginTop: 4, marginBottom: spacing.xl },
  label: { color: colors.onSurfaceSecondary, fontWeight: '600', marginBottom: spacing.sm },
  chipsRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.surfaceSecondary, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, minWidth: 60, alignItems: 'center' },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontWeight: '700', color: colors.onSurface },
  chipTextActive: { color: '#fff' },
  primaryBtn: { backgroundColor: colors.brandPrimary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  primaryBtnSm: { flex: 1, backgroundColor: colors.brandPrimary, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: { paddingVertical: 12, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
  secondaryBtnText: { color: colors.onSurface, fontWeight: '600' },
  simHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  timerBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brandTertiary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  timer: { fontWeight: '800', color: colors.brandPrimary, fontSize: 13 },
  simCount: { fontWeight: '700', color: colors.onSurface },
  progressBar: { height: 3, backgroundColor: colors.surfaceTertiary, marginHorizontal: spacing.xl, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: 3, backgroundColor: colors.brandPrimary },
  simMeta: { color: colors.brandPrimary, fontWeight: '700', fontSize: 11, letterSpacing: 0.5, marginBottom: spacing.sm, textTransform: 'uppercase' },
  qText: { fontSize: 15, color: colors.onSurface, lineHeight: 22, marginBottom: spacing.lg, fontWeight: '500' },
  alt: { flexDirection: 'row', backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1.5, borderColor: colors.border, gap: spacing.md, alignItems: 'flex-start' },
  altSelected: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  altLetter: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceTertiary, alignItems: 'center', justifyContent: 'center' },
  altLetterText: { fontWeight: '800', color: colors.onSurface, fontSize: 13 },
  altText: { flex: 1, color: colors.onSurface, fontSize: 14, lineHeight: 20 },
  simFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, paddingBottom: 28, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  navBtn: { width: 44, height: 44, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  resultBox: { backgroundColor: colors.brand, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', marginTop: spacing.lg },
  resultPct: { fontSize: 56, fontWeight: '900', color: '#fff', letterSpacing: -2 },
  resultLabel: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginTop: spacing.xs },
  resultXp: { color: colors.warning, fontWeight: '800', marginTop: spacing.md, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  discRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  discName: { color: colors.onSurface, fontWeight: '600', textTransform: 'capitalize' },
  discPct: { fontWeight: '800' },
});
