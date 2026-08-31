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

type Tarefa = {
  task_id: string;
  data: string;
  disciplina_id: string;
  disciplina_nome: string;
  titulo: string;
  minutos: number;
  meta_questoes: number;
  concluida: boolean;
};

type Progresso = {
  total: number;
  concluidas: number;
  percentual: number;
  minutos_planejados: number;
  minutos_concluidos: number;
};

const DIAS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export default function CalendarioEstudos() {
  const router = useRouter();

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [progresso, setProgresso] = useState<Progresso>({
    total: 0,
    concluidas: 0,
    percentual: 0,
    minutos_planejados: 0,
    minutos_concluidos: 0,
  });

  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [alterando, setAlterando] = useState<string | null>(null);

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    setLoading(true);

    try {
      const data = await apiFetch('/calendario');

      setTarefas(data.tarefas || []);
      setProgresso(data.progresso || {
        total: 0,
        concluidas: 0,
        percentual: 0,
        minutos_planejados: 0,
        minutos_concluidos: 0,
      });
    } catch (e: any) {
      Alert.alert(
        'Erro',
        e?.message || 'Não foi possível carregar o calendário.'
      );
    } finally {
      setLoading(false);
    }
  };

  const gerarSemana = async () => {
    setGerando(true);

    try {
      const data = await apiFetch('/calendario/gerar-semana', {
        method: 'POST',
      });

      if (data.tarefas_criadas === 0) {
        Alert.alert(
          'Calendário',
          'A semana já está organizada.'
        );
      } else {
        Alert.alert(
          'Semana criada',
          `${data.tarefas_criadas} tarefa(s) adicionada(s) ao calendário.`
        );
      }

      await carregar();
    } catch (e: any) {
      Alert.alert(
        'Não foi possível gerar a semana',
        e?.message || 'Verifique seu Plano de Estudos.'
      );
    } finally {
      setGerando(false);
    }
  };

  const alternar = async (tarefa: Tarefa) => {
    setAlterando(tarefa.task_id);

    try {
      await apiFetch(`/calendario/${tarefa.task_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          concluida: !tarefa.concluida,
        }),
      });

      await carregar();
    } catch (e: any) {
      Alert.alert(
        'Erro',
        e?.message || 'Não foi possível atualizar a tarefa.'
      );
    } finally {
      setAlterando(null);
    }
  };

  const formatarData = (data: string) => {
    const [ano, mes, dia] = data.split('-').map(Number);
    const d = new Date(ano, mes - 1, dia);

    return {
      diaSemana: DIAS[d.getDay()],
      dataCurta: `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`,
    };
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
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.onSurface}
          />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Calendário de Estudos</Text>
          <Text style={styles.subtitle}>
            Acompanhe sua semana de preparação
          </Text>
        </View>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.progressLabel}>
              Progresso da semana
            </Text>

            <Text style={styles.progressValue}>
              {progresso.concluidas}/{progresso.total} tarefas
            </Text>
          </View>

          <Text style={styles.percentual}>
            {Math.round(progresso.percentual)}%
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(
                  100,
                  Math.max(0, progresso.percentual)
                )}%`,
              },
            ]}
          />
        </View>

        <Text style={styles.progressDetail}>
          {Math.round(progresso.minutos_concluidos / 60)}h concluídas de{' '}
          {Math.round(progresso.minutos_planejados / 60)}h planejadas
        </Text>
      </View>

      <Pressable
        onPress={gerarSemana}
        disabled={gerando}
        style={styles.generate}
      >
        {gerando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons
              name="calendar-outline"
              size={20}
              color="#fff"
            />
            <Text style={styles.generateText}>
              Organizar minha semana
            </Text>
          </>
        )}
      </Pressable>

      <Text style={styles.sectionTitle}>Minha semana</Text>

      {tarefas.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name="calendar-clear-outline"
            size={48}
            color={colors.onSurfaceTertiary}
          />

          <Text style={styles.emptyTitle}>
            Sua semana ainda está vazia
          </Text>

          <Text style={styles.emptyText}>
            Toque em “Organizar minha semana” para criar sua rotina
            automaticamente a partir do Plano de Estudos.
          </Text>
        </View>
      ) : (
        tarefas.map((tarefa) => {
          const data = formatarData(tarefa.data);
          const busy = alterando === tarefa.task_id;

          return (
            <View
              key={tarefa.task_id}
              style={[
                styles.taskCard,
                tarefa.concluida && styles.taskDone,
              ]}
            >
              <View style={styles.dateBox}>
                <Text style={styles.dateNumber}>
                  {data.dataCurta}
                </Text>

                <Text style={styles.dateDay}>
                  {data.diaSemana}
                </Text>
              </View>

              <View style={styles.taskContent}>
                <Text
                  style={[
                    styles.taskTitle,
                    tarefa.concluida && styles.taskTitleDone,
                  ]}
                >
                  {tarefa.disciplina_nome}
                </Text>

                <View style={styles.meta}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={colors.onSurfaceTertiary}
                  />

                  <Text style={styles.metaText}>
                    {tarefa.minutos} min
                  </Text>

                  <Ionicons
                    name="help-circle-outline"
                    size={14}
                    color={colors.onSurfaceTertiary}
                  />

                  <Text style={styles.metaText}>
                    {tarefa.meta_questoes} questões
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => alternar(tarefa)}
                disabled={busy}
                style={[
                  styles.check,
                  tarefa.concluida && styles.checkDone,
                ]}
              >
                {busy ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      tarefa.concluida
                        ? '#fff'
                        : colors.brandPrimary
                    }
                  />
                ) : (
                  <Ionicons
                    name={
                      tarefa.concluida
                        ? 'checkmark'
                        : 'ellipse-outline'
                    }
                    size={24}
                    color={
                      tarefa.concluida
                        ? '#fff'
                        : colors.brandPrimary
                    }
                  />
                )}
              </Pressable>
            </View>
          );
        })
      )}

      <Pressable
        onPress={() => router.push('/plano-estudos')}
        style={styles.planLink}
      >
        <Ionicons
          name="settings-outline"
          size={18}
          color={colors.brandPrimary}
        />

        <Text style={styles.planLinkText}>
          Ajustar Plano de Estudos
        </Text>
      </Pressable>
    </ScrollView>
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
    fontSize: 24,
    fontWeight: '800',
    color: colors.onSurface,
  },

  subtitle: {
    fontSize: 13,
    color: colors.onSurfaceTertiary,
    marginTop: 2,
  },

  progressCard: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadow.card,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  progressLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
  },

  progressValue: {
    color: colors.onSurface,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 3,
  },

  percentual: {
    color: colors.brandPrimary,
    fontSize: 24,
    fontWeight: '800',
  },

  progressTrack: {
    height: 9,
    backgroundColor: colors.surface,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: spacing.md,
  },

  progressBar: {
    height: '100%',
    backgroundColor: colors.brandPrimary,
    borderRadius: 999,
  },

  progressDetail: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    marginTop: spacing.sm,
  },

  generate: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingVertical: 14,
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  generateText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },

  taskDone: {
    opacity: 0.75,
  },

  dateBox: {
    width: 72,
  },

  dateNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.onSurface,
  },

  dateDay: {
    fontSize: 10,
    color: colors.onSurfaceTertiary,
    marginTop: 2,
  },

  taskContent: {
    flex: 1,
  },

  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },

  taskTitleDone: {
    textDecorationLine: 'line-through',
  },

  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 7,
  },

  metaText: {
    fontSize: 11,
    color: colors.onSurfaceTertiary,
    marginRight: 6,
  },

  check: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brandPrimary,
  },

  checkDone: {
    backgroundColor: colors.brandPrimary,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: spacing.lg,
  },

  emptyTitle: {
    color: colors.onSurface,
    fontSize: 17,
    fontWeight: '700',
    marginTop: spacing.md,
  },

  emptyText: {
    color: colors.onSurfaceTertiary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: spacing.sm,
  },

  planLink: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 13,
  },

  planLinkText: {
    color: colors.brandPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
