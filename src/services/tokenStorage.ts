import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'user_token';

// expo-secure-store no existe en web y lanza al llamarlo. Como el despliegue del
// reto es web (Vercel), ahí caemos a AsyncStorage → localStorage. En nativo sí
// usamos el keychain/keystore.
const usaSecureStore = Platform.OS !== 'web';

export async function getToken(): Promise<string | null> {
  return usaSecureStore
    ? SecureStore.getItemAsync(TOKEN_KEY)
    : AsyncStorage.getItem(TOKEN_KEY);
}

export async function saveToken(token: string): Promise<void> {
  if (usaSecureStore) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }
}

export async function deleteToken(): Promise<void> {
  if (usaSecureStore) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}
