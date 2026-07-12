import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { fechaHoraLarga, porcentaje, usd } from '@/utils/formato';
import { useColores } from '@/context/ThemeContext';

import { getPropuesta } from '../services/advisorApi';
import type { EventoAuditoria, PropuestaDetalle } from '../types/asesor';

/**
 * El detalle crudo de un evento. No interpreta el par (`entity_type`, `action`) ni resume
 * el `metadata`: muestra **todas** sus claves, así que si el backend agrega una mañana,
 * aparece sola. Lo único que hace es **resolver identificadores a nombres** —el uuid de la
 * propuesta al cliente que la tiene, el código del instrumento a su nombre— porque un
 * uuid no le dice nada a nadie y el asesor necesita leer el log, no descifrarlo.
 *
 * `review_id` se oculta: es la llave primaria de `advisor_reviews`, no un hecho de la
 * decisión.
 */

/** Las claves del `metadata` que el backend escribe hoy. Las que no estén salen crudas. */
const CLAVES: Record<string, string> = {
  rules_version: 'Versión de reglas',
  comments: 'Comentario del asesor',
  puntaje: 'Puntaje del cuestionario',
  monto: 'Monto declarado',
  decision: 'Decisión',
  edited_allocation: 'Asignación guardada',
};

/** No es un hecho auditable, es una llave foránea: al asesor no le dice nada. */
const OCULTAS = ['review_id'];

function valorLegible(clave: string, valor: unknown): string {
  if (clave === 'monto' && typeof valor === 'number') return usd(valor);
  if (typeof valor === 'string' || typeof valor === 'number') return String(valor);
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  return JSON.stringify(valor);
}

/** `[{ instrumento_code, porcentaje }]`: la asignación que quedó guardada en la decisión. */
function esAsignacion(valor: unknown): valor is { instrumento_code: string; porcentaje: number }[] {
  return (
    Array.isArray(valor) &&
    valor.length > 0 &&
    valor.every(
      (linea) =>
        typeof linea === 'object' &&
        linea !== null &&
        'instrumento_code' in linea &&
        'porcentaje' in linea,
    )
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View className="gap-0.5 border-t border-surface-border pt-3">
      <Text className="text-caption uppercase text-text-muted">{etiqueta}</Text>
      <Text className="text-body text-text-primary">{valor}</Text>
    </View>
  );
}

export default function EventoAuditoriaModal({
  evento,
  etiqueta,
  esPropuesta,
  onCerrar,
  onVerPropuesta,
}: {
  evento: EventoAuditoria | null;
  /** La misma que muestra la tarjeta: el código crudo si el par no está registrado. */
  etiqueta: string;
  /** `entity_id` es un `proposal_id`: se puede resolver a un cliente y abrir su propuesta. */
  esPropuesta: boolean;
  onCerrar: () => void;
  onVerPropuesta?: () => void;
}) {
  const colores = useColores();
  /** La propuesta que el evento audita: solo para poner nombres donde hay uuids. */
  const [propuesta, setPropuesta] = useState<PropuestaDetalle | null>(null);

  const entityId = evento?.entity_id;

  useEffect(() => {
    setPropuesta(null);
    if (!entityId || !esPropuesta) return;

    let vigente = true;
    getPropuesta(entityId)
      .then((detalle) => {
        if (vigente) setPropuesta(detalle);
      })
      // Si no se puede resolver el nombre, se muestra el uuid: el evento sigue siendo
      // legible sin él. Un fallo acá no puede tapar el log.
      .catch(() => undefined);

    return () => {
      vigente = false;
    };
  }, [entityId, esPropuesta]);

  const metadata = Object.entries(evento?.metadata ?? {}).filter(
    ([clave, valor]) => !OCULTAS.includes(clave) && valor !== null && valor !== undefined,
  );

  /** `BOND-XYZ` → "Bono Corporativo XYZ", si la propuesta ya se resolvió. */
  const nombreDe = (code: string) =>
    propuesta?.allocations.find((l) => l.instrumento_code === code)?.nombre ?? code;

  return (
    <Modal
      visible={evento !== null}
      transparent
      animationType="slide"
      onRequestClose={onCerrar}
    >
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: colores.velo }}
        onPress={onCerrar}
      >
        {/* El sheet captura el toque: solo el fondo cierra. */}
        <Pressable
          onPress={() => {}}
          className="max-h-[85%] rounded-t-3xl bg-surface-background"
        >
          {evento ? (
            <>
              <View className="flex-row items-start gap-3 border-b border-surface-border px-5 py-4">
                <View className="flex-1 gap-1">
                  <Text className="text-heading font-bold text-text-primary">
                    {etiqueta}
                  </Text>
                  <Text className="text-caption text-text-secondary">
                    {fechaHoraLarga(evento.created_at)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onCerrar}
                  hitSlop={12}
                  accessibilityLabel="Cerrar el detalle"
                >
                  <Ionicons name="close" size={24} color={colores.textoMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerClassName="gap-3 px-5 py-5">
                <Fila
                  etiqueta="Responsable"
                  valor={
                    evento.actor_nombre
                      ? `${evento.actor_nombre}${
                          evento.actor_rol ? ` · ${evento.actor_rol}` : ''
                        }`
                      : 'Sin responsable registrado'
                  }
                />

                {/* Entidad: el cliente cuya propuesta se auditó, no su uuid. Mientras se
                    resuelve se muestra el estado de carga; si no se puede, el uuid. */}
                <View className="gap-0.5 border-t border-surface-border pt-3">
                  <Text className="text-caption uppercase text-text-muted">Entidad</Text>
                  {esPropuesta && !propuesta ? (
                    <View className="flex-row items-center gap-2 py-0.5">
                      <ActivityIndicator size="small" color={colores.textoMuted} />
                      <Text className="text-body text-text-muted">
                        Resolviendo la propuesta…
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-body text-text-primary">
                      {propuesta
                        ? `Propuesta de ${propuesta.investor_nombre}${
                            propuesta.monto_total != null
                              ? ` · ${usd(propuesta.monto_total)}`
                              : ''
                          }`
                        : evento.entity_id}
                    </Text>
                  )}
                </View>

                <Fila
                  etiqueta="Acción registrada"
                  valor={`${evento.entity_type} / ${evento.action}`}
                />
                <Fila etiqueta="Plataforma" valor={evento.platform} />

                {metadata.length > 0 ? (
                  <View className="gap-3 pt-2">
                    <Text className="text-caption font-bold uppercase text-text-secondary">
                      Metadata registrada
                    </Text>

                    {metadata.map(([clave, valor]) =>
                      esAsignacion(valor) ? (
                        <View
                          key={clave}
                          className="gap-2 border-t border-surface-border pt-3"
                        >
                          <Text className="text-caption uppercase text-text-muted">
                            {CLAVES[clave] ?? clave}
                          </Text>
                          {valor.map((linea) => (
                            <View
                              key={linea.instrumento_code}
                              className="flex-row items-center justify-between gap-3 rounded-xl bg-surface-canvas px-3 py-2"
                            >
                              <Text
                                className="flex-1 text-body text-text-primary"
                                numberOfLines={2}
                              >
                                {nombreDe(linea.instrumento_code)}
                              </Text>
                              <Text className="text-body font-bold text-text-primary">
                                {porcentaje(linea.porcentaje)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Fila
                          key={clave}
                          etiqueta={CLAVES[clave] ?? clave}
                          valor={valorLegible(clave, valor)}
                        />
                      ),
                    )}
                  </View>
                ) : (
                  <Text className="pt-2 text-caption text-text-muted">
                    Este evento se registró sin metadata.
                  </Text>
                )}

                {onVerPropuesta ? (
                  <TouchableOpacity
                    onPress={onVerPropuesta}
                    activeOpacity={0.85}
                    className="mt-2 flex-row items-center justify-between rounded-2xl bg-surface-canvas px-4 py-3"
                  >
                    <Text className="text-body font-bold text-brand-primary">
                      Ver la propuesta auditada
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={colores.primario} />
                  </TouchableOpacity>
                ) : null}

                <View className="h-6" />
              </ScrollView>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
