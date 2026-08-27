import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();
if (Platform.OS !== 'web') {
  try { WebBrowser.maybeCompleteAuthSession(); } catch {}
}

function DeepLinkHandler({ children }: { children: React.ReactNode }) {
  const { loginWithSessionId } = useAuth();
  useEffect(() => {
    const processed = new Set<string>();
    const tryExtract = async (url: string | null) => {
      if (!url) return;
      const m = url.match(/[?#&]session_id=([^&#]+)/);
      if (!m) return;
      const sid = m[1];
      if (processed.has(sid)) return;
      processed.add(sid);
      try { await loginWithSessionId(sid); } catch (e) { console.warn('session exchange failed', e); }
      if (Platform.OS === 'web') {
        try {
          const clean = window.location.pathname;
          window.history.replaceState(window.history.state, '', clean);
        } catch {}
      }
    };
    if (Platform.OS === 'web') {
      tryExtract(window.location.href);
    } else {
      Linking.getInitialURL().then(tryExtract);
    }
    const sub = Linking.addEventListener('url', (e) => tryExtract(e.url));
    return () => sub.remove();
  }, [loginWithSessionId]);
  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <DeepLinkHandler>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FAFAFA' } }} />
        </DeepLinkHandler>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
