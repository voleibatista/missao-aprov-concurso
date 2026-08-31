import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { apiFetchForm } from '@/src/api/client';
import { colors, spacing, radius, shadow } from '@/src/theme/tokens';

export default function RedacaoEnem() {
  const router = useRouter();

  const [imagem, setImagem] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  const [loading, setLoading] = useState(false);
  const [correcao, setCorrecao] = useState<any>(null);

  const escolherGaleria = async () => {
    const permissao =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert(
        'Permissão necessária',
        'Precisamos acessar sua galeria para selecionar a redação.'
      );
      return;
    }

    const resultado =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

    if (!resultado.canceled && resultado.assets?.[0]) {
      setImagem(resultado.assets[0]);
    }
  };

  const tirarFoto = async () => {
    const permissao =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert(
        'Permissão necessária',
        'Precisamos usar a câmera para fotografar sua redação.'
      );
      return;
    }

    const resultado =
      await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

    if (!resultado.canceled && resultado.assets?.[0]) {
      setImagem(resultado.assets[0]);
    }
  };

  const corrigir = async () => {
    if (!imagem) {
      Alert.alert(
        'Envie sua redação',
        'Escolha uma imagem ou tire uma foto da redação.'
      );
      return;
    }

    setLoading(true);
    setCorrecao(null);

    try {
      const form = new FormData();

      const nome =
        imagem.fileName ||
        `redacao-${Date.now()}.jpg`;

      const tipo =
        imagem.mimeType ||
        'image/jpeg';

      form.append(
        'arquivo',
        {
          uri: imagem.uri,
          name: nome,
          type: tipo,
        } as any
      );

      const resposta = await apiFetchForm(
        '/redacao-enem/corrigir',
        form
      );

      setCorrecao(resposta.correcao);

    } catch (e: any) {
      Alert.alert(
        'Erro na correção',
        e?.message ||
          'Não foi possível corrigir sua redação.'
      );
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.title}>
            Correção de Redação
          </Text>

          <Text style={styles.subtitle}>
            Envie uma foto da sua redação do ENEM
          </Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Ionicons
          name="sparkles"
          size={24}
          color={colors.brandPrimary}
        />

        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>
            Correção com IA
          </Text>

          <Text style={styles.infoText}>
            Receba uma nota estimada e análise das 5 competências do ENEM.
          </Text>
        </View>
      </View>

      {imagem ? (
        <View style={styles.previewCard}>
          <Image
            source={{ uri: imagem.uri }}
            style={styles.preview}
            resizeMode="contain"
          />

          <Pressable
            onPress={() => setImagem(null)}
            style={styles.remove}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={colors.error}
            />

            <Text style={styles.removeText}>
              Remover imagem
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.empty}>
          <Ionicons
            name="document-text-outline"
            size={56}
            color={colors.onSurfaceTertiary}
          />

          <Text style={styles.emptyTitle}>
            Envie sua redação
          </Text>

          <Text style={styles.emptyText}>
            Fotografe a folha inteira, com boa iluminação e texto legível.
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={tirarFoto}
          style={styles.actionBtn}
        >
          <Ionicons
            name="camera-outline"
            size={22}
            color={colors.brandPrimary}
          />

          <Text style={styles.actionText}>
            Tirar foto
          </Text>
        </Pressable>

        <Pressable
          onPress={escolherGaleria}
          style={styles.actionBtn}
        >
          <Ionicons
            name="images-outline"
            size={22}
            color={colors.brandPrimary}
          />

          <Text style={styles.actionText}>
            Galeria
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={corrigir}
        disabled={!imagem || loading}
        style={[
          styles.primary,
          (!imagem || loading) && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons
              name="sparkles"
              size={20}
              color="#fff"
            />

            <Text style={styles.primaryText}>
              Corrigir minha redação
            </Text>
          </>
        )}
      </Pressable>

      {correcao && (
        <View style={styles.resultArea}>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>
              NOTA ESTIMADA
            </Text>

            <Text style={styles.score}>
              {correcao.nota_total}
            </Text>

            <Text style={styles.scoreMax}>
              de 1000 pontos
            </Text>
          </View>

          {correcao.possivel_nota_zero && (
            <View style={styles.zeroWarning}>
              <Ionicons
                name="warning-outline"
                size={20}
                color={colors.error}
              />

              <Text style={styles.zeroText}>
                Possível situação de nota zero: {correcao.motivo_nota_zero || 'verifique a análise.'}
              </Text>
            </View>
          )}

          <Text style={styles.resultTitle}>
            Competências do ENEM
          </Text>

          {(correcao.competencias || []).map((c: any) => (
            <View
              key={c.numero}
              style={styles.competenciaCard}
            >
              <View style={styles.competenciaHeader}>
                <Text style={styles.competenciaTitle}>
                  Competência {c.numero}
                </Text>

                <Text style={styles.competenciaNota}>
                  {c.nota}/200
                </Text>
              </View>

              <Text style={styles.competenciaNome}>
                {c.titulo}
              </Text>

              <View style={styles.competenciaTrack}>
                <View
                  style={[
                    styles.competenciaBar,
                    {
                      width: `${Math.min(
                        100,
                        (Number(c.nota || 0) / 200) * 100
                      )}%`,
                    },
                  ]}
                />
              </View>

              <Text style={styles.feedback}>
                {c.feedback}
              </Text>
            </View>
          ))}

          {(correcao.pontos_fortes || []).length > 0 && (
            <View style={styles.feedbackBox}>
              <Text style={styles.feedbackTitle}>
                ✅ Pontos fortes
              </Text>

              {correcao.pontos_fortes.map(
                (item: string, i: number) => (
                  <Text
                    key={i}
                    style={styles.feedbackItem}
                  >
                    • {item}
                  </Text>
                )
              )}
            </View>
          )}

          {(correcao.pontos_melhorar || []).length > 0 && (
            <View style={styles.feedbackBox}>
              <Text style={styles.feedbackTitle}>
                📌 O que melhorar
              </Text>

              {correcao.pontos_melhorar.map(
                (item: string, i: number) => (
                  <Text
                    key={i}
                    style={styles.feedbackItem}
                  >
                    • {item}
                  </Text>
                )
              )}
            </View>
          )}

          {(correcao.sugestoes || []).length > 0 && (
            <View style={styles.feedbackBox}>
              <Text style={styles.feedbackTitle}>
                💡 Sugestões
              </Text>

              {correcao.sugestoes.map(
                (item: string, i: number) => (
                  <Text
                    key={i}
                    style={styles.feedbackItem}
                  >
                    • {item}
                  </Text>
                )
              )}
            </View>
          )}

          <Text style={styles.aiNotice}>
            {correcao.observacao}
          </Text>
        </View>
      )}

      <Text style={styles.notice}>
        A nota gerada é uma estimativa educacional e não substitui a correção oficial do ENEM.
      </Text>
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
    fontSize: 23,
    fontWeight: '800',
    color: colors.onSurface,
  },

  subtitle: {
    fontSize: 12,
    color: colors.onSurfaceTertiary,
    marginTop: 2,
  },

  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.onSurface,
  },

  infoText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.onSurfaceSecondary,
    marginTop: 3,
  },

  previewCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },

  preview: {
    width: '100%',
    height: 380,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
  },

  remove: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },

  removeText: {
    color: colors.error,
    fontWeight: '700',
    fontSize: 12,
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.xl,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.onSurface,
    marginTop: spacing.md,
  },

  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    color: colors.onSurfaceTertiary,
    marginTop: 6,
  },

  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },

  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },

  primary: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingVertical: 15,
    marginTop: spacing.lg,
  },

  primaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  disabled: {
    opacity: 0.45,
  },

  notice: {
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    color: colors.onSurfaceTertiary,
    marginTop: spacing.md,
  },

  resultArea: {
    marginTop: spacing.xl,
  },

  scoreCard: {
    alignItems: 'center',
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },

  scoreLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  score: {
    color: '#fff',
    fontSize: 64,
    fontWeight: '900',
    marginTop: 4,
  },

  scoreMax: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },

  zeroWarning: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },

  zeroText: {
    flex: 1,
    color: colors.error,
    fontSize: 12,
    lineHeight: 18,
  },

  resultTitle: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  competenciaCard: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  competenciaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  competenciaTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '800',
  },

  competenciaNota: {
    color: colors.brandPrimary,
    fontSize: 15,
    fontWeight: '900',
  },

  competenciaNome: {
    color: colors.onSurfaceSecondary,
    fontSize: 11,
    marginTop: 3,
  },

  competenciaTrack: {
    height: 6,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },

  competenciaBar: {
    height: '100%',
    backgroundColor: colors.brandPrimary,
  },

  feedback: {
    color: colors.onSurfaceSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.sm,
  },

  feedbackBox: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },

  feedbackTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },

  feedbackItem: {
    color: colors.onSurfaceSecondary,
    fontSize: 12,
    lineHeight: 19,
    marginBottom: 4,
  },

  aiNotice: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: spacing.lg,
  },

});
