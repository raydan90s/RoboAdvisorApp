# Parte de Jonathan — Sistema visual, comparador y simulador

**Reparto (§3 y §6 del plan):** sistema visual de Brokeate + `GET /api/catalog/rates` +
`ComparadorPage` + `SimuladorPage`. Estado: **completo y verificado** (tsc limpio,
bundle web compila, 55 tests del backend en verde, endpoint probado en vivo).

---

## 1. Tokens de diseño (`tailwind.config.js`)

La paleta exacta del prototipo Brokeate, extraída de su `App.tsx` (`const C`):
azul marino `#14375E` / `#0A2540` dominante sobre blanco; verde `#1B8A5A`, ámbar
`#C77700` y rojo `#C0362C` **solo semánticos** (éxito / advertencia / error), nunca
decorativos.

**La decisión clave:** se cambiaron los *valores* manteniendo los *nombres* de los
tokens (`brand-primary`, `state-success`, `surface-border`…). Resultado: todas las
pantallas existentes de Diego y Erick adoptan el look de Brokeate con solo hacer
`git pull` — nadie tuvo que tocar su código.

Tokens nuevos disponibles para todos:

- `perfil-conservador` / `perfil-moderado` / `perfil-agresivo` — el color por perfil de
  riesgo del prototipo (navy / ámbar / rojo).
- `brand-ink` (titulares), `brand-mid` y `brand-pale` (azules de gráficos), `brand-gold`
  (el segmento "Oro" de los donuts).
- `stateAlpha-successSoft` / `-warningSoft` / `-errorSoft` — los fondos tenues de badges.

## 2. Componentes compartidos (`src/components/shared/`)

- **Nuevos:** `Boton.tsx` (primario navy / secundario tinte azul, con estado de carga) y
  `Tarjeta.tsx` (la tarjeta base: blanca, borde suave, esquinas 2xl). Base común para
  que las pantallas de subcuentas, agente y catálogo se vean de la misma familia.
- **Reestilizados:** `EstadoBadge` (aprobada ahora es verde semántico), `Estados`
  (spinner navy), `DisclaimerBanner` (ícono ámbar). `Calificacion.tsx` **no se tocó por
  dentro**, como manda el reparto: el pie con calificadora + fecha sigue siendo
  inseparable del rating.
- **`src/constants/colores.ts`:** la misma paleta para props que no aceptan clases
  (iconos, spinners, SVG), con `COLOR_PERFIL` y `COLORES_GRAFICO`.
- Swap mecánico de los hex del tema viejo (`#1E3A8A` → `#14375E`, etc.) en
  `RootNavigator`, `DonutPortafolio` y páginas existentes — solo strings de color,
  cero cambios de estructura.

## 3. Backend: `GET /api/catalog/rates` (`?monto=&plazo_dias=`)

Archivos: `src/routes/catalog_routes.py` · `src/controllers/catalog_controller.py` ·
`src/models/catalog.py` (+ registro en `main.py`).

Lectura pura sobre `instruments` + `institutions` — **no toca el schema ni el motor de
scoring**. Por cada producto devuelve: institución, calificación **con fuente y fecha**
(criterio de antialucinación: el dato viaja citado), tasa, plazo, mínimo de acceso, y:

- **`elegible` + `motivo_no_elegible`:** aplica la misma regla que valida
  `v_institution_eligibility` (`rating_tier <= max_rating_tier` del perfil del usuario
  del token, con la versión de reglas con la que se perfiló). El motivo es el
  `rationale` **versionado** de `profile_institution_rules`, no un texto inventado en
  el front. Los no elegibles **no se filtran: se marcan**.
- **`interes_estimado` + `monto_final`:** si el request trae `?monto=`, los calcula
  **Postgres** (regla 4 del equipo: ningún USD se multiplica en React).

Probado en vivo con Juan Pérez (`juan@demo.ec`): responde `perfil: moderado` y las
tasas ordenadas por calificación. Los 55 tests siguen pasando.

## 4. `ComparadorPage`

Fiel al comparador del prototipo: tabla ordenada por calificación (la ordena el
backend), cada fila con el componente `Calificacion` (imposible mostrar un rating sin
su calificadora y fecha), filtro por plazo, chip con el perfil del usuario, y la nota
educativa **"A mayor tasa, mayor riesgo"**.

Los productos que el perfil no puede tocar salen **en gris, con candado y la regla que
los bloquea** — enseñar la regla trabajando vale más que esconder la fila. Con el
usuario conservador se ve a `DPF Loja 360` (la mejor tasa, 9,4 %) bloqueada por su
calificación AA: la tensión tasa/riesgo hecha pantalla.

Ruta: `navigation.navigate('Comparador', { monto? })` — con monto, las tasas llegan
con interés calculado.

## 5. `SimuladorPage`

Monto (input + chips rápidos) y plazo (180/360/720 días). Cada cambio dispara, con
debounce de 400 ms, una nueva llamada a `/api/catalog/rates?monto=&plazo_dias=`:
**el front no calcula nada**, si el backend se apaga el simulador muestra error en vez
de números viejos.

Resultado: tarjeta destacada con la **mejor opción elegible** para el perfil (monto
final, tasa, capital vs. intereses, y la fuente de la calificación), lista compacta de
las demás opciones (las bloqueadas en gris con su motivo), y el pie fijo *"Datos
referenciales · no garantiza rentabilidad · el asesor aprueba antes de ejecutar"*.

Ruta: `navigation.navigate('Simulador')`.

## 6. Arreglos de paso (desbloqueos para el equipo)

- **`@react-navigation/bottom-tabs`** faltaba en `package.json` y rompía
  `tsc --noEmit` para todos → instalado (hagan `npm install` después del pull).
- **`pytest` y `pytest-asyncio`** faltaban en el entorno → sin ellos fallaban 5 tests
  del agente que en realidad estaban bien (ya están en `requirements.txt`).
- Las pantallas aún **no tienen botón de entrada**: el punto de enganche es de Diego
  (`navigation.navigate('Comparador', { monto? })` y `navigation.navigate('Simulador')`
  desde `SubcuentaDetallePage` o el Home).

## 7. Cómo probarlo

```powershell
# backend            # frontend
cd c:\ROBOADVISORY-BACKEND        cd c:\RoboAdvisorApp
.\.venv\Scripts\Activate.ps1      npx expo start   (w = web, o QR con Expo Go)
uvicorn src.main:app --reload --host 0.0.0.0
```

1. Login `juan@demo.ec` / `demo1234` (Moderado) → botones **Comparar tasas** y
   **Simular** en el inicio.
2. Para ver la elegibilidad bloqueando: perfilarse como conservador
   (`inversionista@demo.ec` / `demo1234`, respuestas cautas) → Banco Loja y VisionFund
   salen en gris con la regla.

---

# Parte de Miguel — Subcuentas, despliegue y mercados externos (Alpha Vantage)

**Reparto:** infraestructura de despliegue (Render + Vercel) · motor de subcuentas
(implementación original, luego unificada con la de Erick) · integración de Alpha
Vantage (wrapper cacheado + Rutas B/C del agente + ticker + diferenciación del chat).
Estado: **completo y verificado** (58 tests del backend en verde, endpoints probados
en vivo contra Alpha Vantage real, flujo de chat verificado de punta a punta con
Playwright).

## 1. Despliegue

- **Backend → Render** (`https://roboadvisory-backend.onrender.com`): blueprint en
  `render.yaml` del backend (`ROBOADVISORY-BACKEND`), creado vía API de Render sobre
  la rama `MiguelsBackend` con `autoDeploy: yes`. `/health` hace un `select 1` real
  contra Supabase.
- **Frontend → Vercel** (`https://roboadvisorapp.vercel.app`): `vercel.json` define
  el build (`expo export -p web`) y el output (`dist`). Desplegado por CLI (el
  proyecto vive en una cuenta de Vercel distinta a la del owner del repo de GitHub,
  así que el auto-deploy por push no está conectado — hay que correr
  `vercel deploy --prod` de nuevo tras cambios en `MiguelApp`).
- Las variables de entorno secretas del backend (`DATABASE_URL`, `JWT_SECRET`,
  `GEMINI_API_KEY`, `ALPHA_VANTAGE_API_KEY`, `CORS_ORIGINS`) están seteadas en Render;
  el front toma la URL del backend de `EXPO_PUBLIC_API_BASE_URL` en tiempo de build.

## 2. Motor de subcuentas (backend)

Implementación original: `profiles.total_capital` +
`profiling_sessions.subaccount_name` (migración `002_subcuentas.sql`), con la regla
*"una subcuenta no puede superar el capital sin asignar"* aplicada **en un trigger de
Postgres** (`fn_valida_capital_subcuenta`), no en Python — bloquea la fila de
`profiles` con `for update` para que dos subcuentas creadas a la vez para el mismo
cliente se serialicen en la base en vez de colarse las dos por una condición de
carrera. Esta migración sigue siendo la base del sistema actual (Erick la extendió
del lado de los modelos/endpoints, sin tocar el trigger ni la migración).

Cubierto por `tests/test_subcuentas.py`: USD 40.000 repartidos en 20k/10k/10k caben
exactos; una cuarta subcuenta de USD 1 devuelve 422.

## 3. Alpha Vantage: wrapper cacheado (`ROBOADVISORY-BACKEND/src/services/market_data.py`)

`GET /api/market/quotes?symbols=...` — nuevo router (`market_routes.py` /
`market_controller.py` / `models/market.py`), registrado en `main.py`.

- **`cachetools.TTLCache` de 1 hora.** La cuota gratuita de Alpha Vantage es de 25
  requests/día; sin caché, el ticker (refrescando cada ~45s) y cada turno de chat de
  mercados la agotarían en los primeros minutos de la demo.
- **Respaldo simulado**: si Alpha Vantage responde `Note` / `Information` /
  `Error Message` (rate limit, o un símbolo que el free tier no sirve — es el caso
  conocido de `JPN225`) o la llamada falla, se sirve una cotización de referencia
  fija con `source: "mock"`. Probado en vivo: al pedir los 5 símbolos en frío, 2-3
  salen de Alpha Vantage real y el resto cae al mock por el límite de 1 req/seg del
  free tier — el ticker nunca se queda en blanco.
- Cubre `BTCUSD`, `XAUUSD`, `JPN225`, `SPY`, `EURUSD` (`CURRENCY_EXCHANGE_RATE` para
  forex/cripto/oro, `GLOBAL_QUOTE` para `SPY`).

## 4. Agente conversacional: de 2 a 3 rutas + mercados (`services/agent_graph.py`)

El grafo que ya existía (router → qa → guardrail → refuse/fallback, obra de Erick)
solo tenía dos caminos: datos del banco, o rechazo — y el rechazo incluía de plano
cualquier mención a bitcoin, forex, acciones, etc. Se extendió a 3 rutas:

```
entrada → router ─┬─(A: bancario)→ qa ──────┐
                   ├─(B: mixto)  → mixto ────┤
                   ├─(C: externo)→ mercado ──┼→ guardrail ─┬─(ok)──────────→ FIN
                   │                         │             ├─(falla,1 vez)→ (misma ruta)
                   └─(fuera de alcance)───────────────────→│             └─(reincide)───→ fallback → FIN
                                                            (refuse) ──────────────────────────────→ FIN
```

- **Ruta A (bancario):** sin cambios — solo los datos del inversionista.
- **Ruta B (mixto):** datos del banco + cotizaciones de Alpha Vantage, para
  preguntas que comparan ("¿cómo se compara mi depósito con el bitcoin?").
- **Ruta C (externo):** 100% Alpha Vantage. El `ContextoPermitido` de esta ruta es
  **cero** contexto del banco — verificado en vivo: cuando el modelo intentó
  mencionar un "depósito a plazo fijo" respondiendo una pregunta 100% externa, el
  guardarraíl lo rechazó dos veces seguidas y cayó a la cotización determinista;
  nunca se le mostró al usuario.
- **Rechazo:** predicciones de mercado ("¿va a subir el bitcoin?"), órdenes de
  compra/venta y tareas ajenas siguen bloqueadas en las tres rutas — dar una
  cotización actual no es lo mismo que predecirla.

**Contención (regla explícita del reto):** B y C nunca insertan en `proposals` ni
`proposal_items` — solo leen y devuelven texto. La única escritura es el historial
de chat (`llm_interactions`), igual que la Ruta A. El disclaimer *"simulación
educativa... NO están en el catálogo del banco"* es obligatorio en B y C: va en el
prompt, y si el modelo no lo escribe se anexa igual antes de responder.
`AgentChatResponse` ahora expone `ruta` para que el front sepa cuál fue.

## 5. Frontend: ticker + diferenciación del chat

- **`MarketTicker.tsx`** (`src/app/inversionista/components/`): barra horizontal
  deslizable en el home de subcuentas (`MisSubcuentasPage`, `initialRouteName` del
  stack del inversionista), de borde a borde de la pantalla. Cada tarjeta: símbolo,
  precio (formato adaptado a la magnitud — 4 decimales para forex, 0 para BTC/Nikkei),
  variación % con flecha y color verde/rojo, y un punto verde/gris que marca si el
  dato es en vivo o simulado. Refresco cada 45s (no gasta cuota extra: relee el
  caché del backend).
- **`Burbuja.tsx`**: las respuestas de Ruta B/C se pintan con borde ámbar y un
  banner *"SIMULACIÓN EDUCATIVA · FUERA DEL BANCO"* antes del texto — el mismo
  lenguaje visual (`state-warning` / `stateAlpha-warningSoft`) que ya usaba el resto
  de la app para advertencias.
- **`SourceChips.tsx`**: reconoce la fuente `alpha_vantage` y la rotula "Alpha
  Vantage (mercado externo, no es del banco)", con el chip en el mismo ámbar.

Verificado de punta a punta con Playwright contra el backend real: preguntar
"¿Cómo está el bitcoin hoy?" desde el chat produce una burbuja ámbar con el aviso,
la cotización real de Alpha Vantage citada por el modelo (`USD 63.863,90`), y el
chip `BTCUSD · USD 63.863,90 · Alpha Vantage`.

## 6. Deuda conocida (no atribuible a este reparto)

El front llama a `POST /api/agent/simulador` y
`PUT /api/investor/proposals/{id}/allocation`, que **no existen** en el backend
actual — quedaron en trabajo de otra rama sin mergear. El Comparador/Simulador del
front fallará hasta que se implementen; queda fuera del alcance de esta parte
(Alpha Vantage no los toca ni los necesita).

## 7. Simulador de mercados globales: gráfico histórico + recomendación IA forzada

Segunda vuelta sobre la Parte 3-5: agrega series de tiempo (gráfico) y una vía
explícita para forzar la Ruta C del agente, sin tocar el catálogo bancario ni los
58 tests.

### Backend: `GET /api/market/history` (`ROBOADVISORY-BACKEND/src/services/market_data.py`)

Mismo wrapper que `/quotes`, con su propia función `obtener_historico()`: cubre las
3 funciones de series de Alpha Vantage (`DIGITAL_CURRENCY_DAILY` para cripto,
`FX_DAILY` para forex/metales, `TIME_SERIES_DAILY` para acciones), cacheadas 1h
igual que las cotizaciones en vivo. Si la cuota se agota o el símbolo no tiene
serie conocida (`JPN225` en el free tier), cae a una **caminata aleatoria
determinista** — sembrada con el símbolo, no con el reloj, así que la curva no
cambia de forma entre una recarga y otra durante la demo. Probado en vivo: `SPY`
trajo 10 días reales de Alpha Vantage; `JPN225` cayó al mock por cuota agotada.

### Backend: forzar la Ruta C (`AgentChatRequest.symbols`)

El router de `agent_graph.py` clasificaba cada mensaje por su texto (regex). Eso
funciona para el chat libre, pero un botón de "recomiéndame esto" no debería
depender de que el mensaje generado contenga las palabras correctas. `symbols` es
la señal explícita: si viene, el router se salta la clasificación y va directo a
Ruta C con esos símbolos — igual pasa por el guardarraíl que cualquier otra ruta.
Probado con un mensaje genérico ("Dame un resumen") + `symbols=[SPY,EURUSD]`: fue
a Ruta C igual y citó exactamente esos dos símbolos con datos reales.

### Frontend: `MercadosSimuladorPage.tsx`

Pantalla nueva, separada del simulador bancario (`SimuladorPage` sigue simulando
productos reales del catálogo con tasas de Postgres — no se tocó). Selector de 4
activos (Bitcoin, S&P 500, EUR/USD, Oro), gráfico de líneas de 30 días
(`components/shared/LineChart.tsx`, SVG a mano igual que `DonutPortafolio` — el
proyecto no trae una librería de charts, y agregar una solo para esta pantalla
sería una dependencia nueva por ~100 líneas de SVG), y el disclaimer permanente
pedido: *"Simulación educativa. Estos activos globales no forman parte del
catálogo institucional ni son ejecutables."* — sin botón de cerrar, mismo criterio
que `DisclaimerBanner`.

El botón **"Recomendación de Mercados (IA)"** llama a `enviarMensaje(...,
symbols: [activo])`: fuerza la Ruta C del backend para el activo que está en
pantalla. La respuesta se pinta con el mismo lenguaje visual ámbar que las
burbujas del chat (banner "SIMULACIÓN EDUCATIVA · FUERA DEL BANCO" + `SourceChips`
con la fuente Alpha Vantage) — reutilizado, no reinventado.

Entrada: tarjeta "Mercados globales" en el home de subcuentas
(`MisSubcuentasPage`), en su propia fila, separada de Comparador/Simulador.

Verificado de punta a punta con Playwright contra el backend real: cambio de
activo (Bitcoin → Oro), gráfico con 30 días de datos reales de Alpha Vantage para
BTCUSD, fallback a mock correctamente etiquetado cuando la cuota de XAUUSD se
agotó ("Cotización de referencia simulada..."), y la recomendación de IA citando
el precio exacto (`USD 2,385.10`) con su chip `XAUUSD · USD 2,385.10 · Alpha
Vantage (simulado)` — la etiqueta de fuente distingue correctamente vivo de
simulado hasta en el chip.
