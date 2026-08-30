import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { apiFetch } from '@/src/api/client';
import { colors, spacing, radius, shadow } from '@/src/theme/tokens';

type Disciplina = {
  id: string;
  nome: string;
  cor?: string;
};

export default function PlanoEstudos() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [metaQuestoes, setMetaQuestoes] = useState(20);
  const [minutosDia, setMinutosDia] = useState(120);
  const [diasSemana, setDiasSemana] = useState(5);

  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [planoData, disciplinasData] = await Promise.all([
        apiFetch('/plano-estudos'),
        apiFetch('/disciplinas'),
      ]);

      const plano = planoData.plano || {};

      setMetaQuestoes(plano.meta_questoes ?? 20);
      setMinutosDia(plano.minutos_dia ?? 120);
      setDiasSemana(plano.dias_semana ?? 5);
      setSelecionadas(plano.disciplinas ?? []);

      setDisciplinas(disciplinasData.disciplinas || []);
    } catch (e: any) {
      Alert.alert(
        'Erro',
        e?.message || 'Não foi possível carregar seu plano de estudos.'
      );
    } finally {
      setLoading(false);
    }
  };

  const alterarNumero = (
    valor: number,
    setValor: (v: number) => void,
    delta: number,
    minimo: number,
    maximo: number
  ) => {
    const novo = Math.min(maximo, Math.max(minimo, valor + delta));
    setValor(novo);
  };

  const toggleDisciplina = (id: string) => {
    setSelecionadas((atual) =>
      atual.includes(id)
        ? atual.filter((x) => x !== id)
        : [...atual, id]
    );
  };

  const salvar = async () => {
    setSaving(true);

    try {
      await apiFetch('/plano-estudos', {
        method: 'PUT',
        body: JSON.stringify({
          meta_questoes: metaQuestoes,
          minutos_dia: minutosDia,
          dias_semana: diasSemana,
          disciplinas: selecionadas,
        }),
      });

      Alert.alert('Plano salvo', 'Seu plano de estudos foi atualizado.');
    } catch (e: any) {
      Alert.alert(
        'Erro',
        e?.message || 'Não foi possível salvar o plano.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.onSurface}
          />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Plano de Estudos</Text>
          <Text style={styles.subtitle}>
            Organize sua rotina até a aprovação
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Metas diárias</Text>

      <CounterCard
        icon="help-circle"
        title="Questões por dia"
        value={metaQuestoes}
        suffix=" questões"
        onMinus={() =>
          alterarNumero(metaQuestoes, setMetaQuestoes, -5, 5, 200)
        }
        onPlus={() =>
          alterarNumero(metaQuestoes, setMetaQuestoes, 5, 5, 200)
        }
      />

      <CounterCard
        icon="time"
        title="Tempo de estudo"
        value={minutosDia}
        suffix=" min"
        onMinus={() =>
          alterarNumero(minutosDia, setMinutosDia, -30, 30, 720)
        }
        onPlus={() =>
          alterarNumero(minutosDia, setMinutosDia, 30, 30, 720)
        }
      />

      <CounterCard
        icon="calendar"
        title="Dias por semana"
        value={diasSemana}
        suffix={diasSemana === 1 ? ' dia' : ' dias'}
        onMinus={() =>
          alterarNumero(diasSemana, setDiasSemana, -1, 1, 7)
        }
        onPlus={() =>
          alterarNumero(diasSemana, setDiasSemana, 1, 1, 7)
        }
      />

      <View style={styles.summary}>
        <Ionicons
          name="stats-chart"
          size={22}
          color={colors.brandPrimary}
        />

        <View style={{ flex: 1 }}>
          <Text style={styles.summaryTitle}>Sua meta semanal</Text>
          <Text style={styles.summaryText}>
            {metaQuestoes * diasSemana} questões •{' '}
            {Math.round((minutosDia * diasSemana) / 60)} horas de estudo
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Disciplinas prioritárias</Text>

      <Text style={styles.helper}>
        Selecione as matérias que deseja priorizar no seu plano.
      </Text>

      <View style={styles.disciplinas}>
        {disciplinas.map((disciplina) => {
          const ativa = selecionadas.includes(disciplina.id);

          return (
            <Pressable
              key={disciplina.id}
              onPress={() => toggleDisciplina(disciplina.id)}
              style={[
                styles.disciplina,
                ativa && styles.disciplinaAtiva,
              ]}
            >
              <Ionicons
                name={ativa ? 'checkmark-circle' : 'book-outline'}
                size={20}
                color={
                  ativa
                    ? colors.brandPrimary
                    : colors.onSurfaceTertiary
                }
              />

              <Text
                style={[
                  styles.disciplinaText,
                  ativa && styles.disciplinaTextAtiva,
                ]}
              >
                {disciplina.nome}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={salvar}
        disabled={saving}
        style={({ pressed }) => [
          styles.save,
          pressed && { opacity: 0.9 },
          saving && { opacity: 0.7 },
        ]}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="save-outline" size={20} color="#fff" />
            <Text style={styles.saveText}>Salvar meu plano</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

function CounterCard({
  icon,
  title,
  value,
  suffix,
  onMinus,
  onPlus,
}: {
  icon: any;
  title: string;
  value: number;
  suffix: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.counterCard}>
      <View style={styles.counterInfo}>
        <View style={styles.counterIcon}>
          <Ionicons
            name={icon}
            size={22}
            color={colors.brandPrimary}
          />
        </View>

        <View>
          <Text style={styles.counterTitle}>{title}</Text>
          <Text style={styles.counterValue}>
            {value}
            {suffix}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable onPress={onMinus} style={styles.control}>
          <Ionicons name="remove" size={20} color={colors.onSurface} />
        </Pressable>

        <Pressable onPress={onPlus} style={styles.control}>
          <Ionicons name="add" size={20} color={colors.onSurface} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  content: {
    padding: spacing.xl,
    paddingTop: 55,
    paddingBottom: 50,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.onSurface,
  },

  subtitle: {
    fontSize: 13,
    color: colors.onSurfaceTertiary,
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },

  helper: {
    fontSize: 13,
    color: colors.onSurfaceTertiary,
    marginTop: -6,
    marginBottom: spacing.md,
  },

  counterCard: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow.card,
  },

  counterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  counterIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  counterTitle: {
    fontSize: 13,
    color: colors.onSurfaceTertiary,
  },

  counterValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 2,
  },

  controls: {
    flexDirection: 'row',
    gap: 8,
  },

  control: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },

  summaryTitle: {
    fontWeight: '700',
    color: colors.onSurface,
  },

  summaryText: {
    fontSize: 12,
    color: colors.onSurfaceTertiary,
    marginTop: 3,
  },

  disciplinas: {
    gap: spacing.sm,
  },

  disciplina: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  disciplinaAtiva: {
    borderColor: colors.brandPrimary,
  },

  disciplinaText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurfaceSecondary,
  },

  disciplinaTextAtiva: {
    color: colors.brandPrimary,
  },

  save: {
    marginTop: spacing.xl,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  saveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
