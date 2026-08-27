import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || '';
export const API = `${BACKEND}/api`;

const TOKEN_KEY = 'missao_token';

export async function saveToken(token: string) {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(TOKEN_KEY, token); } catch {}
  } else {
    try { await SecureStore.setItemAsync(TOKEN_KEY, token); } catch {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }
  }
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }
  try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch {
    return await AsyncStorage.getItem(TOKEN_KEY);
  }
}

export async function clearToken() {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
  } else {
    try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch {}
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = await getToken();
  const headers: any = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.detail || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}
