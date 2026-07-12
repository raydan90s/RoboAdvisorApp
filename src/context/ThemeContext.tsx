import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { colorScheme as colorSchemeNativeWind, useColorScheme } from 'nativewind';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { PALETA, type Paleta } from '@/constants/colores';

const TEMA_KEY = '@roboadvisor_tema';

/** 'system' sigue al SO; 'light'/'dark' lo fija el usuario desde el header. */
export type PreferenciaTema = 'light' | 'dark' | 'system';
export type Tema = 'light' | 'dark';

interface ThemeContextValue {
  /** El tema realmente pintado ('system' ya resuelto). */
  tema: Tema;
  esOscuro: boolean;
  /** Lo que eligió el usuario. Es lo que se persiste. */
  preferencia: PreferenciaTema;
  /** Paleta del tema activo, para props que exigen un string de color. */
  colores: Paleta;
  elegir: (preferencia: PreferenciaTema) => void;
  /** Salta al tema contrario al que se ve ahora mismo. */
  alternar: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Fuente única del tema.
 *
 * Quien manda de verdad es el `colorScheme` de NativeWind: al cambiarlo se reevalúan
 * las variables de src/style/global.css y toda clase con token (`bg-surface-canvas`,
 * `text-text-primary`…) se repinta sola. Este contexto solo añade lo que NativeWind no
 * hace: recordar la elección entre arranques y exponer la paleta como strings para las
 * props que no aceptan className.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme } = useColorScheme();
  const [preferencia, setPreferencia] = useState<PreferenciaTema>('system');

  // Restaura la elección guardada. Hasta que resuelva se ve el tema del SO, que es el
  // mismo que verá el 95% de los usuarios: no hay salto perceptible.
  useEffect(() => {
    (async () => {
      const guardada = await AsyncStorage.getItem(TEMA_KEY);
      if (guardada === 'light' || guardada === 'dark' || guardada === 'system') {
        setPreferencia(guardada);
        colorSchemeNativeWind.set(guardada);
      }
    })();
  }, []);

  const tema: Tema = colorScheme === 'dark' ? 'dark' : 'light';
  const colores = PALETA[tema];

  // El fondo de la ventana nativa: sin esto, al empujar una pantalla se ve un flash
  // blanco entre medias.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colores.fondo).catch(() => {});
  }, [colores.fondo]);

  const elegir = useCallback((nueva: PreferenciaTema) => {
    setPreferencia(nueva);
    colorSchemeNativeWind.set(nueva);
    AsyncStorage.setItem(TEMA_KEY, nueva).catch(() => {});
  }, []);

  const alternar = useCallback(() => {
    elegir(colorSchemeNativeWind.get() === 'dark' ? 'light' : 'dark');
  }, [elegir]);

  const valor = useMemo<ThemeContextValue>(
    () => ({
      tema,
      esOscuro: tema === 'dark',
      preferencia,
      colores,
      elegir,
      alternar,
    }),
    [tema, preferencia, colores, elegir, alternar],
  );

  return <ThemeContext.Provider value={valor}>{children}</ThemeContext.Provider>;
}

export function useTema(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTema debe usarse dentro de ThemeProvider');
  return ctx;
}

/** Atajo para el caso común: solo necesitas los colores (icono, spinner, SVG). */
export function useColores(): Paleta {
  return useTema().colores;
}
