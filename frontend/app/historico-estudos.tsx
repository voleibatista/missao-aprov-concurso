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

type Sessao = {
  session_id: string;
  task_id?: string | null;
  minutos: number;
  created_at?: string;
  disciplina_nome?: string;
};

type Dia = {
  data: string;
  minutos: number;
  sessoes: number;
};

type Historico = {
  sessoes: Sessao[];
  total_minutos: number;
  resumo: {
    minutos_hoje: number;
    sessoes_hoje: number;
    minutos_7_dias: number;
    sessoes_7_dias: number;
  };
  ultimos_7_dias: Dia[];
};

export default function HistoricoEstudos() {
  const router = useRouter();
  const [data, setData] = useState<Historico | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    setLoading(true);

    try {
      const d = await apiFetch('/sessoes-estudo');
      setData(d);
    } catch (e: any) {
      Alert.alert(
        'Erro',
        e?.message || 'Não foi possível carregar seu histórico.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatarMinutos = (minutos: number) => {
    if (minutos < 60) return `${minutos} min`;

    const h = Math.floor(minutos / 60);
    const m = minutos % 60;

    return m ? `${h}h ${m}min` : `${h}h`;
  };

  const formatarDia = (iso: string) => {
    const [ano, mes, dia] = iso.split('-').map(Number);
    const d = new Date(ano, mes - 1, dia);

    return d.toLocaleDateString('pt-BR', {
      weekday: 'short',
    }).replace('.', '');
  };

  const formatarDataHora = (iso?: string) => {
    if (!iso) return '';

    const d = new Date(iso);

    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={colors.brandPrimary}
        />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.loading}>
        <Text style={styles.emptyText}>
          Não foi possível carregar o histórico.
        </Text>
      </View>
    );
  }

  const maiorDia = Math.max(
    1,
    ...data.ultimos_7_dias.map((d) => d.minutos)
  );

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
          <Text style={styles.title}>Histórico de Estudos</Text>
          <Text style={styles.subtitle}>
            Acompanhe seu tempo de preparação
          </Text>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Ionicons
            name="today-outline"
            size={22}
            color={colors.brandPrimary}
          />
          <Text style={styles.summaryValue}>
            {formatarMinutos(data.resumo.minutos_hoje)}
          </Text>
          <Text style={styles.summaryLabel}>Hoje</Text>
          <Text style={styles.summarySmall}>
            {data.resumo.sessoes_hoje} sessão(ões)
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Ionicons
            name="calendar-outline"
            size={22}
            color={colors.brandPrimary}
          />
          <Text style={styles.summaryValue}>
            {formatarMinutos(data.resumo.minutos_7_dias)}
          </Text>
          <Text style={styles.summaryLabel}>Últimos 7 dias</Text>
          <Text style={styles.summarySmall}>
            {data.resumo.sessoes_7_dias} sessão(ões)
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Últimos 7 dias</Text>

      <View style={styles.weekCard}>
        {data.ultimos_7_dias.map((dia) => {
          const pct = Math.round((dia.minutos / maiorDia) * 100);

          return (
            <View key={dia.data} style={styles.dayRow}>
              <Text style={styles.dayName}>
                {formatarDia(dia.data)}
              </Text>

              <View style={styles.dayTrack}>
                <View
                  style={[
                    styles.dayBar,
                    {
                      width: `${pct}%`,
                    },
                  ]}
                />
              </View>

              <Text style={styles.dayMinutes}>
                {dia.minutos} min
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Sessões recentes</Text>

      {data.sessoes.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="time-outline"
            size={40}
            color={colors.onSurfaceTertiary}
          />

          <Text style={styles.emptyTitle}>
            Nenhuma sessão registrada
          </Text>

          <Text style={styles.emptyText}>
            Use o Pomodoro para começar a registrar seu tempo de estudo.
          </Text>
        </View>
      ) : (
        data.sessoes.slice(0, 20).map((sessao) => (
          <View
            key={sessao.session_id}
            style={styles.sessionCard}
          >
            <View style={styles.sessionIcon}>
              <Ionicons
                name="stopwatch-outline"
                size={20}
                color={colors.brandPrimary}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.sessionTitle}>
                {sessao.disciplina_nome || 'Sessão de estudo'}
              </Text>

              <Text style={styles.sessionDate}>
                {formatarDataHora(sessao.created_at)}
              </Text>
            </View>

            <Text style={styles.sessionMinutes}>
              {sessao.minutos} min
            </Text>
          </View>
        ))
      )}
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
    padding: spacing.xl,
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

  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },

  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.onSurface,
    marginTop: 8,
  },

  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurfaceSecondary,
    marginTop: 2,
  },

  summarySmall: {
    fontSize: 11,
    color: colors.onSurfaceTertiary,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  weekCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 12,
  },

  dayName: {
    width: 34,
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurfaceSecondary,
    textTransform: 'capitalize',
  },

  dayTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 999,
    overflow: 'hidden',
  },

  dayBar: {
    height: '100%',
    backgroundColor: colors.brandPrimary,
    borderRadius: 999,
  },

  dayMinutes: {
    width: 55,
    textAlign: 'right',
    fontSize: 11,
    color: colors.onSurfaceTertiary,
  },

  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },

  sessionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandTertiary,
  },

  sessionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },

  sessionDate: {
    fontSize: 11,
    color: colors.onSurfaceTertiary,
    marginTop: 3,
  },

  sessionMinutes: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brandPrimary,
  },

  emptyCard: {
    alignItems: 'center',
    paddingVertical: 35,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },

  emptyText: {
    marginTop: 6,
    fontSize: 12,
    color: colors.onSurfaceTertiary,
    textAlign: 'center',
  },
});
