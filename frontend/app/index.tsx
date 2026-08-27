import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/theme/tokens';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (!user.onboarded) router.replace('/onboarding');
    else router.replace('/(tabs)');
  }, [user, loading, router]);

  return (
    <View style={styles.c}>
      <ActivityIndicator size="large" color={colors.brandPrimary} />
    </View>
  );
}
const styles = StyleSheet.create({ c: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface } });
