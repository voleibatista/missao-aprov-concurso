import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { colors, spacing, radius, shadow } from '@/src/theme/tokens';

const NIVEIS = [
  { id: 'iniciante', label: 'Iniciante', desc: 'Nunca estudei para concurso' },
  { id: 'intermediario', label: 'Intermediário', desc: 'Já estudei um pouco' },
  { id: 'avancado', label: 'Avançado', desc: 'Já fiz várias provas' },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [concursos, setConcursos] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [horas, setHoras] = useState(3);
  const [nivel, setNivel] = useState('iniciante');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  useEffect(() => {
    apiFetch('/concursos').then((d) => setConcursos(d.concursos)).catch(() => {});
  }, []);

  const finish = async () => {
    setLoading(true);
    try {
      await apiFetch('/onboarding', { method: 'POST', body: JSON.stringify({ concurso_id: selected, horas_dia: horas, nivel }) });
      await refresh();
      router.replace('/(tabs)');
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.dots}>
          {[0,1,2].map(i => (<View key={i} style={[styles.dot, i <= step && styles.dotActive]} />))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }}>
        {step === 0 && (
          <>
            <Text style={styles.title}>Qual concurso você quer conquistar? 🎯</Text>
            <Text style={styles.subtitle}>Escolha um concurso para personalizar seus estudos.</Text>
            {concursos.map((c) => (
              <Pressable key={c.id} testID={`concurso-${c.id}`} onPress={() => setSelected(c.id)} style={[styles.optCard, selected === c.id && styles.optCardActive]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optTitle}>{c.nome}</Text>
                  <Text style={styles.optDesc}>{c.orgao} • {c.banca}</Text>
                  <Text style={styles.optMeta}>{c.vagas} vagas • R$ {c.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                </View>
                {selected === c.id && <Ionicons name="checkmark-circle" size={24} color={colors.brandPrimary} />}
              </Pressable>
            ))}
          </>
        )}
        {step === 1 && (
          <>
            <Text style={styles.title}>Quantas horas por dia? ⏱️</Text>
            <Text style={styles.subtitle}>Vamos calcular seu plano ideal.</Text>
            <View style={styles.hoursRow}>
              {[1,2,3,4,5,6,8].map((h) => (
                <Pressable key={h} testID={`hours-${h}`} onPress={() => setHoras(h)} style={[styles.hourChip, horas === h && styles.hourChipActive]}>
                  <Text style={[styles.hourText, horas === h && styles.hourTextActive]}>{h}h</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        {step === 2 && (
          <>
            <Text style={styles.title}>Qual seu nível? 📚</Text>
            <Text style={styles.subtitle}>Ajustaremos a dificuldade das aulas e questões.</Text>
            {NIVEIS.map((n) => (
              <Pressable key={n.id} testID={`nivel-${n.id}`} onPress={() => setNivel(n.id)} style={[styles.optCard, nivel === n.id && styles.optCardActive]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optTitle}>{n.label}</Text>
                  <Text style={styles.optDesc}>{n.desc}</Text>
                </View>
                {nivel === n.id && <Ionicons name="checkmark-circle" size={24} color={colors.brandPrimary} />}
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <Pressable testID="onboarding-back-btn" onPress={() => setStep(step - 1)} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Voltar</Text>
          </Pressable>
        )}
        <Pressable
          testID="onboarding-next-btn"
          disabled={(step === 0 && !selected) || loading}
          onPress={() => { if (step < 2) setStep(step + 1); else finish(); }}
          style={[styles.primaryBtn, ((step === 0 && !selected) || loading) && styles.disabled]}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{step === 2 ? 'Começar 🚀' : 'Próximo'}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingTop: 60, paddingHorizontal: spacing.xl, paddingBottom: spacing.md, backgroundColor: colors.surface },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { width: 32, height: 4, borderRadius: 2, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.brandPrimary },
  title: { fontSize: 24, fontWeight: '800', color: colors.onSurface, marginBottom: spacing.sm, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: colors.onSurfaceTertiary, marginBottom: spacing.lg },
  optCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1.5, borderColor: colors.border, ...shadow.card },
  optCardActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  optTitle: { fontSize: 15, fontWeight: '700', color: colors.onSurface },
  optDesc: { fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 2 },
  optMeta: { fontSize: 12, color: colors.brandPrimary, marginTop: 4, fontWeight: '600' },
  hoursRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  hourChip: { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.surfaceSecondary, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, minWidth: 64, alignItems: 'center' },
  hourChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  hourText: { fontWeight: '700', color: colors.onSurface },
  hourTextActive: { color: '#fff' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.xl, paddingBottom: 32, backgroundColor: colors.surface, flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  primaryBtn: { flex: 1, backgroundColor: colors.brandPrimary, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
  secondaryBtnText: { color: colors.onSurface, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
