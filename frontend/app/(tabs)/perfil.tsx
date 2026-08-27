import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { colors, spacing, radius, shadow } from '@/src/theme/tokens';

export default function Perfil() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const level = Math.floor((user?.xp || 0) / 100) + 1;
  const progressToNext = ((user?.xp || 0) % 100);

  return (
    <ScrollView testID="perfil-screen" style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(user?.name || 'A').charAt(0).toUpperCase()}</Text></View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.levelRow}>
          <View>
            <Text style={styles.levelLabel}>Nível</Text>
            <Text style={styles.levelValue}>{level}</Text>
          </View>
          <View style={styles.xpBox}>
            <Ionicons name="trophy" size={16} color={colors.warning} />
            <Text style={styles.xpText}>{user?.xp || 0} XP</Text>
          </View>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progressToNext}%` }]} /></View>
        <Text style={styles.progressText}>{100 - progressToNext} XP para o próximo nível</Text>
      </View>

      <View style={styles.menu}>
        <MenuItem icon="search" label="Explorar concursos" onPress={() => router.push('/concursos')} testID="menu-concursos" />
        <MenuItem icon="albums" label="Flashcards" onPress={() => router.push('/flashcards')} testID="menu-flashcards" />
        <MenuItem icon="timer" label="Simulados" onPress={() => router.push('/simulado')} testID="menu-simulados" />
        <MenuItem icon="sparkles" label="Professor IA" onPress={() => router.push('/chat-ia')} testID="menu-chat" />
        <MenuItem icon="log-out" label="Sair" danger onPress={logout} testID="logout-btn" />
      </View>
    </ScrollView>
  );
}

function MenuItem({ icon, label, onPress, danger, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.menuItem}>
      <View style={[styles.menuIcon, danger && { backgroundColor: '#FEE2E2' }]}><Ionicons name={icon} size={18} color={danger ? colors.error : colors.brandPrimary} /></View>
      <Text style={[styles.menuLabel, danger && { color: colors.error }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.info} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: spacing.xl, backgroundColor: colors.brandTertiary },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.brandPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: colors.onSurface },
  email: { fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 4 },
  card: { backgroundColor: colors.surfaceSecondary, marginHorizontal: spacing.xl, marginTop: spacing.lg, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  levelLabel: { color: colors.onSurfaceTertiary, fontSize: 12, fontWeight: '600' },
  levelValue: { fontSize: 32, fontWeight: '800', color: colors.onSurface, letterSpacing: -0.8 },
  xpBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  xpText: { fontWeight: '800', color: colors.warning, fontSize: 12 },
  progressTrack: { height: 8, backgroundColor: colors.surfaceTertiary, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: colors.brandPrimary },
  progressText: { fontSize: 11, color: colors.info, marginTop: 6 },
  menu: { marginTop: spacing.xl, paddingHorizontal: spacing.xl, gap: spacing.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  menuIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, color: colors.onSurface, fontWeight: '600', fontSize: 14 },
});
