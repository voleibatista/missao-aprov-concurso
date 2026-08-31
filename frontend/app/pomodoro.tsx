import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { apiFetch } from '@/src/api/client';
import { colors, spacing, radius } from '@/src/theme/tokens';

export default function Pomodoro() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    task_id?: string;
    disciplina?: string;
  }>();

  const [secs, setSecs] = useState(25 * 60);
  const [run, setRun] = useState(false);
  const [duracao, setDuracao] = useState(25);
  const [saving, setSaving] = useState(false);
  const [registrado, setRegistrado] = useState(false);

  useEffect(() => {
    if (!run) return;

    const id = setInterval(() => {
      setSecs((v) => (v > 0 ? v - 1 : 0));
    }, 1000);

    return () => clearInterval(id);
  }, [run]);

  useEffect(() => {
    if (secs === 0 && run) {
      setRun(false);
      concluirSessao();
    }
  }, [secs, run]);

  const reset = (m: number) => {
    setRun(false);
    setDuracao(m);
    setSecs(m * 60);
    setRegistrado(false);
  };

  const concluirSessao = async () => {
    if (registrado || saving) return;

    setSaving(true);

    try {
      const r = await apiFetch('/sessoes-estudo', {
        method: 'POST',
        body: JSON.stringify({
          task_id: params.task_id || null,
          minutos: duracao,
        }),
      });

      setRegistrado(true);

      const xp = r.xp_gain ?? Math.max(1, Math.floor(duracao / 5));
      const streak = r.streak ?? 0;

      Alert.alert(
        'Sessão concluída',
        `${duracao} minutos registrados • +${xp} XP${streak > 0 ? ` • ${streak} dia(s) de sequência` : ''}.`,
        [
          {
            text: 'Continuar aqui',
          },
          {
            text: 'Voltar ao calendário',
            onPress: () => router.push('/calendario-estudos'),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert(
        'Erro',
        e?.message || 'Não foi possível registrar a sessão.'
      );
    } finally {
      setSaving(false);
    }
  };

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');

  return (
    <View style={s.c}>
      <Pressable style={s.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
      </Pressable>

      <Text style={s.h}>Pomodoro</Text>

      {params.disciplina ? (
        <View style={s.taskBox}>
          <Ionicons
            name="book-outline"
            size={18}
            color={colors.brandPrimary}
          />
          <Text style={s.taskText}>{params.disciplina}</Text>
        </View>
      ) : null}

      <Text style={s.time}>
        {mm}:{ss}
      </Text>

      {saving ? (
        <ActivityIndicator
          size="large"
          color={colors.brandPrimary}
          style={{ marginVertical: 10 }}
        />
      ) : (
        <Pressable
          style={s.btn}
          onPress={() => setRun(!run)}
          disabled={registrado}
        >
          <Text style={s.bt}>
            {registrado
              ? 'Sessão registrada'
              : run
              ? 'Pausar'
              : 'Iniciar'}
          </Text>
        </Pressable>
      )}

      <View style={s.row}>
        <Pressable style={s.alt} onPress={() => reset(25)}>
          <Text style={s.altText}>25 min</Text>
        </Pressable>

        <Pressable style={s.alt} onPress={() => reset(50)}>
          <Text style={s.altText}>50 min</Text>
        </Pressable>

        <Pressable style={s.alt} onPress={() => reset(5)}>
          <Text style={s.altText}>Pausa 5 min</Text>
        </Pressable>
      </View>

      {params.task_id && !registrado ? (
        <Pressable
          style={s.finish}
          onPress={concluirSessao}
          disabled={saving}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={20}
            color={colors.brandPrimary}
          />
          <Text style={s.finishText}>
            Registrar sessão agora
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  c: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  back: {
    position: 'absolute',
    top: 55,
    left: 24,
  },

  h: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.onSurface,
  },

  taskBox: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },

  taskText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },

  time: {
    fontSize: 64,
    fontWeight: '800',
    marginVertical: 35,
    color: colors.brandPrimary,
  },

  btn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 15,
    paddingHorizontal: 55,
    borderRadius: radius.md,
  },

  bt: {
    color: '#fff',
    fontWeight: '800',
  },

  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  alt: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },

  altText: {
    color: colors.onSurface,
    fontWeight: '600',
  },

  finish: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  finishText: {
    color: colors.brandPrimary,
    fontWeight: '700',
  },
});
