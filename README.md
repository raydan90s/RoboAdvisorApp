# Brokeate — Robo-Advisor con asesor humano en el lazo

Robo-advisor donde el cliente responde un test de riesgo, el sistema calcula su perfil
**en la base de datos**, arma una propuesta de portafolio con el catálogo del banco y un
**asesor humano la aprueba, edita o rechaza** antes de que sea definitiva. Un agente
conversacional (LangGraph) explica los números, pero nunca los inventa.

Hackathon de Agentes Financieros IA — **Track 3: Robo-Advisory y Automatización de
Estrategias de Inversión**.

---

## Dónde probarlo

| Plataforma | Cómo entrar |
|---|---|
| **Web** (Vercel) | **<https://brokeate-web.vercel.app>** |
| **Android** (APK) | **[Descargar el APK](https://expo.dev/accounts/alatacompany/projects/RoboAdvisorApp/builds/3759fec8-8b58-4de2-bf78-8dfe21d00e53)** (build de EAS, perfil `preview`) |
| **Backend** | Desplegado en **AWS**. La URL no se publica aquí: se configura en el `.env` de cada cliente (`EXPO_PUBLIC_API_BASE_URL` / `VITE_API_BASE_URL`). |

Cuentas demo (las siembra `seed.sql`):

| Correo | Rol | Contraseña |
|---|---|---|
| `inversionista@demo.ec` | inversionista | `demo1234` |
| `juan@demo.ec` | inversionista (perfil Moderado, con datos) | `demo1234` |
| `asesor@demo.ec` | asesor | `demo1234` |

---

## Los tres repositorios

Brokeate son tres repos. Este (`BROKEATE-APP`) es la **app móvil Expo** y además el
paraguas del proyecto: trae los otros dos como submódulos de git.

| Repo | Qué es | Ruta como submódulo |
|---|---|---|
| **[BROKEATE-APP](https://github.com/raydan90s/BROKEATE-APP)** (este) | App móvil — Expo / React Native. Se distribuye como **APK**. | — |
| **[BROKEATE-BACKEND](https://github.com/raydan90s/BROKEATE-BACKEND)** | API — FastAPI + Postgres (Supabase) + agente LangGraph. Corre en **AWS**. | `backend/` |
| **[BROKEATE-WEB](https://github.com/raydan90s/BROKEATE-WEB)** | Frontend web — Vite + React DOM. Desplegado en **Vercel**. | `web/` |

```bash
git clone --recurse-submodules https://github.com/raydan90s/BROKEATE-APP.git
# si ya lo clonaste sin submódulos:
git submodule update --init --recursive
```

---

## Cómo levantarlo

### 1. Backend

Detalle completo en [BROKEATE-BACKEND](https://github.com/raydan90s/BROKEATE-BACKEND)
(Supabase, `schema.sql`, `seed.sql`, keys de IA y de mercados). En corto:

```powershell
cd backend
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn src.main:app --reload --host 0.0.0.0
```

Requiere **Python 3.12**.

### 2. App móvil (este repo)

```powershell
npm install
npx expo start        # a = Android · w = web · o escanea el QR con Expo Go
```

Variables de entorno (archivo `.env` en la raíz, ver [.env.example](.env.example)):

| Variable | Para qué |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | URL del backend (el desplegado en AWS, o tu local) |
| `EXPO_PUBLIC_WHATSAPP_NUMERO` | Número del bot de Twilio; solo prellena el mensaje al abrir WhatsApp |

> **Desde un celular físico:** `localhost` apunta al teléfono, no a tu PC. Levanta el
> backend con `--host 0.0.0.0` y pon la IP local de tu máquina
> (`http://192.168.x.x:8000`) en `EXPO_PUBLIC_API_BASE_URL`.

### 3. Web

```powershell
cd web
npm install
npm run dev           # http://localhost:5173
```

### Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Expo dev server |
| `npm run android` / `ios` / `web` | Arranca en un target concreto |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run apk` | Build del APK en EAS (perfil `preview`) |
| `npm run vercel-build` | `expo export -p web` → `dist/` |

---

## Stack

- **Expo SDK 54** + React Native 0.81 + React 19. El SDK está **pinneado**: 54 es el
  último con cliente publicado de Expo Go; SDK 55+ exige development build (ver
  [AGENTS.md](AGENTS.md)).
- **React Navigation** (stack + bottom tabs), no Expo Router — decisión deliberada.
- **NativeWind 4** (Tailwind) con los tokens de marca en
  [tailwind.config.js](tailwind.config.js), y los mismos colores en
  [src/constants/colores.ts](src/constants/colores.ts) para props que no aceptan clases.
- **expo-secure-store** para el JWT.
- Backend: **FastAPI + Postgres (Supabase) + LangGraph**; mercados externos vía **Alpha
  Vantage** (wrapper cacheado 1 h con respaldo simulado, porque el free tier son 25
  requests/día) y noticias vía **GNews**.

## Estructura de la app

```
src/
├── app/
│   ├── auth/           login, registro, verificación de correo, recuperación
│   ├── inversionista/  subcuentas, cuestionario, propuesta, comparador,
│   │                   simulador bancario, simulador de mercados, noticias
│   ├── asesor/         cola de revisión, detalle de propuesta, auditoría
│   ├── agente/         chat flotante (burbujas, chips de fuente, selector de proveedor)
│   └── whatsapp/       vinculación del bot
├── components/shared/  Boton, Tarjeta, Calificacion, DisclaimerBanner, LineChart…
├── context/            AuthContext (token + rol) · ThemeContext (claro/oscuro)
├── navigation/         RootNavigator — decide el árbol según el rol del token
├── services/           http.ts (fetch + JWT) · tokenStorage.ts (SecureStore)
└── utils/              formato de montos, explicaciones
```

El **rol del token decide toda la navegación**: `advisor` ve la cola y la auditoría;
`investor`, sus subcuentas y el feed. `logout()` no navega a ningún lado —
[RootNavigator.tsx](src/navigation/RootNavigator.tsx) vuelve a decidir y remonta el
árbol.

---

## Las tres historias de usuario del track

| HU | Dónde vive |
|---|---|
| **HU1 — Perfil transparente.** El cuestionario lo sirve la base (`GET /questions`), el puntaje lo calcula Postgres contra `scoring_rules`, y `ComoSeCalculoPage` muestra el desglose respuesta → puntos → umbral. | `CuestionarioPage`, `ComoSeCalculoPage` |
| **HU2 — Propuesta explicable.** Asignación por porcentajes con montos en USD calculados en SQL, riesgo esperado, calificación de cada emisora **con su calificadora y fecha**, y el disclaimer de que no se ejecuta ninguna orden. | `PropuestaPage`, `VistaPropuesta`, `DonutPortafolio` |
| **HU3 — Revisión del asesor.** Cola de pendientes, detalle con banderas deterministas (monto bajo el mínimo, puntaje al borde del umbral), y aprobar / editar / rechazar. Cada decisión queda con fecha, versión de reglas y responsable. | `ColaRevisionPage`, `DetallePropuestaPage`, `AuditoriaPage` |

Además: **subcuentas** (repartir el capital total en varios objetivos, cada uno con su
propio perfil y propuesta), **comparador de tasas** con elegibilidad por perfil,
**simulador** bancario, **simulador de mercados globales** con gráfico histórico,
**feed de noticias**, **ticker** de mercados en el home y un **bot de WhatsApp**.

---

## Antialucinación (criterio de evaluación #3)

**Ningún número que el LLM escribe nace en el LLM.**

- Puntaje, perfil y porcentajes los calculan `scoring_rules`, `profile_thresholds` y
  `allocation_template_items` **en Postgres**. El LLM solo los redacta.
- Todo texto generado se valida contra un `ContextoPermitido` (`guardrails.py`): el
  conjunto cerrado de números, productos, emisores y calificaciones que ese texto tiene
  derecho a citar. Si el modelo inventa algo, el texto se **descarta** (no se corrige),
  se reintenta una vez, y si reincide se cae a una plantilla determinista construida
  desde los datos.
- El agente clasifica cada mensaje en 3 rutas: **A** (datos del banco), **B** (mixto:
  banco + mercados), **C** (100 % mercados externos, con cero contexto del banco). Las
  rutas B y C **nunca escriben** en `proposals` — solo leen y devuelven texto, marcado
  en la UI con borde ámbar y el banner *"SIMULACIÓN EDUCATIVA · FUERA DEL BANCO"*.
- Predicciones de mercado ("¿va a subir el bitcoin?") y órdenes de compra/venta están
  **bloqueadas en las tres rutas**: dar una cotización actual no es lo mismo que
  predecirla.
- Un rating nunca se muestra sin su calificadora y su fecha — el componente
  [Calificacion.tsx](src/components/shared/Calificacion.tsx) los lleva pegados.

---

## Pruebas

- **Backend:** `pytest -q` desde `backend/`. Corren contra la base real sembrada por
  `seed.sql`: validar el motor determinista contra un mock no probaría nada, porque el
  motor *es* la base. Cubren scoring, umbrales, subcuentas (el trigger de capital),
  elegibilidad, edición de asignación, simulador, feed, WhatsApp, guardarraíles y los
  nodos del grafo del agente con el LLM mockeado.
- **App / web:** `npm run typecheck` (tsc estricto). Los flujos de chat, ticker y
  simulador de mercados se verificaron de punta a punta contra el backend real.

---

## Despliegue

- **App → APK:** `npm run apk` (EAS, perfil `preview`, `buildType: apk`). Los perfiles
  están en [eas.json](eas.json); `production` genera un app-bundle para Play Store.
- **Web → Vercel:** el repo [BROKEATE-WEB](https://github.com/raydan90s/BROKEATE-WEB) es
  el que se despliega (Vite → `dist/`, con rewrite SPA). `VITE_API_BASE_URL` y
  `VITE_WHATSAPP_NUMERO` se declaran a mano en Settings → Environment Variables.
- **Backend → AWS:** `uvicorn` sirviendo `src.main:app`, con las variables de entorno
  (base, JWT, keys de IA, mercados, Twilio, SMTP) configuradas en el servidor, nunca en
  el repo. Healthcheck en `/health`.

> Este repo también trae [vercel.json](vercel.json) para exportar la app Expo a web
> (`expo export -p web`). Es un camino alterno: **la web que está en producción es
> BROKEATE-WEB**.

---

## Documentación

| Archivo | Contenido |
|---|---|
| [BROKEATE-BACKEND](https://github.com/raydan90s/BROKEATE-BACKEND) | Endpoints, esquema, migraciones, variables, agente |
| [BROKEATE-WEB](https://github.com/raydan90s/BROKEATE-WEB) | Port a Vite + React DOM |
| [AGENTS.md](AGENTS.md) | Regla de oro del repo: Expo SDK 54 pinneado |
