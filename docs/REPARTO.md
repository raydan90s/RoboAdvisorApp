# Reparto de trabajo — 4 personas, 3 repos, un domingo

> **Deadline: domingo 12 de julio de 2026, 23:59.** Diego · Erick · Jonathan · Miguel.
>
> Este documento no reemplaza a [PLAN.md](PLAN.md) (que dice *qué* se construye y por qué).
> Este dice **quién toca qué archivo**, para que cuatro personas puedan escribir código a la
> vez sin pisarse y sin bloquearse entre ellas.

---

## 0. Los tres repos, y cuál es cuál

Antes de repartir hay que aclarar esto porque los tres se llaman parecido:

| Repo | Qué es | Rol en la entrega |
|---|---|---|
| `ROBOADVISORY-BACKEND` | FastAPI + Postgres (Supabase) + Gemini. Auth, scoring, propuestas, revisión del asesor, guardarraíles, **55 tests que pasan**. | **Se entrega.** Es el cerebro. |
| `RoboAdvisorApp` | Expo SDK 54 + React Navigation. Login, cuestionario, propuesta, cola del asesor, auditoría — **conectadas al backend real**. | **Se entrega.** Es la app que se despliega y se graba. |
| `app` (Brokeate) | Export de Figma Make: Vite + React + shadcn. Un solo `App.tsx` de 1557 líneas. | **No se entrega. Es la referencia visual.** |

**Por qué Brokeate no se entrega, aunque sea el más bonito:** es una maqueta estática. Sus
subcuentas están en un `const SUBCUENTAS_INIT`, sus propuestas en un `const PROPOSALS`, su
auditoría en un `const AUDIT`, y su "IA" es una función `getAIResponse()` de 10 líneas que
compara strings. No tiene un solo `fetch`. Ni siquiera es un repo git.

Eso choca de frente con el criterio de evaluación #3 (antialucinación) y con dos criterios
literales de la Guía: *"reglas visibles y versionadas"* y *"cada decisión queda registrada con
fecha, versión de reglas y responsable"*. Una maqueta no puede demostrar ninguno de los dos.

Lo que sí hacemos: **le robamos a Brokeate el diseño y las ideas.** El azul marino `#14375E`,
las subcuentas, el comparador de tasas, el simulador y el chat flotante se portan a la app Expo,
donde los números vienen de Postgres en vez de un array.

---

## 1. La decisión que hace viable todo esto

Se decidió incluir subcuentas. A 36 horas del cierre eso suena suicida, y lo sería si hubiera
que rediseñar el modelo de datos. **No hay que hacerlo**, y esta es la razón:

> **Una subcuenta ya existe en la base. Se llama `profiling_session`.**

Miren el modelo actual:

- `profiling_sessions` tiene `investor_id`, `amount`, `risk_profile_id`, `total_score`.
  Es decir: **de quién es, cuánta plata, qué perfil, qué puntaje.**
- `proposals` cuelga de una sesión, con su `total_amount`, sus `proposal_items` y su `status`.
- `create_investor_profile` **ya inserta una sesión nueva en cada llamada** — nunca actualizó
  una existente.
- La cola del asesor lista *propuestas*, no *personas*.

O sea: si Juan se perfila tres veces con tres montos distintos, la base ya guarda tres sesiones
con tres perfiles y tres propuestas independientes. **Eso son tres subcuentas.** Lo único que
les falta es un nombre y un techo de capital.

De ahí que la migración sea **aditiva y corta** (dos columnas), y que el motor determinista
—scoring, umbrales, plantillas, elegibilidad por calificación, guardarraíles, los 55 tests—
**no se toque**. Ese es el seguro de vida del fin de semana: si las subcuentas se caen, lo que
queda abajo sigue cumpliendo las tres HU.

```sql
-- migración 002_subcuentas.sql — completa, no hay más
alter table public.profiling_sessions add column subaccount_name text;
alter table public.profiles           add column total_capital  numeric check (total_capital is null or total_capital > 0);

drop view if exists public.v_advisor_review_queue cascade;
create view public.v_advisor_review_queue as
select ... , s.subaccount_name          -- una columna más en la vista que ya existía
from ...;
```

"Capital total $40.000 · asignado $30.000 · sin asignar $10.000" no es una tabla nueva: es
`profiles.total_capital` menos la suma de `amount` de las sesiones del inversionista.

---

## 2. Reglas de convivencia (léanlas, son 6 líneas)

1. **Una rama por persona**: `diego/…`, `erick/…`, `jonathan/…`, `miguel/…`. PR a `main`.
2. **Cada archivo tiene un dueño** (tabla §3). Si necesitas tocar un archivo ajeno, escríbele
   al dueño; no lo edites "rapidito".
3. **Zonas calientes** — los cuatro archivos donde sí o sí se van a chocar:
   `src/navigation/RootNavigator.tsx` · `src/types/navigation.ts` · `backend/src/main.py` ·
   `backend/seed.sql`. Regla: los cambios ahí van en **un commit propio que se pushea de
   inmediato**. Nunca los dejes tres horas sin subir.
4. **Nadie inventa un número en el front.** Los USD los calcula Postgres. Si necesitas un dato
   que la API no da, se agrega al endpoint — no se multiplica en React.
5. **Pull cada vez que te levantas de la silla.**
6. **`npx tsc --noEmit` antes de cada push** (front) y `pytest -q` (backend). Si rompes los 55
   tests, arreglas los 55 tests.

---

## 3. Quién es dueño de qué

| Persona | Territorio | Archivos que le pertenecen |
|---|---|---|
| **Miguel** | Backend de subcuentas + integración + deploy | `migrations/002_subcuentas.sql`, `seed.sql` (vistas), `investor_controller.py`, `investor_routes.py`, `models/investor.py`, `advisor_controller.py`, `main.py`, `RootNavigator.tsx`, `types/navigation.ts` |
| **Diego** | Inversionista: subcuentas de punta a punta (front) | `src/app/inversionista/pages/{MisSubcuentasPage,NuevaSubcuentaPage,SubcuentaDetallePage}.tsx`, `components/{TarjetaSubcuenta,BarraCapital}.tsx`, `services/investorApi.ts`, `types/inversionista.ts` |
| **Erick** | El agente conversacional (back + front) | `backend/src/services/agent_graph.py`, `agent_controller.py`, `agent_routes.py`, `src/app/agente/**` (`AgentSheet.tsx`, `Burbuja.tsx`, `SourceChips.tsx`, `agentApi.ts`) |
| **Jonathan** | Sistema visual + comparador + simulador | `tailwind.config.js`, `src/components/shared/**`, `src/app/inversionista/pages/{ComparadorPage,SimuladorPage}.tsx`, `backend/src/routes/catalog_routes.py` |

Fíjense que **los cuatro territorios casi no se tocan**: Diego vive en `inversionista/`, Erick en
`agente/`, Jonathan en `shared/` + dos páginas nuevas, Miguel en el backend. Los conflictos
posibles son tres archivos, y están listados arriba.

---

## 4. El contrato de la API (lo primero que existe)

**Miguel escribe esto en las primeras 2 horas y lo pushea aunque devuelva datos falsos.** Es lo
que desbloquea a los otros tres: pueden tipar, pintar y maquetar contra un contrato firmado sin
esperar a que el backend esté listo.

```ts
// GET /api/investor/{id}/subaccounts   → el Home de Diego
type Subcuenta = {
  session_id: string;
  proposal_id: string | null;
  nombre: string;              // profiling_sessions.subaccount_name
  monto: number;               // amount — lo pone Postgres
  perfil: 'conservador' | 'moderado' | 'agresivo';
  puntaje: number;
  estado: 'pending_review' | 'approved' | 'edited' | 'rejected';
  instrumento_principal: string;   // el de mayor %
  retorno_esperado_anual: number | null;
};
type ResumenCapital = {
  capital_total: number | null;    // profiles.total_capital
  asignado: number;                // suma de los amount
  sin_asignar: number;             // resta — calculada en SQL
  subcuentas: Subcuenta[];
};

// POST /api/investor/capital        { capital_total }        → fija el techo
// POST /api/investor/profile        { nombre_subcuenta, monto, respuestas }   ← +1 campo
//      422 si monto > sin_asignar. La validación vive en el servidor, no en el input.
// GET  /api/investor/{id}/portfolio?session_id=…             ← +1 query param
// GET  /api/catalog/rates?monto=&plazo_dias=                 → comparador de Jonathan
// POST /api/agent/chat  { session_id?, mensaje }             → { texto, sources[], guardrail_passed }
```

Dos cosas que **no** cambian y conviene decirlas fuerte:

- **`POST /api/investor/profile` sigue creando una sesión.** Le entra un campo
  (`nombre_subcuenta`) y una validación (el monto no puede pasarse del disponible). El scoring
  de adentro no se toca.
- **`GET /portfolio` ahora acepta `?session_id=`.** Sin el parámetro sigue devolviendo la sesión
  más reciente, así que **la app actual no se rompe** mientras Diego construye la nueva.

---

## 5. Dos trampas que cuestan el fin de semana si alguien cae

### ⚠️ NO cambien el cuestionario a 7 preguntas

Brokeate propone 7 preguntas (edad, origen del dinero, plazo…). **Son 5 y se quedan en 5.**

El caso de Juan Pérez —el que viene en el documento oficial del reto— suma **12 de 15 puntos**
con las 5 preguntas puntuables actuales, y eso lo convierte en Moderado, que sobre USD 20.000 da
exactamente **USD 12.000 / USD 8.000**: las cifras del documento del reto, reproducidas sin que
nadie las escribiera a mano. Ese es `test_caso_juan_perez`, y es el argumento más fuerte de toda
la entrega.

Meter dos preguntas más cambia el rango (5–15 → 7–21), rompe los umbrales, rompe el test estrella
y **rompe el caso oficial del reto**. El costo: reescribir `scoring_rules`, `profile_thresholds`,
el seed y los tests. El beneficio: cero, porque la Guía no pide 7 preguntas.

### ⚠️ Cripto en el catálogo: solo si sobra tiempo, y va al final

Brokeate mete Bitcoin en el perfil agresivo. Tentador, pero el catálogo es **bancario a
propósito** ([Ejemplo_de_Robo_Advisor.md](Ejemplo_de_Robo_Advisor.md) pide explícitamente
productos *"que un banco puede comercializar directamente"*), y la regla de elegibilidad se
apoya en la **calificación de riesgo del emisor** — que el Bitcoin no tiene. Un instrumento sin
`institution_id` puede colarse por los joins de `v_institution_eligibility` y
`v_template_integrity`, que son dos de los tests estrella.

Además, el trade-off que Brokeate busca con el cripto **ya está en el catálogo**: el `DPF_LOJA_360`
tiene la mejor tasa entre los depósitos (9,4 %) y la peor calificación (AA), y el perfil
conservador no puede tocarlo mientras el agresivo sí. Esa tensión, visible en pantalla, es
producto. El Bitcoin sería adorno con riesgo de romper tests.

---

## 6. El trabajo, persona por persona

### 🔵 Miguel — el camino crítico

Todos dependen de él las primeras horas, así que su trabajo está ordenado para **desbloquear
primero y construir después**.

1. **(2 h · BLOQUEA A TODOS)** Escribir el contrato de §4 y pushearlo: modelos Pydantic +
   rutas que devuelven datos fijos. Diego, Erick y Jonathan arrancan contra esto.
2. **(1 h · empezar temprano, no al final)** Desplegar lo que hay: backend a Render, front a
   Vercel. El primer deploy siempre falla por una tontería; que falle hoy y no el domingo a
   las 22:00. `DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET`, `CORS_ORIGINS`.
3. **(3 h)** `002_subcuentas.sql` + `v_advisor_review_queue` con `subaccount_name` + los tres
   endpoints reales (`/subaccounts`, `/capital`, `/portfolio?session_id=`). La validación
   *"el monto no puede pasarse del sin-asignar"* va **en SQL, dentro de la transacción**, no en
   Python: dos pestañas abiertas no pueden asignar el mismo dinero dos veces.
4. **(1 h)** Cola y detalle del asesor mostrando de qué subcuenta es cada propuesta.
5. **(1 h)** `test_subcuentas.py`: capital 40.000 → tres subcuentas de 20/10/10 → la cuarta de
   $1 devuelve **422**. Y que los 55 de antes sigan pasando.
6. **(últimas 4 h)** Grabar el video.

### 🟢 Diego — subcuentas en el front (la pantalla que se ve en el video)

Es el rediseño del Home del inversionista, el corazón visual de la demo.

1. **(1 h)** Tipos y `investorApi.ts` contra el contrato de §4. Se puede hacer con el backend
   todavía devolviendo datos fijos.
2. **(3 h)** `MisSubcuentasPage`: tarjeta de capital arriba (total / asignado / sin asignar),
   barra apilada por perfil, lista de `TarjetaSubcuenta` con nombre, USD, badge de perfil,
   instrumento principal y `EstadoBadge`. Botón sticky "+ Nueva subcuenta".
   > La barra apilada **no se normaliza**: si el capital no está todo asignado, se ve el hueco
   > gris. Un gráfico que se autocompleta esconde que sobran USD 10.000 sin invertir.
3. **(3 h)** `NuevaSubcuentaPage`, 3 pasos: nombre + monto (validado contra `sin_asignar`) →
   las 5 preguntas del cuestionario que **ya sirve la BD** (reusa `CuestionarioPage`, no la
   copies) → propuesta con donut + disclaimer, y la subcuenta queda `pending_review`.
4. **(1 h)** `SubcuentaDetallePage`: es la `PropuestaPage` de hoy pero recibiendo un
   `session_id`. Cambio pequeño, no la reescribas.
5. **(1 h)** El botón *"Conversar con la IA sobre esta subcuenta"* → abre el `AgentSheet` de
   Erick con el `session_id` como contexto. **Pónganse de acuerdo en esa firma temprano.**

### 🟡 Erick — el agente (es lo que gana el criterio #1 y el #3)

Es el trabajo más independiente del equipo: nadie lo bloquea y él no bloquea a nadie.

1. **(3 h · backend)** `agent_graph.py` con LangGraph: `router` → `qa_node` → `guardrail_node` →
   `refuse_node`. El `qa_node` recibe **solo** el contexto real del inversionista (sus
   subcuentas, sus propuestas, su puntaje) y **`guardrails.py` ya existe: no lo reescribas,
   llámalo.** Si el modelo inventa un número, se reintenta una vez diciéndole qué hizo mal; si
   reincide, responde la plantilla determinista.
2. **(1 h)** `POST /api/agent/chat` → `{ texto, sources[], guardrail_passed }`, y cada turno se
   guarda en `llm_interactions` con `guardrail_passed`, `retry_count` y `model`. **Esa tabla es
   la evidencia del criterio #3; no la saltes.**
3. **(3 h · front)** `AgentSheet`: FAB flotante azul marino → bottom sheet al 85 %, burbujas
   (usuario a la derecha, asistente a la izquierda).
4. **(1 h) Los source chips.** Debajo de cada respuesta del asistente, chips tocables:
   *"Fondo de Crecimiento · 11,5 % · BankWatch 30-jun-2026"*. Al tocarlos, se abre el dato.
   > Es el diferenciador real del proyecto, más que el micrófono. Un chatbot financiero que
   > **muestra de dónde sacó cada número** es exactamente lo que pide el criterio de
   > antialucinación. Si te queda tiempo para una sola cosa más, que sea esta.
5. **La voz queda fuera.** El micrófono de Brokeate cuesta ~6 h (grabación + multipart + STT +
   TTS) y **ninguna HU la pide**. Solo si el domingo al mediodía ya está todo lo demás.

### 🟣 Jonathan — que la app se vea como Brokeate, y las dos pantallas que faltan

1. **(2 h · PRIMERO, BLOQUEA A LOS OTROS DOS)** Los tokens de diseño de Brokeate en
   `tailwind.config.js`: azul marino `#14375E` dominante sobre blanco, verde/ámbar/rojo **solo
   semánticos**. Y los componentes de `src/components/shared/` (`EstadoBadge`, `Calificacion`,
   `DisclaimerBanner`, botones, tarjeta) reestilizados.
   > Esto va primero **por una razón de merge**: si Diego y Erick maquetan sus pantallas y
   > después llega el restyle, hay que reescribir las dos. Sube los tokens en las primeras 2 h,
   > los demás hacen pull, y cada quien estiliza lo suyo sobre una base común.
   >
   > **`Calificacion.tsx` no se toca por dentro.** El pie *"Fuente: BankWatch Ratings ·
   > 30-jun-2026 · referencial"* vive dentro del componente a propósito: así es imposible pintar
   > un rating sin su calificadora y su fecha. Cámbiale los colores, no la estructura.
2. **(2 h)** `GET /api/catalog/rates` — solo lectura sobre `instruments` + `institutions`, que ya
   están sembradas. Cero riesgo, no toca el schema. Devuelve institución, calificación (con
   fuente y fecha), tasa, plazo y mínimo de acceso; **marca cuáles no son elegibles para el
   perfil del usuario** en vez de esconderlas.
3. **(2 h)** `ComparadorPage`: la tabla ordenada por calificación, con la nota educativa *"a
   mayor tasa, mayor riesgo"*. Los productos que el perfil del usuario **no puede** tocar salen
   en gris con el motivo — enseñar la regla trabajando vale más que ocultar la fila.
4. **(2 h)** `SimuladorPage`: monto y plazo, y las tasas se recalculan. **Las tasas vienen del
   endpoint, no de un array en el front.**
5. **(últimas 4 h)** El documento explicativo (§8).

---

## 7. Cronograma, checkpoints y el botón de pánico

Tres momentos en los que todos paran 10 minutos y miran lo mismo:

| Checkpoint | Qué tiene que estar | Si no está |
|---|---|---|
| **CP1 · sábado, +3 h** | Contrato de API pusheado · tokens de diseño en `main` · backend vivo en Render con `/health` en verde | Es un problema de **desbloqueo**, no de alcance: los tres se paran a resolverlo con Miguel/Jonathan. Nada más importa hasta que esté. |
| **CP2 · domingo, 10:00** | Subcuentas end-to-end · el agente responde citando fuentes · el comparador pinta datos reales | Se corta el **simulador** y se corta la **voz**. Sin discusión. |
| **CP3 · domingo, 14:00 · CONGELACIÓN** | Lo que compile y funcione entra. Lo demás **se revierte**, no se "deja a medias". | De aquí en adelante nadie escribe una línea de código nuevo. Solo bugs. |
| **domingo, 16:00–20:00** | Video (Miguel) · documento (Jonathan) · ZIP y correo (Diego + Erick prueban el deploy) | — |

**El botón de pánico.** Si el domingo a las 10:00 las subcuentas no están end-to-end, se
revierten y se entrega la app de una sola cartera, que **ya cumple las tres HU**. Duele, pero:

> Un proyecto perfecto sin video no puntúa. Un proyecto con una cartera y video de 3 minutos,
> sí. Las últimas 4 horas **no son negociables** — no son "buffer", son entregables.

Y esto vale para todo el fin de semana: **si algo del reparto amenaza con romper los 55 tests o
el caso de Juan Pérez, se corta ese algo, no el test.**

---

## 8. Los 5 enlaces que hay que mandar a `taws@fiec.espol.edu.ec`

Sin estos cinco no hay evaluación, por buena que quede la app:

- [ ] **Video** de 3 minutos (Miguel)
- [ ] **ZIP** del código (Diego)
- [ ] **Documento explicativo** (Jonathan): diagrama de arquitectura · track asignado · tipo de
      negocio · **cómo se integraría a un sistema empresarial existente**
- [ ] **Link del repositorio** (Erick)
- [ ] **Link de despliegue** ← el que más tarda y el que más se olvida

> El documento **tiene que decir explícitamente que se usa la API de Gemini**. Es requisito
> literal para calificar al premio del patrocinador y es una línea de texto.

---

## 9. Checklist: criterio de la Guía → dónde se ve → de quién es

Antes de mandar el correo, cada fila necesita una evidencia que se pueda señalar con el dedo:

| Criterio de la Guía | Dónde se ve | Dueño |
|---|---|---|
| HU1 · cuestionario de perfilamiento por IA | `CuestionarioPage` + `GET /api/investor/questions` (5 preguntas servidas por la BD) | Diego |
| HU1 · reglas **visibles y versionadas** | `ComoSeCalculoPage`: badge "reglas v1", umbrales y regla de elegibilidad | ya está |
| HU1 · el usuario entiende cómo influyó su respuesta | Tabla respuesta → puntos → umbral (`v_profiling_breakdown`) | ya está |
| HU2 · catálogo aprobado de instrumentos | `instruments` + `institutions`; el guardarraíl rechaza productos y bancos fuera de catálogo | Erick |
| HU2 · % de asignación, riesgo y explicación legible | `SubcuentaDetallePage`: donut + % **y** USD + emisor con calificación + texto de Gemini | Diego |
| HU2 · no ejecuta órdenes ni promete rentabilidad | `DisclaimerBanner` fijo + `status='pending_review'` + léxico prohibido en `guardrails.py` | Jonathan |
| HU3 · el asesor recibe perfil, propuesta y justificación | `DetallePropuestaPage` + banderas deterministas + **de qué subcuenta es** | Miguel |
| HU3 · aprobar / editar / rechazar | 3 botones → `POST /api/advisor/proposals/{id}/review` | ya está |
| HU3 · fecha + versión de reglas + responsable | `advisor_reviews` + `AuditoriaPage` | ya está |
| Eval #1 · arquitectura agéntica | LangGraph (router · qa · guardrail · refuse) + lógica fuera de la UI | Erick |
| Eval #2 · ajuste al track | 3 HU cerradas + productos que un banco ecuatoriano vende de verdad (DPF y fondos) | todos |
| Eval #3 · **antialucinación** | `guardrails.py` + `test_guardrails.py` + **source chips** + `llm_interactions` | Erick |
| Eval #4 · demo y UX | Video con el caso de Juan Pérez, en el diseño de Brokeate | Miguel + Jonathan |

Las tres filas que hay que enseñar en el documento y en el video, porque son las que se
demuestran con código en vez de prometerse:

- **`test_caso_juan_perez`** — el caso oficial del reto reproducido sin escribir un número a mano.
- **`test_guardrails`** — el sistema es *incapaz* de mostrar un emisor o una cifra inventada.
- **`test_eligibility`** — ningún producto de la plantilla conservadora viene de un banco peor
  que AAA-.
