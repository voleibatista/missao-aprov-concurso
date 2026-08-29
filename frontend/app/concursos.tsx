import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { colors, spacing, radius, shadow } from '@/src/theme/tokens';

export default function Concursos() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const router = useRouter();
  const { user, refresh } = useAuth();

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const d = await apiFetch(`/concursos${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      setItems(d.concursos);
    } finally { setLoading(false); }
  };

  const escolher = async (id: string) => {
    if (user?.concurso_id === id) return;

    setSaving(id);

    try {
      await apiFetch('/auth/concurso', {
        method: 'PATCH',
        body: JSON.stringify({ concurso_id: id }),
      });

      await refresh();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Erro ao trocar concurso:', error);
    } finally {
      setSaving(null);
    }
  };

  return (
    <View testID="concursos-screen" style={styles.container}>
      <View style={styles.header}>
        <Pressable testID="concursos-back" onPress={() => router.back()}><Ionicons name="chevron-back" size={26} color={colors.onSurface} /></Pressable>
        <Text style={styles.title}>Encontre seu concurso</Text>
      </View>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.info} />
        <TextInput
          testID="concursos-search"
          value={q}
          onChangeText={setQ}
          onSubmitEditing={load}
          placeholder="Nome, órgão ou cargo..."
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
      </View>

      {loading ? <ActivityIndicator color={colors.brandPrimary} size="large" style={{ marginTop: 32 }} /> : (
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 40 }}>
          {items.map((c) => {
            const active = user?.concurso_id === c.id;
            return (
              <View key={c.id} style={[styles.card, active && styles.cardActive]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={styles.situacaoBadge}><Text style={styles.situacaoText}>{c.situacao}</Text></View>
                  <Text style={styles.salario}>R$ {c.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                </View>
                <Text style={styles.cardTitle}>{c.nome}</Text>
                <Text style={styles.cardDesc}>{c.orgao}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="briefcase" size={13} color={colors.brandPrimary} />
                  <Text style={styles.metaText}>{c.cargo}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="people" size={13} color={colors.brandPrimary} />
                  <Text style={styles.metaText}>{c.vagas} vagas • {c.banca}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar" size={13} color={colors.brandPrimary} />
                  <Text style={styles.metaText}>Prova: {c.data_prova}</Text>
                </View>
                <Pressable
                  testID={`escolher-${c.id}`}
                  disabled={saving === c.id}
                  onPress={() => {
                    if (!active) {
                      escolher(c.id);
                    }
                  }}
                  style={[
                    styles.btn,
                    active && { backgroundColor: colors.success, opacity: 0.9 }
                  ]}
                >
                  {saving === c.id ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>
                      {active ? '✓ Concurso ativo' : 'Trocar para este concurso'}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          })}
          {items.length === 0 && <Text style={styles.empty}>Nenhum concurso encontrado.</Text>}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: 60, paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  title: { fontSize: 20, fontWeight: '800', color: colors.onSurface },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, marginHorizontal: spacing.xl, borderRadius: radius.md, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, paddingVertical: 10, color: colors.onSurface, fontSize: 14 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  cardActive: { borderColor: colors.brandPrimary, borderWidth: 2 },
  situacaoBadge: { backgroundColor: colors.brandTertiary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  situacaoText: { color: colors.brandPrimary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  salario: { color: colors.brand, fontWeight: '800', fontSize: 13 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: colors.onSurface, marginTop: spacing.sm, letterSpacing: -0.3 },
  cardDesc: { fontSize: 13, color: colors.onSurfaceTertiary, marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { color: colors.onSurfaceSecondary, fontSize: 13 },
  btn: { backgroundColor: colors.brandPrimary, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', marginTop: spacing.md },
  btnText: { color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.info, marginTop: 32 },
});
