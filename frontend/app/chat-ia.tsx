import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '@/src/api/client';
import { colors, spacing, radius, shadow } from '@/src/theme/tokens';

const SUGGESTIONS = [
  'Explique o princípio da legalidade',
  'Como estudar para o INSS em 3 meses?',
  'Crie um mnemônico para os princípios LIMPE',
  'Quais as pegadinhas do art. 5º da CF?',
];

export default function ChatIA() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sid] = useState<string>(() => `chat_${Date.now()}`);
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput(''); setLoading(true);
    try {
      const r = await apiFetch('/chat/ask', { method: 'POST', body: JSON.stringify({ message: text, session_id: sid }) });
      setMessages((m) => [...m, { role: 'assistant', content: r.response }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', content: `Erro: ${e?.message || 'falha na IA'}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <View style={styles.header}>
        <Pressable testID="chat-back-btn" onPress={() => router.back()}><Ionicons name="chevron-back" size={26} color={colors.onSurface} /></Pressable>
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={styles.headerTitle}>Professor IA</Text>
          <Text style={styles.headerSub}>Tutor especialista em concursos</Text>
        </View>
        <View style={styles.aiBadge}><Ionicons name="sparkles" size={16} color={colors.brandPrimary} /></View>
      </View>

      <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }} testID="chat-messages">
        {messages.length === 0 && (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}><Ionicons name="sparkles" size={32} color={colors.brandPrimary} /></View>
            <Text style={styles.emptyTitle}>Olá! Sou seu Professor IA</Text>
            <Text style={styles.emptyText}>Pergunte qualquer coisa sobre matérias, leis, questões e técnicas de estudo.</Text>
            <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
              {SUGGESTIONS.map((s, i) => (
                <Pressable key={i} testID={`chat-suggestion-${i}`} onPress={() => send(s)} style={styles.suggestion}>
                  <Ionicons name="bulb" size={16} color={colors.brandPrimary} />
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {messages.map((m, i) => (
          <View key={i} style={[styles.msg, m.role === 'user' ? styles.msgUser : styles.msgAi]}>
            <Text style={[styles.msgText, m.role === 'user' && { color: '#fff' }]}>{m.content}</Text>
          </View>
        ))}
        {loading && <View style={[styles.msg, styles.msgAi]}><ActivityIndicator color={colors.brandPrimary} /></View>}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          testID="chat-input"
          value={input}
          onChangeText={setInput}
          placeholder="Pergunte algo..."
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
          onSubmitEditing={() => send(input)}
        />
        <Pressable testID="chat-send-btn" disabled={!input.trim() || loading} onPress={() => send(input)} style={[styles.sendBtn, (!input.trim() || loading) && styles.disabled]}>
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surfaceSecondary },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.onSurface },
  headerSub: { fontSize: 12, color: colors.onSurfaceTertiary },
  aiBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  messages: { flex: 1 },
  emptyBox: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brandTertiary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.onSurface, marginBottom: spacing.xs },
  emptyText: { fontSize: 13, color: colors.onSurfaceTertiary, textAlign: 'center', paddingHorizontal: spacing.xl },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  suggestionText: { color: colors.onSurface, fontSize: 13, flex: 1 },
  msg: { maxWidth: '85%', padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  msgUser: { backgroundColor: colors.brandPrimary, alignSelf: 'flex-end' },
  msgAi: { backgroundColor: colors.surfaceSecondary, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border },
  msgText: { fontSize: 14, lineHeight: 20, color: colors.onSurface },
  inputBar: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, paddingBottom: 24, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surfaceSecondary, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100, fontSize: 14, color: colors.onSurface },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brandPrimary, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});
