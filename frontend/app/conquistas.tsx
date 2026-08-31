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

type Conquista = {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  desbloqueada: boolean;
  progresso: number;
  meta: number;
};

type Dados = {
  nivel: number;
  xp: number;
  xp_nivel: number;
  xp_proximo_nivel: number;
  desbloqueadas: number;
  total: number;
  conquistas: Conquista[];
};

export default function Conquistas() {
  const router = useRouter();
  const [data, setData] = useState<Dados | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    setLoading(true);

    try {
      const d = await apiFetch('/conquistas');
      setData(d);
    } catch (e: any) {
      Alert.alert(
        'Erro',
        e?.message || 'Não foi possível carregar suas conquistas.'
      );
    } finally {
      setLoading(false);
    }
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
          Não foi possível carregar suas conquistas.
        </Text>
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
          <Text style={styles.title}>Conquistas</Text>
          <Text style={styles.subtitle}>
            Continue evoluindo até a aprovação
          </Text>
        </View>
      </View>

      <View style={styles.levelCard}>
        <View>
          <Text style={styles.levelLabel}>Seu nível</Text>
          <Text style={styles.levelValue}>{data.nivel}</Text>
        </View>

        <View style={styles.levelInfo}>
          <Text style={styles.xpValue}>{data.xp} XP</Text>
          <Text style={styles.xpNext}>
            {data.xp_proximo_nivel} XP para o próximo nível
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${data.xp_nivel}%`,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.summary}>
        <Ionicons
          name="medal-outline"
          size={22}
          color={colors.warning}
        />

        <Text style={styles.summaryText}>
          {data.desbloqueadas} de {data.total} conquistas desbloqueadas
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Medalhas</Text>

      <View style={styles.grid}>
        {data.conquistas.map((c) => {
          const pct = Math.min(
            100,
            Math.round((c.progresso / Math.max(c.meta, 1)) * 100)
          );

          return (
            <View
              key={c.id}
              style={[
                styles.card,
                c.desbloqueada && styles.cardUnlocked,
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  c.desbloqueada && styles.iconUnlocked,
                ]}
              >
                <Ionicons
                  name={c.icone as any}
                  size={26}
                  color={
                    c.desbloqueada
                      ? colors.warning
                      : colors.onSurfaceTertiary
                  }
                />
              </View>

              <Text
                style={[
                  styles.cardTitle,
                  !c.desbloqueada && styles.lockedText,
                ]}
              >
                {c.titulo}
              </Text>

              <Text style={styles.cardDesc}>
                {c.descricao}
              </Text>

              <View style={styles.cardProgressTrack}>
                <View
                  style={[
                    styles.cardProgressFill,
                    {
                      width: `${pct}%`,
                    },
                  ]}
                />
              </View>

              <Text style={styles.cardProgressText}>
                {c.progresso} / {c.meta}
              </Text>

              {c.desbloqueada && (
                <View style={styles.unlockedBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={colors.success}
                  />
                  <Text style={styles.unlockedText}>
                    Desbloqueada
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
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

  levelCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },

  levelLabel: {
    fontSize: 12,
    color: colors.onSurfaceTertiary,
  },

  levelValue: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.onSurface,
  },

  levelInfo: {
    marginTop: spacing.sm,
  },

  xpValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.brandPrimary,
  },

  xpNext: {
    fontSize: 11,
    color: colors.onSurfaceTertiary,
    marginTop: 2,
  },

  progressTrack: {
    height: 8,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: spacing.md,
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.brandPrimary,
  },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  summaryText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  card: {
    width: '47.5%',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cardUnlocked: {
    borderColor: colors.warning,
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceTertiary,
    marginBottom: spacing.sm,
  },

  iconUnlocked: {
    backgroundColor: '#FEF3C7',
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.onSurface,
  },

  lockedText: {
    color: colors.onSurfaceSecondary,
  },

  cardDesc: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.onSurfaceTertiary,
    marginTop: 4,
    minHeight: 32,
  },

  cardProgressTrack: {
    height: 5,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: spacing.md,
  },

  cardProgressFill: {
    height: '100%',
    backgroundColor: colors.brandPrimary,
  },

  cardProgressText: {
    fontSize: 10,
    color: colors.onSurfaceTertiary,
    marginTop: 4,
  },

  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },

  unlockedText: {
    fontSize: 10,
    color: colors.success,
    fontWeight: '700',
  },

  emptyText: {
    color: colors.onSurfaceTertiary,
  },
});
