import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAtras from '@/components/shared/BotonAtras';
import { Cargando, ErrorEstado } from '@/components/shared/Estados';
import { useColores } from '@/context/ThemeContext';
import { ApiError } from '@/services/http';
import { fechaCorta, porcentaje, usd } from '@/utils/formato';

import { getConvenios } from '../services/ordersApi';
import type { CatalogoConvenios, Convenio } from '../types/orden';

const TIPO: Record<Convenio['tipo'], string> = {
  banco: 'Banco',
  cooperativa: 'Cooperativa',
  broker_internacional: 'Bróker internacional',
};

function TarjetaConvenio({ convenio }: { convenio: Convenio }) {
  const colores = useColores();
  const activo = convenio.convenio_activo;

  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-surface-border bg-surface-background p-4">
      <View
        className={`h-9 w-9 items-center justify-center rounded-xl ${
          activo ? 'bg-stateAlpha-successSoft' : 'bg-surface-secondary'
        }`}
      >
        <Ionicons
          name={activo ? 'link' : 'remove-circle-outline'}
          size={18}
          color={activo ? colores.exito : colores.textoMuted}
        />
      </View>

      <View className="flex-1 gap-0.5">
        <Text className="text-body-md font-bold text-text-primary">{convenio.nombre}</Text>
        <Text className="text-caption text-text-muted">
          {TIPO[convenio.tipo]} · {convenio.calificacion}
          {convenio.calificacion_fuente ? ` · ${convenio.calificacion_fuente}` : ''}
        </Text>
        <Text className="text-caption text-text-muted">
          {activo
            ? `Convenio desde ${fechaCorta(convenio.convenio_desde)} · ${
                convenio.productos
              } ${convenio.productos === 1 ? 'producto' : 'productos'}`
            : 'Sin convenio: puedes comparar sus tasas, pero no invertir desde aquí.'}
        </Text>
      </View>
    </View>
  );
}

/**
 * «¿Me recomiendas al banco que más te paga?»
 *
 * Esta pantalla existe para contestar esa pregunta, que es la más difícil que se le puede
 * hacer a un intermediario que cobra por convenio — y la más justa. La respuesta no es un
 * párrafo tranquilizador: es una cifra y una lista.
 *
 * El argumento completo:
 *   1. La comisión es UNA sola y es la misma en todas las instituciones con convenio. A
 *      Brokeate le da exactamente igual cuál elijas.
 *   2. Eso no es una promesa: en la base no hay una columna donde escribir una tasa por
 *      banco, y hay un UNIQUE que impide publicar dos (`commission_policies`, migración
 *      005). No es que no lo hagamos — es que no se puede.
 *   3. El cliente no paga nada.
 *
 * Y de paso contesta la otra: «¿por qué no me aparece tal bróker?». Porque el catálogo y
 * el convenio son listas distintas — sin convenio se puede comparar, no invertir.
 *
 * Todo lo que se afirma acá viene del servidor (`misma_para_todas`, `rationale`, la
 * lista): si la política cambiara, esta pantalla cambia sola en vez de quedarse mintiendo.
 */
export default function ConveniosPage() {
  const colores = useColores();
  const navigation = useNavigation();
  const [catalogo, setCatalogo] = useState<CatalogoConvenios | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setCatalogo(await getConvenios());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los convenios.');
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-surface-background">
        <ErrorEstado mensaje={error} onReintentar={cargar} />
      </SafeAreaView>
    );
  }

  if (!catalogo) {
    return (
      <SafeAreaView className="flex-1 bg-surface-background">
        <Cargando mensaje="Cargando los convenios…" />
      </SafeAreaView>
    );
  }

  const conConvenio = catalogo.convenios.filter((c) => c.convenio_activo);
  const sinConvenio = catalogo.convenios.filter((c) => !c.convenio_activo);
  const politica = catalogo.politica;

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <View className="flex-row items-center gap-3 border-b border-surface-border px-5 py-4">
        {navigation.canGoBack() ? <BotonAtras onPress={navigation.goBack} /> : null}
        <Text className="flex-1 text-heading font-bold text-text-primary">
          Cómo gana Brokeate
        </Text>
      </View>

      <ScrollView className="flex-1 bg-surface-canvas" contentContainerClassName="px-5 py-6 gap-4">
        {politica ? (
          <View className="gap-3 rounded-2xl border border-surface-border bg-surface-background p-5">
            <View className="flex-row items-baseline justify-between">
              <Text className="text-body-md text-text-primary">Tú pagas</Text>
              <Text className="text-heading font-bold text-state-success">USD 0</Text>
            </View>

            <View className="h-px bg-surface-border" />

            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-body-md text-text-primary">La institución nos paga</Text>
                {/* Un ejemplo concreto: "1,5%" no le dice nada a nadie hasta que ve que
                    sobre USD 1.000 son USD 15. */}
                <Text className="text-caption text-text-muted">
                  {porcentaje(politica.comision_porcentaje)} de lo que inviertes · por cada
                  USD 1.000 son {usd((1000 * politica.comision_bps) / 10000)}
                </Text>
              </View>
              <Text className="text-heading font-bold text-text-primary">
                {porcentaje(politica.comision_porcentaje)}
              </Text>
            </View>

            {/* El núcleo del argumento. Se afirma solo si el servidor lo afirma. */}
            {politica.misma_para_todas ? (
              <View className="flex-row gap-3 rounded-2xl bg-brandAlpha-primarySoft p-4">
                <Ionicons name="shield-checkmark" size={20} color={colores.azulMedio} />
                <Text className="flex-1 text-caption leading-4 text-text-primary">
                  <Text className="font-bold">
                    Es la misma en las {conConvenio.length} instituciones con convenio.
                  </Text>{' '}
                  Ganamos lo mismo elijas la que elijas, así que la recomendación no puede
                  estar inclinada hacia ninguna. No es una promesa: nuestro sistema no
                  tiene forma de guardar una comisión distinta por institución.
                </Text>
              </View>
            ) : null}

            <Text className="text-caption leading-4 text-text-muted">
              {politica.rationale}
            </Text>
            <Text className="text-caption text-text-muted">
              Reglas publicadas · versión {politica.rules_version}
            </Text>
          </View>
        ) : null}

        <Text className="mt-2 text-caption font-bold uppercase text-text-secondary">
          Con convenio · puedes invertir
        </Text>
        {conConvenio.map((c) => (
          <TarjetaConvenio key={c.code} convenio={c} />
        ))}

        {sinConvenio.length ? (
          <>
            <Text className="mt-2 text-caption font-bold uppercase text-text-secondary">
              Sin convenio · solo referencia
            </Text>
            {/* Que esta lista exista y se muestre es el punto: si escondiéramos a los que
                no nos pagan, la pantalla anterior no valdría nada. */}
            <Text className="-mt-2 text-caption leading-4 text-text-muted">
              Están en nuestro catálogo para que compares, pero todavía no tenemos convenio
              con ellas: no podemos cursar tu orden ahí.
            </Text>
            {sinConvenio.map((c) => (
              <TarjetaConvenio key={c.code} convenio={c} />
            ))}
          </>
        ) : null}

        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
