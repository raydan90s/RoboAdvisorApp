import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Text, TouchableOpacity, View } from 'react-native';

import { useColores } from '@/context/ThemeContext';
import { ApiError } from '@/services/http';

import { getFeed } from '../services/feedApi';
import type { FeedResponse, NoticiaFeed, TemaFeed } from '../services/feedApi';

const TEMAS: { id: TemaFeed; etiqueta: string; icono: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'mercados', etiqueta: 'Mercados', icono: 'stats-chart' },
  { id: 'cripto', etiqueta: 'Cripto', icono: 'logo-bitcoin' },
  { id: 'materias', etiqueta: 'Oro y petróleo', icono: 'diamond-outline' },
  { id: 'ecuador', etiqueta: 'Ecuador', icono: 'flag-outline' },
];

/** "2026-07-12T09:30:00Z" → "hace 2 h" / "hace 3 días". Null → "referencial". */
function haceCuanto(iso: string | null): string {
  if (!iso) return 'referencial';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return 'referencial';
  const horas = Math.floor(ms / 3_600_000);
  if (horas < 1) return 'hace minutos';
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

function TarjetaNoticia({ noticia }: { noticia: NoticiaFeed }) {
  const colores = useColores();
  const [imagenRota, setImagenRota] = useState(false);
  const tema = TEMAS.find((t) => t.id === noticia.tema);
  const conFoto = noticia.imagen != null && !imagenRota;

  return (
    <TouchableOpacity
      onPress={() => void Linking.openURL(noticia.url)}
      activeOpacity={0.85}
      className="overflow-hidden rounded-2xl border border-surface-border bg-surface-background"
    >
      {conFoto ? (
        <Image
          source={{ uri: noticia.imagen! }}
          className="h-40 w-full"
          resizeMode="cover"
          onError={() => setImagenRota(true)}
        />
      ) : (
        // Sin imagen (o rota): el visual del tema en navy — nunca una foto que no
        // sea de la noticia, y nunca un hueco gris.
        <View className="h-24 w-full items-center justify-center bg-brand-ink">
          <Ionicons
            name={tema?.icono ?? 'newspaper-outline'}
            size={34}
            color={colores.azulPalido}
          />
        </View>
      )}

      <View className="gap-2 p-4">
        <Text className="text-body-md font-bold leading-5 text-text-primary" numberOfLines={3}>
          {noticia.titulo}
        </Text>
        {noticia.descripcion ? (
          <Text className="text-body leading-5 text-text-secondary" numberOfLines={2}>
            {noticia.descripcion}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-2">
          <View className="rounded-md bg-brandAlpha-primarySoft px-2 py-0.5">
            <Text className="text-caption font-bold text-brand-mid" numberOfLines={1}>
              {noticia.fuente}
            </Text>
          </View>
          <Text className="text-caption text-text-muted">{haceCuanto(noticia.fecha)}</Text>
          <View className="flex-1" />
          <Ionicons name="open-outline" size={14} color={colores.textoMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * El feed de noticias del mercado (sugerencia del jurado: contenido para "suapear").
 *
 * Misma filosofía que el resto de la app: la aplicación NO redacta noticias, las CITA
 * — cada tarjeta lleva su medio y su antigüedad, y tocarse abre la nota original.
 * Si el backend está en modo respaldo, se avisa en vez de fingir tiempo real.
 */
export default function FeedNoticias() {
  const colores = useColores();
  const [tema, setTema] = useState<TemaFeed>('mercados');
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    setFeed(null);
    try {
      setFeed(await getFeed(tema));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar las noticias.');
    }
  }, [tema]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <View className="gap-3">
      <View className="mt-2 flex-row items-center gap-2">
        <Ionicons name="newspaper-outline" size={16} color={colores.navy} />
        <Text className="text-caption font-bold uppercase text-text-secondary">
          Novedades del mercado
        </Text>
      </View>

      {/* Filtro por tema */}
      <View className="flex-row flex-wrap gap-2">
        {TEMAS.map((t) => {
          const activo = tema === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTema(t.id)}
              className={`flex-row items-center gap-1.5 rounded-xl px-3 py-2 ${
                activo ? 'bg-brand-primary' : 'bg-brandAlpha-primarySoft'
              }`}
            >
              <Ionicons
                name={t.icono}
                size={13}
                color={activo ? colores.textoSobrePrimario : colores.azulMedio}
              />
              <Text
                className={`text-caption font-bold ${
                  activo ? 'text-text-onPrimary' : 'text-brand-mid'
                }`}
              >
                {t.etiqueta}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? (
        <View className="rounded-2xl bg-stateAlpha-errorSoft px-4 py-3">
          <Text className="text-body text-state-error">{error}</Text>
          <TouchableOpacity onPress={() => void cargar()} className="mt-1">
            <Text className="text-body font-bold text-brand-primary">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : !feed ? (
        <View className="items-center py-6">
          <ActivityIndicator color={colores.primario} />
        </View>
      ) : (
        <>
          {feed.fuente_datos === 'respaldo' ? (
            <View className="flex-row gap-2 rounded-2xl bg-stateAlpha-warningSoft p-3">
              <Ionicons name="cloud-offline-outline" size={14} color={colores.advertencia} />
              <Text className="flex-1 text-caption leading-4 text-text-secondary">
                Titulares de referencia: la fuente de noticias no está disponible ahora.
              </Text>
            </View>
          ) : null}

          {feed.noticias.map((noticia) => (
            <TarjetaNoticia key={noticia.url} noticia={noticia} />
          ))}

          <Text className="pb-2 text-center text-caption text-text-muted">
            Noticias de medios externos, citadas con su fuente. No son una recomendación
            de inversión.
          </Text>
        </>
      )}
    </View>
  );
}
