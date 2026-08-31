import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate } from 'react-native-reanimated';
import { apiFetch } from '@/src/api/client';
import { colors, spacing, radius, shadow } from '@/src/theme/tokens';

export default function Flashcards() {
  const [cards, setCards] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [recompensa, setRecompensa] = useState<{
    xp: number;
    streak: number;
  } | null>(null);
  const flipVal = useSharedValue(0);
  const router = useRouter();

  useEffect(() => {
    apiFetch('/flashcards').then((d) => {
      const due = d.flashcards.filter((f: any) => f.due);
      setCards(due.length ? due : d.flashcards.slice(0, 10));
      setLoading(false);
    });
  }, []);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flipVal.value, [0, 1], [0, 180])}deg` }],
    opacity: interpolate(flipVal.value, [0, 0.5, 1], [1, 0, 0]),
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flipVal.value, [0, 1], [180, 360])}deg` }],
    opacity: interpolate(flipVal.value, [0, 0.5, 1], [0, 0, 1]),
  }));

  const flip = () => { flipVal.value = withTiming(flipped ? 0 : 1, { duration: 400 }); setFlipped(!flipped); };

  const responder = async (resultado: string) => {
    const card = cards[idx];

    const r = await apiFetch('/flashcards/review', {
      method: 'POST',
      body: JSON.stringify({
        flashcard_id: card.id,
        resultado,
      }),
    });

    setRecompensa({
      xp: r.xp_gain ?? 5,
      streak: r.streak ?? 0,
    });

    setTimeout(() => {
      setRecompensa(null);
    }, 1800);

    flipVal.value = 0;
    setFlipped(false);

    if (idx + 1 < cards.length) {
      setIdx(idx + 1);
    } else {
      setDone(true);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.brandPrimary} /></View>;
  if (!cards.length || done) return (
    <View style={styles.center}>
      <Ionicons name="checkmark-circle" size={72} color={colors.success} />
      <Text style={styles.doneTitle}>Sessão concluída!</Text>
      <Text style={styles.doneText}>Ótimo trabalho. Volte amanhã para novas revisões.</Text>
      <Pressable testID="flashcards-back-btn" onPress={() => router.back()} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>Voltar</Text></Pressable>
    </View>
  );

  const card = cards[idx];

  return (
    <View testID="flashcards-screen" style={styles.container}>
      <View style={styles.header}>
        <Pressable testID="flashcards-close-btn" onPress={() => router.back()}><Ionicons name="close" size={26} color={colors.onSurface} /></Pressable>
        <Text style={styles.progress}>{idx + 1} / {cards.length}</Text>
        <View style={{ width: 26 }} />
      </View>

      {recompensa && (
        <View style={styles.rewardBanner}>
          <Ionicons
            name="trophy"
            size={17}
            color={colors.warning}
          />

          <Text style={styles.rewardXp}>
            +{recompensa.xp} XP
          </Text>

          {recompensa.streak > 0 && (
            <>
              <Text style={styles.rewardDivider}>•</Text>

              <Ionicons
                name="flame"
                size={16}
                color={colors.warning}
              />

              <Text style={styles.rewardStreak}>
                {recompensa.streak} dia(s)
              </Text>
            </>
          )}
        </View>
      )}

      <Pressable testID="flashcard-flip" onPress={flip} style={styles.cardArea}>
        <Animated.View style={[styles.card, frontStyle]}>
          <Text style={styles.side}>PERGUNTA</Text>
          <Text style={styles.cardText}>{card.frente}</Text>
          <Text style={styles.hint}>Toque para revelar</Text>
        </Animated.View>
        <Animated.View style={[styles.card, styles.cardBack, backStyle]}>
          <Text style={[styles.side, { color: colors.brandSecondary }]}>RESPOSTA</Text>
          <Text style={[styles.cardText, { color: '#fff' }]}>{card.verso}</Text>
        </Animated.View>
      </Pressable>

      {flipped ? (
        <View style={styles.actions}>
          <Pressable testID="fc-nao-lembro" onPress={() => responder('nao_lembro')} style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}><Text style={[styles.actionText, { color: colors.error }]}>Não lembro</Text></Pressable>
          <Pressable testID="fc-dificil" onPress={() => responder('dificil')} style={[styles.actionBtn, { backgroundColor: '#FEF3C7' }]}><Text style={[styles.actionText, { color: colors.warning }]}>Difícil</Text></Pressable>
          <Pressable testID="fc-lembrei" onPress={() => responder('lembrei')} style={[styles.actionBtn, { backgroundColor: colors.brandTertiary }]}><Text style={[styles.actionText, { color: colors.brandPrimary }]}>Lembrei</Text></Pressable>
          <Pressable testID="fc-facil" onPress={() => responder('facil')} style={[styles.actionBtn, { backgroundColor: colors.brandPrimary }]}><Text style={[styles.actionText, { color: '#fff' }]}>Fácil</Text></Pressable>
        </View>
      ) : (
        <View style={styles.actionsHint}><Text style={styles.hintFooter}>Pense na resposta, depois toque no cartão</Text></View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, padding: spacing.xl, gap: spacing.md },
  doneTitle: { fontSize: 22, fontWeight: '800', color: colors.onSurface },
  doneText: { color: colors.onSurfaceTertiary, textAlign: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  progress: { fontWeight: '700', color: colors.onSurface },
  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  card: { position: 'absolute', width: '100%', minHeight: 380, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1.5, borderColor: colors.border, padding: spacing.xl, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden', ...shadow.card },
  cardBack: { backgroundColor: colors.brand, borderColor: colors.brand },
  side: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: colors.brandPrimary, marginBottom: spacing.md },
  cardText: { fontSize: 20, fontWeight: '700', color: colors.onSurface, textAlign: 'center', lineHeight: 28, letterSpacing: -0.3 },
  hint: { position: 'absolute', bottom: 20, color: colors.info, fontSize: 12 },
  actions: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, paddingBottom: 28 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' },
  actionText: { fontWeight: '800', fontSize: 12 },
  actionsHint: { padding: spacing.lg, paddingBottom: 40, alignItems: 'center' },
  hintFooter: { color: colors.info, fontSize: 13 },
  primaryBtn: { backgroundColor: colors.brandPrimary, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 32, marginTop: spacing.md },
  primaryBtnText: { color: '#fff', fontWeight: '700' },

  rewardBanner: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: spacing.sm,
  },

  rewardXp: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '800',
  },

  rewardDivider: {
    color: colors.onSurfaceTertiary,
    marginHorizontal: 2,
  },

  rewardStreak: {
    color: colors.onSurfaceSecondary,
    fontSize: 12,
    fontWeight: '700',
  },

});
