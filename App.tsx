import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import './src/style/global.css';

import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider, useTema } from '@/context/ThemeContext';
import RootNavigator from '@/navigation/RootNavigator';
import { navigationRef } from '@/navigation/rootNavigation';

/**
 * React Navigation pinta lo que hay ENTRE pantallas (el fondo de la transición, la
 * barra de tabs). No lee clases de Tailwind, así que hay que traducirle la paleta:
 * sin esto, cada push mostraría un flash blanco sobre la app en oscuro.
 */
function Raiz() {
  const { esOscuro, colores } = useTema();

  const temaNavegacion = useMemo<Theme>(() => {
    const base = esOscuro ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colores.primario,
        background: colores.fondo,
        card: colores.superficie,
        text: colores.textoPrimario,
        border: colores.borde,
        notification: colores.error,
      },
    };
  }, [esOscuro, colores]);

  return (
    <>
      {/* Único StatusBar de la app: las pantallas ya no lo declaran. */}
      <StatusBar style={esOscuro ? 'light' : 'dark'} />
      <NavigationContainer ref={navigationRef} theme={temaNavegacion}>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <Raiz />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
