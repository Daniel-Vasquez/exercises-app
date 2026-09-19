# 🏋️ Coach App — Hoja de Ruta Técnica

**Aplicación web de entrenamiento personalizado**
Astro (SSR/híbrido) · React · Tailwind CSS · Better Auth · MongoDB

> **Estado:** Fase 1 — Análisis y Arquitectura. **Código de aplicación: no iniciado.**
> Documento vivo: cada tanda se marca como completada al cumplir su criterio de aceptación.

---

## 📋 Tabla de Contenidos

- [1. Análisis de la API de ejercicios](#1-análisis-de-la-api-de-ejercicios)
- [2. Decisiones de arquitectura (ADR)](#2-decisiones-de-arquitectura-adr)
- [3. Estrategia de internacionalización EN → ES](#3-estrategia-de-internacionalización-en--es)
- [4. Modelo de datos](#4-modelo-de-datos)
- [5. Los 4 arquetipos de coach](#5-los-4-arquetipos-de-coach)
- [6. Motor determinista de rutinas](#6-motor-determinista-de-rutinas)
- [7. Estructura de carpetas objetivo](#7-estructura-de-carpetas-objetivo)
- [8. Ejecución por tandas](#8-ejecución-por-tandas)
- [9. Riesgos y mitigaciones](#9-riesgos-y-mitigaciones)

---

## 1. Análisis de la API de ejercicios

**Base URL:** `https://exercises-dataset-rho.vercel.app/api/v1`
Verificada en vivo el 2026-09-15 · `health` → `{"status":"healthy","database":"connected"}`

### 1.1 Forma real de un documento

Respuesta real de `GET /exercises?limit=1` (campos completos):

```jsonc
{
  "_id": "6aa9aa6241f42143cbac59a9",
  "id": "0001",                        // 👈 código estable de 4 dígitos — ÚSALO como clave
  "name": "3/4 sit-up",                // 🇬🇧 INGLÉS
  "category": "waist",                 // 🇬🇧 INGLÉS
  "body_part": "waist",                // 🇬🇧 INGLÉS (10 valores posibles)
  "target": "abs",                     // 🇬🇧 INGLÉS (19 valores posibles)
  "muscle_group": "hip flexors",       // 🇬🇧 INGLÉS (29 valores posibles)
  "secondary_muscles": ["hip flexors", "lower back"],
  "equipment": "body weight",          // 🇬🇧 INGLÉS (28 valores posibles)
  "media_id": "2gPfomN",
  "media": {
    "image_url": "https://res.cloudinary.com/.../0001-2gPfomN.jpg",
    "gif_url":   "https://res.cloudinary.com/.../0001-2gPfomN.gif"
  },
  "instructions": "Túmbate sobre tu espalda con las rodillas...",   // ✅ YA EN ESPAÑOL
  "instruction_steps": ["Túmbate sobre tu espalda...", "..."],      // ✅ YA EN ESPAÑOL
  "tags": ["waist", "abs", "body weight", "hip flexors", "lower back"],
  "attribution": "© Gym visual — https://gymvisual.com/"
}
```

### 1.2 Hallazgo crítico #1 — Las instrucciones YA están en español

El enunciado del proyecto asumía que *toda* la API estaba en inglés. **No es así.**
Verificado sobre datos reales: `instructions` e `instruction_steps` vienen **ya traducidos al español**
(el seed de la API los insertó traducidos en MongoDB Atlas).

**Consecuencia:** lo que era "traducir una API entera" se reduce a traducir **dos cosas**:

| Campo | Idioma real | Trabajo necesario |
| :--- | :--- | :--- |
| `instructions`, `instruction_steps` | 🇪🇸 Español | **Ninguno** — passthrough directo |
| `body_part`, `target`, `equipment`, `muscle_group`, `secondary_muscles`, `category`, `tags` | 🇬🇧 Inglés | Diccionario cerrado — **86 términos** |
| `name` | 🇬🇧 Inglés | 1.318 nombres únicos — ver §3.3 |

Esto elimina por completo la necesidad de un servicio de traducción automática en runtime.

### 1.3 Hallazgo crítico #2 — La taxonomía es un conjunto cerrado y pequeño

Enumerada exhaustivamente desde los endpoints de taxonomía. **Total: 86 términos.**

| Endpoint | Nº | Valores |
| :--- | ---: | :--- |
| `GET /body-parts` | 10 | `back`, `cardio`, `chest`, `lower arms`, `lower legs`, `neck`, `shoulders`, `upper arms`, `upper legs`, `waist` |
| `GET /targets` | 19 | `abductors`, `abs`, `adductors`, `biceps`, `calves`, `cardiovascular system`, `delts`, `forearms`, `glutes`, `hamstrings`, `lats`, `levator scapulae`, `pectorals`, `quads`, `serratus anterior`, `spine`, `traps`, `triceps`, `upper back` |
| `GET /equipments` | 28 | `assisted`, `band`, `barbell`, `body weight`, `bosu ball`, `cable`, `dumbbell`, `elliptical machine`, `ez barbell`, `hammer`, `kettlebell`, `leverage machine`, `medicine ball`, `olympic barbell`, `resistance band`, `roller`, `rope`, `skierg machine`, `sled machine`, `smith machine`, `stability ball`, `stationary bike`, `stepmill machine`, `tire`, `trap bar`, `upper body ergometer`, `weighted`, `wheel roller` |
| `GET /muscles` | 29 | `abdominals`, `ankle stabilizers`, `ankles`, `biceps`, `calves`, `chest`, `core`, `deltoids`, `forearms`, `glutes`, `hamstrings`, `hands`, `hip flexors`, `latissimus dorsi`, `lats`, `lower back`, `obliques`, `quadriceps`, `rhomboids`, `rotator cuff`, `shoulders`, `soleus`, `trapezius`, `traps`, `triceps`, `upper back`, `wrist extensors`, `wrist flexors`, `wrists` |

Al ser un conjunto **finito, cerrado y verificado**, un diccionario estático escrito a mano
alcanza **100% de cobertura garantizada**, sin heurísticas ni fallbacks. Además nos da los
valores exactos que el motor de rutinas puede usar como filtros — no hay que adivinarlos.

> ⚠️ Nota de vocabulario: `target` y `muscle_group` se solapan (`biceps`, `calves`, `lats`,
> `traps`, `triceps`, `upper back`, `forearms`, `glutes`, `hamstrings` aparecen en ambos).
> El diccionario será **uno solo compartido** (`muscles.es.ts`), no dos, para evitar divergencias.

### 1.4 Análisis de los 1.324 nombres de ejercicio

Descargados los 1.324 nombres y analizada su composición léxica:

```
Nombres totales ............. 1.324
Nombres únicos .............. 1.318   (6 duplicados exactos)
Tokens de palabra únicos ....   525
Tokens que aparecen 1 sola vez  223

Cobertura acumulada por frecuencia de token:
  top  50 tokens → 66,8% de las ocurrencias
  top 100 tokens → 82,5%
  top 200 tokens → 92,1%
  top 300 tokens → 96,0%
  top 400 tokens → 97,8%
```

Tokens más frecuentes: `dumbbell(286)`, `curl(181)`, `press(165)`, `barbell(159)`, `cable(156)`,
`arm(148)`, `one(138)`, `up(124)`, `seated(118)`, `raise(111)`, `leg(104)`, `grip(100)`, `row(96)`,
`standing(95)`, `ball(95)`, `incline(76)`, `reverse(76)`, `squat(75)`, `lever(74)`, `bench(72)`.

**Lectura:** los nombres son **composicionales y muy regulares** —
`[equipo] [posición] [modificador] [movimiento] [variante de agarre]`
(ej. `dumbbell seated one leg calf raise - hammer grip`). Esto los hace ideales para un
traductor por tokens con reglas de reordenamiento, y descarta la necesidad de traducción neuronal.

### 1.5 Endpoints y su uso previsto en esta app

| Endpoint | ¿Lo usamos? | Para qué |
| :--- | :--- | :--- |
| `GET /health` | ✅ | Health-check del sync; mantener vivo el cluster Atlas (se pausa a los 60 días) |
| `GET /exercises` (paginado, `fields`) | ✅✅ | **Sync completo del catálogo** (14 páginas × 100) |
| `GET /exercises/:id` | ⚠️ | Solo fallback puntual; tras el sync leemos de nuestra BD |
| `GET /exercises/search?q=` | ❌ | **Descartado** — busca en inglés. Buscamos en local sobre `name_es` |
| `GET /exercises/random` | ❌ | **Descartado** — no determinista. El motor necesita reproducibilidad (§6.4) |
| `GET /body-parts` `/targets` `/equipments` `/muscles` | ✅ | Validar el diccionario en CI y detectar términos nuevos |

---

## 2. Decisiones de arquitectura (ADR)

### ADR-01 — Sincronizar el catálogo a nuestra propia MongoDB en vez de consultar la API en cada render

**Decisión:** un script `npm run sync:exercises` descarga los 1.324 ejercicios **una sola vez**,
los traduce en el momento de la ingesta y los guarda en nuestra colección `exercises`.
La app **nunca** llama a la API de ejercicios durante una petición de usuario.

**Por qué:**
- El motor de rutinas hace **decenas de consultas de pool** por generación (filtrar por
  `body_part` + `equipment` + exclusiones). Hacerlo por HTTP sería lentísimo y frágil.
- La API vive en un **Atlas M0 gratuito que se pausa por inactividad** y en funciones
  serverless con cold start. Acoplar el runtime de nuestra app a eso es un riesgo de disponibilidad.
- Traducir **en la ingesta** (una vez, 1.324 documentos) en lugar de **en cada render**
  (miles de veces) es la decisión de rendimiento correcta, y además hace la traducción
  auditable y corregible: es un dato en la BD, no el resultado de una función.
- Nos permite **buscar en español** con un índice de texto sobre `name_es` (§3.5).

**Coste:** el catálogo puede quedar desactualizado. Mitigación: el sync es idempotente
(`upsert` por `id`) y se puede re-ejecutar cuando se quiera.

### ADR-02 — Tailwind vía `@tailwindcss/vite`, no `@astrojs/tailwind`

**Advertencia sobre la especificación.** La spec pide `@astrojs/tailwind`. He verificado en el
registro de npm que **esa integración no es compatible con el stack actual**:

```
@astrojs/tailwind@6.0.2  → peerDependencies: { astro: "^3 || ^4 || ^5", tailwindcss: "^3.0.24" }
astro (latest)           → 7.3.2     ❌ fuera del rango de peers
tailwindcss (latest)     → 4.3.3     ❌ fuera del rango de peers
```

`@astrojs/tailwind` quedó congelado en la era Tailwind 3; desde Tailwind 4 el camino oficial
es el plugin de Vite. Instalarlo tal cual produciría conflicto de peers y una config muerta.

**Decisión (por defecto):** Astro 7 + Tailwind 4 + `@tailwindcss/vite`, con la config en CSS
(`@import "tailwindcss"` + `@theme`), sin `tailwind.config.js`.

**Alternativa si prefieres la spec literal:** fijar `astro@^5` + `tailwindcss@^3` +
`@astrojs/tailwind@^6`. Es un stack coherente y funcional, solo que dos versiones mayores
por detrás. **Dímelo antes de la Tanda 0 y cambio el pin**; a partir de la Tanda 1 el
coste de migrar crece.

### ADR-03 — Renderizado: `server` con islas, no `static`

`output: 'server'` + adaptador **`@astrojs/vercel`** (funciones serverless).

> **Actualizado tras el primer despliegue.** El andamiaje se montó con `@astrojs/node`
> en modo `standalone`, que compila un servidor autónomo en `dist/server/entry.mjs`.
> Vercel nunca invoca ese entrypoint: su preset de Astro sirve `dist/`, y como
> `output: 'server'` no emite HTML estático, las rutas se quedan sin nada que servir —
> el build pasa en verde pero el sitio no funciona. Con `@astrojs/vercel` el build
> genera `.vercel/output/` (Build Output API), que es lo que Vercel sí consume.
> `@astrojs/node` sigue siendo la elección correcta si algún día migras a un VPS.
Todas las rutas son específicas del usuario y están detrás de sesión; el pre-render estático
no aporta nada. Solo la landing pública de `/` puede marcarse `export const prerender = true`.
React se usa **exclusivamente como islas** (`client:load` / `client:visible`) para las tres
piezas realmente interactivas: registro de series, calendario y gráficas. El resto es `.astro`.

### ADR-04 — Better Auth con adaptador oficial de MongoDB, compartiendo cliente

`better-auth/adapters/mongodb` (verificado: el paquete exporta ese subpath).
Better Auth gestiona `user`, `session`, `account`, `verification`. Nuestras colecciones de
dominio viven en la **misma base de datos y el mismo `MongoClient`** (singleton reutilizado
entre peticiones) para no abrir dos pools de conexiones.
Sin verificación de email ni recuperación de contraseña, según la spec.

### ADR-05 — El motor de rutinas es puro y determinista, aislado de I/O

`generateRoutine(inputs) → Routine` es una **función pura**: recibe las respuestas del
cuestionario, el arquetipo de coach y el **pool de ejercicios ya cargado**; devuelve la rutina.
No hace fetch ni toca la BD. Esto la hace testeable sin mocks, reproducible y portable.
La aleatoriedad controlada usa un **PRNG con semilla** (§6.4).

---

## 3. Estrategia de internacionalización EN → ES

Arquitectura en **4 capas**, de coste cero a coste decreciente. Punto clave: **toda la
traducción ocurre en tiempo de build/ingesta, ninguna en tiempo de petición.**

```
┌──────────────────────────────────────────────────────────────────────┐
│  CAPA 0 · PASSTHROUGH                                    coste: 0    │
│  instructions + instruction_steps → ya vienen en español             │
├──────────────────────────────────────────────────────────────────────┤
│  CAPA 1 · DICCIONARIO DE TAXONOMÍA           86 términos · 100% cob. │
│  body_part · target · muscle_group · equipment · secondary · tags    │
├──────────────────────────────────────────────────────────────────────┤
│  CAPA 2 · NOMBRES DE EJERCICIO                        1.318 únicos   │
│  2A diccionario por `id` (generado, commiteado)  → cobertura O(1)    │
│  2B traductor por tokens + reglas de orden       → fallback          │
│  2C passthrough EN + registro de fallo           → red de seguridad  │
├──────────────────────────────────────────────────────────────────────┤
│  CAPA 3 · COPY DE LA APP                                             │
│  Textos propios de la UI en src/i18n/es.ts (locale único)            │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.1 Capa 1 — Diccionario de taxonomía (`src/lib/i18n/`)

Cuatro mapas `Record<string, string>` tipados, con las claves exactas enumeradas en §1.3.
Al ser conjunto cerrado y verificado, la cobertura es **total por construcción**:

```ts
// src/lib/i18n/body-parts.es.ts
export const BODY_PARTS_ES = {
  'back': 'Espalda',
  'cardio': 'Cardio',
  'chest': 'Pecho',
  'lower arms': 'Antebrazos',
  'lower legs': 'Pantorrillas',
  'neck': 'Cuello',
  'shoulders': 'Hombros',
  'upper arms': 'Brazos',
  'upper legs': 'Piernas',
  'waist': 'Core / Abdomen',
} as const satisfies Record<string, string>;

export type BodyPart = keyof typeof BODY_PARTS_ES;   // 👈 tipos derivados del diccionario
```

**Beneficio secundario:** `keyof typeof` convierte el diccionario en la **fuente de verdad de
tipos** para el motor de rutinas. Un filtro por un `body_part` inexistente no compila.

**Test de integridad (Tanda 2):** un test golpea los 4 endpoints de taxonomía y falla si la API
devuelve algún término que no está en el diccionario. Así una ampliación futura del dataset
se detecta en CI, no en producción.

### 3.2 Capa 2A — Diccionario de nombres por `id` (mecanismo principal)

Un artefacto generado **una vez** y **commiteado al repo**:

```jsonc
// src/lib/i18n/generated/exercise-names.es.json
{
  "0001": "Abdominales 3/4",
  "0002": "Flexión lateral a 45°",
  "0007": "Curl de bíceps con banda",
  // … 1.324 entradas
}
```

- Generado por `scripts/build-name-dictionary.ts` (Tanda 2), que aplica el traductor por
  tokens (§3.3) y escribe el JSON para **revisión humana**.
- Al estar versionado en git, cualquier corrección de estilo (`"Press de banca"` en vez de
  `"Prensa de banco"`) es un diff revisable, no un bug fantasma.
- Lookup **O(1) por `id`** en el sync. Coste en runtime: **cero**.
- Peso: ~60 KB de JSON, cargado solo en el proceso de sync (nunca se envía al navegador).

### 3.3 Capa 2B — Traductor por tokens con reordenamiento (fallback)

Genera 2A y cubre cualquier ejercicio que la API añada después. El inglés es
**modificador-primero**, el español **núcleo-primero**; hay que reordenar, no traducir palabra a palabra:

```
  EN:  dumbbell   seated   one leg   calf raise   - hammer grip
        [equipo]  [posic.] [modif.]  [MOVIMIENTO] [agarre]
  ES:  Elevación de talón   a una pierna   sentado   con mancuerna   (agarre martillo)
        [MOVIMIENTO]        [modif.]       [posic.]  [equipo]        [agarre]
```

**Pipeline:**

1. **Normalizar** — minúsculas, separar `-`/`/`, conservar números y símbolos (`3/4`, `45°`, `v`).
2. **Frases primero** — un mapa de n-gramas se aplica antes que los tokens sueltos, porque
   el significado no es composicional:
   `close-grip` → *agarre cerrado* · `body weight` → *peso corporal* ·
   `ez barbell` → *barra Z* · `upper body ergometer` → *ergómetro de brazos* ·
   `sit-up` → *abdominal* · `push-up` → *flexión* · `pull-up` → *dominada*
3. **Clasificar tokens** en ranuras: `MOVIMIENTO` (curl, press, raise, row, squat…),
   `EQUIPO` (dumbbell, barbell, cable…), `POSICIÓN` (seated, standing, lying, incline…),
   `MODIFICADOR` (one arm, alternate, reverse, close…), `AGARRE` (hammer grip, wide grip…).
4. **Reensamblar** con la plantilla española:
   `MOVIMIENTO + MODIFICADOR + POSICIÓN + "con " EQUIPO + "(" AGARRE ")"`.
5. **Pulir** — mayúscula inicial, colapsar espacios, arreglar `de el` → `del`, `con peso corporal` → *(omitir)*.

El lexicón necesario son **525 tokens**, de los cuales los 200 primeros ya cubren el 92% de
las ocurrencias. Se construye por orden de frecuencia: alto impacto primero.

### 3.4 Capa 2C — Passthrough con telemetría

Si un `id` no está en 2A y 2B deja tokens sin traducir, se guarda el nombre en inglés en
`name_es` y se añade el token a `sync-report.json`. El sync **nunca falla** por una traducción
faltante; solo lo reporta. Degradación elegante.

### 3.5 Búsqueda en español (efecto secundario valioso)

Como guardamos `name_es` en **nuestra** MongoDB, creamos un índice de texto sobre
`name_es` + `search_blob` (nombre ES + músculos ES + equipo ES, sin acentos y en minúsculas).
El usuario escribe *"press de banca"* o *"dominadas"* y busca en español sobre datos locales.
El endpoint `/exercises/search` de la API remota queda **descartado**: solo entiende inglés.

### 3.6 Documento traducido resultante (lo que guardamos)

```jsonc
{
  "id": "0001",
  "name_en": "3/4 sit-up",          // se conserva: auditoría y re-traducción
  "name_es": "Abdominales 3/4",
  "body_part": "waist",             // clave canónica EN → filtros del motor
  "body_part_es": "Core / Abdomen", // etiqueta de UI
  "target": "abs",       "target_es": "Abdominales",
  "equipment": "body weight", "equipment_es": "Peso corporal",
  "muscle_group": "hip flexors", "muscle_group_es": "Flexores de cadera",
  "secondary_muscles_es": ["Flexores de cadera", "Zona lumbar"],
  "instructions": "…",              // passthrough
  "instruction_steps": ["…"],       // passthrough
  "media": { "image_url": "…", "gif_url": "…" },
  "search_blob": "abdominales 3 4 core abdomen peso corporal",
  "translation": { "source": "dict" | "tokens" | "passthrough", "at": "2026-09-15T…" }
}
```

> **Regla de oro:** los **filtros** siempre usan la clave canónica en inglés;
> el **español es solo presentación**. Así la lógica de negocio nunca depende del idioma.

---

## 4. Modelo de datos

Base de datos única. Colecciones de Better Auth + colecciones de dominio.

### 4.1 Gestionadas por Better Auth

`user` · `session` · `account` · `verification` — esquema creado por el adaptador. No las tocamos.
`user` guarda `name`, `email`, `emailVerified(false)`, `createdAt`.

### 4.2 `exercises` — catálogo local (global, no por usuario)

Documento de §3.6. Índices:

```js
{ id: 1 }                                      // unique  → upsert del sync
{ body_part: 1, equipment: 1 }                 //         → consultas de pool del motor
{ target: 1 }
{ name_es: "text", search_blob: "text" }       //         → búsqueda en español
```

### 4.3 `profiles` — perfil + cuestionario (1 por usuario)

```jsonc
{
  "userId": "…",              // unique
  "coachId": "fuerza" | "hipertrofia" | "definicion" | "salud",
  "questionnaire": {
    "experiencia": "principiante" | "intermedio" | "avanzado",
    "diasPorSemana": 2 | 3 | 4 | 5 | 6,
    "minutosPorSesion": 30 | 45 | 60 | 90,
    "material": "casa_sin_equipo" | "casa_mancuernas" | "gimnasio_basico" | "gimnasio_completo",
    "zonasAEvitar": ["hombro", "rodilla", "lumbar", "codo", "cuello", "muñeca", "cadera"],
    "objetivoPeso": "perder" | "mantener" | "ganar",
    "extras": { /* respuestas específicas del coach — ver §5 */ }
  },
  "completedAt": "…", "updatedAt": "…"
}
```

### 4.4 `routines` — rutina generada

```jsonc
{
  "_id": "…", "userId": "…",            // index { userId:1, status:1 }
  "status": "active" | "archived",       // como máximo UNA activa por usuario
  "coachId": "hipertrofia",
  "splitName": "Torso / Pierna",
  "seed": "a91f…",                       // 👈 reproducibilidad (§6.4)
  "inputsSnapshot": { /* copia del cuestionario al generar */ },
  "days": [
    {
      "dayIndex": 0, "label": "Día 1 · Torso (Empuje)",
      "focus": ["chest", "shoulders", "upper arms"],
      "blocks": [
        {
          "exerciseId": "0025", "order": 1, "slot": "compuesto_principal",
          "sets": 4, "repsMin": 6, "repsMax": 8,
          "restSeconds": 180, "tempo": "3-1-1", "notes": "Deja 2 reps en recámara."
        }
      ]
    }
  ],
  "generatedAt": "…", "archivedAt": null
}
```

> La rutina guarda `exerciseId`, **no** el ejercicio embebido: una sola fuente de verdad,
> y re-traducir el catálogo mejora automáticamente todas las rutinas existentes.

### 4.5 `workout_logs` — registro diario (el corazón de /calendario y /progreso)

```jsonc
{
  "userId": "…", "routineId": "…",
  "date": "2026-09-15",                 // 👈 STRING YYYY-MM-DD en hora local del usuario
  "dayIndex": 0,
  "status": "in_progress" | "completed" | "skipped",
  "entries": [
    {
      "exerciseId": "0025",
      "sets": [
        { "setNumber": 1, "reps": 8, "weightKg": 60, "done": true, "completedAt": "…" },
        { "setNumber": 2, "reps": 7, "weightKg": 60, "done": true, "completedAt": "…" }
      ]
    }
  ],
  "totals": { "volumeKg": 3480, "setsCompleted": 12, "setsPlanned": 14 },  // desnormalizado
  "startedAt": "…", "completedAt": "…", "updatedAt": "…"
}
```

**Índice:** `{ userId: 1, date: -1 }` y **unique** `{ userId: 1, date: 1, dayIndex: 1 }`
(idempotencia: reenviar un registro actualiza, no duplica).

**Dos decisiones deliberadas:**
- **`date` como string `YYYY-MM-DD`, no `Date`.** Un entrenamiento a las 22:00 en México es
  un `Date` UTC del día siguiente; el calendario lo pintaría en la casilla equivocada. El día
  de entrenamiento es un concepto de **calendario local**, no un instante. Es el bug clásico de
  esta pantalla y se evita por diseño.
- **`totals` desnormalizado** al guardar. `/progreso` y `/calendario` leen agregados de
  semanas o meses; recalcular sumando series en cada carga es innecesariamente caro.

---

## 5. Los 4 arquetipos de coach

Definidos en `src/lib/coaches/` como datos puros (sin IA, sin llamadas externas).
Cada coach aporta: identidad, **parámetros de prescripción**, **matriz de splits**,
**prioridad de ranuras** y **preguntas extra del cuestionario**.

### 5.1 Tabla comparativa

| | 🏋️ **Fuerza** | 💪 **Hipertrofia** | 🔥 **Definición** | 🌱 **Salud** |
| :--- | :--- | :--- | :--- | :--- |
| `coachId` | `fuerza` | `hipertrofia` | `definicion` | `salud` |
| Nombre | Marco "El Fundamento" | Nadia "La Escultora" | Kenji "El Motor" | Elena "La Base" |
| Filosofía | *"Domina cinco movimientos y el resto llega solo."* | *"El músculo crece con volumen bien aplicado."* | *"La grasa se derrite con densidad, no con castigo."* | *"Primero moverse bien; después moverse fuerte."* |
| Público | Intermedio/avanzado con barra | Quiere ganar masa visible | Recomposición, poco tiempo | Sedentario, mayores, post-lesión |
| Rango de reps | 3–6 | 8–12 (aislados 12–15) | 12–20 + circuitos | 10–15 |
| Series/ejercicio | 4–5 | 3–4 | 3 | 2–3 |
| Descanso | 180–300 s | 60–90 s | 30–45 s | 60 s |
| Ejercicios/sesión | 4–5 | 6–7 | 7–9 | 5–6 |
| Equipo preferido | `barbell`, `olympic barbell`, `trap bar` | `dumbbell`, `cable`, `leverage machine` | `body weight`, `kettlebell`, `band` | `leverage machine`, `body weight`, `assisted` |
| Equipo evitado | `assisted`, `bosu ball` | — | `olympic barbell` | `olympic barbell`, `barbell`, `tire` |
| Progresión | Lineal en carga (+2,5 kg) | Doble progresión (reps→carga) | Densidad (↓ descanso) | Técnica y rango |
| Splits | 3d Full-Body · 4d Torso/Pierna | 3d PPL · 4d T/P · 5d PPL+TP · 6d PPL×2 | 2–3d Full-Body · 4d T/P | 2d Full-Body A/B · 3d Full-Body A/B/C |

### 5.2 Cómo cada coach adapta el cuestionario

**Preguntas base (todos):** experiencia · días por semana · minutos por sesión · material
disponible · zonas a evitar · objetivo de peso.

**Extras por coach** (`questionnaire.extras`):

| Coach | Preguntas adicionales | Efecto en el motor |
| :--- | :--- | :--- |
| **Fuerza** | ¿Conoces la técnica de sentadilla/peso muerto/press banca? · ¿1RM aproximado? · ¿Tienes rack o jaula? | Sin técnica → sustituye barra libre por `smith machine`/`leverage machine`. Sin rack → elimina back squat y press militar de pie. |
| **Hipertrofia** | ¿Grupo muscular prioritario? · ¿Tolerancia al fallo muscular? | El grupo prioritario recibe **+1 ejercicio y +1 serie**. Tolerancia alta → añade dropsets en el último aislado. |
| **Definición** | ¿Te gusta el cardio o lo odias? · ¿Espacio para saltar? · ¿Impacto articular permitido? | Odia cardio → formato circuito con pesas en vez de bloque de cardio. Sin espacio/impacto → excluye pliométricos y `body_part: cardio` de salto. |
| **Salud** | ¿Tiempo sentado al día? · ¿Dolor actual (0–10)? · ¿Objetivo funcional? (subir escaleras, cargar nietos…) | Sedentarismo alto → prioriza `upper back`, `glutes`, `spine` (antídoto postural). Dolor ≥ 5 → solo `body weight`/`assisted`, tope 2 series. |

### 5.3 Forma del objeto coach

```ts
// src/lib/coaches/types.ts
export interface CoachArchetype {
  id: CoachId;
  nombre: string; titulo: string; filosofia: string;
  colorAccent: string; emoji: string;
  prescripcion: {
    setsPorSlot:  Record<SlotType, number>;
    repRange:     Record<SlotType, [number, number]>;
    restSeconds:  Record<SlotType, number>;
    ejerciciosPorSesion: [number, number];
  };
  equipoPreferido: Equipment[];
  equipoVetado:    Equipment[];
  splitMatrix: Record<2|3|4|5|6, SplitTemplate>;
  preguntasExtra: QuestionDef[];
  progresion: 'lineal' | 'doble' | 'densidad' | 'tecnica';
}
```

---

## 6. Motor determinista de rutinas

`src/lib/engine/` — función pura, sin I/O, 100% testeable (ADR-05).

### 6.1 Pipeline

```
Cuestionario + CoachArchetype + Pool de ejercicios
        │
  1 ► RESOLVER RESTRICCIONES
        equipoDisponible ∩ equipoPreferido − equipoVetado − material del usuario
        músculos/patrones excluidos ← zonasAEvitar
        │
  2 ► ELEGIR SPLIT
        coach.splitMatrix[diasPorSemana] → plantilla de N días con foco muscular
        │
  3 ► EXPANDIR RANURAS (slots) POR DÍA
        cada día = lista ordenada de SlotType, recortada por minutosPorSesion
        │
  4 ► CONSTRUIR POOL POR RANURA
        filtrar catálogo: body_part ∈ foco · equipment ∈ disponible
                          · target ∉ excluidos · patrón ∉ excluidos
        │
  5 ► SELECCIONAR (determinista, con semilla)
        ordenar por puntuación ↓, desempatar con PRNG(semilla) → elegir 1
        marcar como usado (sin repetir en la misma rutina)
        │
  6 ► PRESCRIBIR
        sets/reps/descanso/tempo ← coach.prescripcion[slot], ajustado por experiencia
        │
  7 ► VALIDAR
        ¿todo día tiene ≥ mínimo de ejercicios? ¿ninguna ranura vacía?
        si falla → relajar restricciones por niveles (§6.5) y reintentar
        │
        ▼
   Routine
```

### 6.2 Ranuras (`SlotType`) — la abstracción central

En vez de "elige 6 ejercicios de pecho", cada día es una secuencia de **roles**:

```
compuesto_principal · compuesto_secundario · accesorio_empuje · accesorio_traccion
accesorio_pierna · aislado · core · cardio_finisher · movilidad
```

Esto garantiza rutinas **estructuralmente sanas** (siempre empieza por lo pesado y compuesto,
termina en aislados) independientemente de qué ejercicios concretos salgan elegidos, y es lo
que hace que la salida "parezca escrita por un entrenador" y no una lista aleatoria.

### 6.3 Puntuación de un ejercicio para una ranura

```
score = 0
  + 40  si equipment ∈ coach.equipoPreferido
  + 30  si el patrón de movimiento encaja con el slot (compuesto↔compuesto)
  + 20  si target == músculo foco del día (no solo secundario)
  + 15  si es el grupo prioritario del usuario (extras de Hipertrofia)
  + 10  si la experiencia del usuario encaja con la complejidad del ejercicio
  −  50 si equipment ∈ coach.equipoVetado
  −  25 si ya hay un ejercicio muy similar en la rutina (mismo target + patrón)
```

### 6.4 Determinismo — PRNG con semilla

**Requisito:** misma entrada → misma rutina, siempre. Pero **usuarios distintos con las mismas
respuestas no deben recibir rutinas idénticas** (se sentiría genérico).

```ts
seed = sha256(userId + coachId + JSON.stringify(questionnaire) + routineVersion)
rng  = mulberry32(seedToInt(seed))   // PRNG determinista de 32 bits
```

La semilla se **guarda en el documento de rutina**. Consecuencias: la generación es
reproducible para depurar, los tests son estables sin mocks, y si el usuario pulsa
"Regenerar" incrementamos `routineVersion` para obtener una rutina distinta **a propósito**.
Por eso se descartó `GET /exercises/random` de la API: rompe todo esto.

### 6.5 Degradación progresiva (evitar el día vacío)

Si un pool queda vacío (ej. *casa sin equipo* + *evitar hombro* + *evitar rodilla*), se relaja
por niveles, **registrando en la rutina qué se relajó** para poder avisar al usuario:

```
N1 ignorar equipoPreferido (cualquier equipo disponible sirve)
N2 permitir ejercicios donde el músculo foco es secundario, no primario
N3 permitir repetir un ejercicio ya usado en otro día
N4 sustituir la ranura por una de movilidad/core segura
N5 marcar el día como "reducido" + nota visible: "Con tu material y limitaciones
   solo pudimos programar 3 ejercicios este día."
```

Nunca se devuelve un día vacío ni se lanza una excepción a la cara del usuario.

### 6.6 Mapa de lesiones → exclusiones

```ts
const EXCLUSIONES: Record<Zona, { targets: Target[]; patterns: Pattern[]; equipment?: Equipment[] }> = {
  hombro:  { targets: ['delts', 'pectorals'], patterns: ['overhead_press', 'wide_grip_push'] },
  rodilla: { targets: ['quads'], patterns: ['deep_squat', 'jump', 'lunge'] },
  lumbar:  { targets: ['spine'], patterns: ['hip_hinge_loaded', 'bent_over_row'], equipment: ['olympic barbell'] },
  codo:    { targets: ['triceps', 'biceps'], patterns: ['skullcrusher', 'dip'] },
  cuello:  { targets: ['levator scapulae', 'traps'], patterns: ['neck_bridge', 'shrug_heavy'] },
  muñeca:  { patterns: ['front_rack', 'straight_bar_curl'], equipment: ['barbell'], targets: [] },
  cadera:  { targets: ['abductors', 'adductors'], patterns: ['deep_squat', 'jump'] },
};
```

El `pattern` **no viene de la API**; se deriva en el sync con reglas sobre `name_en` +
`target` + `equipment`, y se guarda en el documento (`patterns: string[]`). Derivar una vez
en la ingesta en lugar de en cada generación es coherente con el ADR-01.

---

## 7. Estructura de carpetas objetivo

```text
exercises-app/
├── src/
│   ├── pages/
│   │   ├── index.astro                    # / landing + dashboard
│   │   ├── login.astro  · registro.astro
│   │   ├── onboarding/index.astro         # coach + cuestionario
│   │   ├── rutina.astro · calendario.astro · progreso.astro
│   │   └── api/
│   │       ├── auth/[...all].ts           # handler de Better Auth
│   │       ├── onboarding.ts              # POST perfil + dispara generación
│   │       ├── routine/generate.ts · routine/active.ts
│   │       ├── logs/[date].ts             # GET/PUT registro del día
│   │       └── progress/summary.ts
│   ├── components/
│   │   ├── react/
│   │   │   ├── CoachSelector.tsx · Questionnaire.tsx
│   │   │   ├── SetTracker.tsx             # ⭐ pieza interactiva reutilizable
│   │   │   ├── ExerciseCard.tsx           # gif on-demand (§9)
│   │   │   ├── CalendarMonth.tsx
│   │   │   └── charts/{VolumeChart,LoadProgressChart,ConsistencyRing}.tsx
│   │   └── astro/{Nav,Layout,EmptyState,CoachBadge}.astro
│   ├── lib/
│   │   ├── db/{client.ts,collections.ts,indexes.ts}
│   │   ├── auth/{auth.ts,auth-client.ts,guards.ts}
│   │   ├── i18n/
│   │   │   ├── body-parts.es.ts · muscles.es.ts · equipment.es.ts
│   │   │   ├── name-translator.ts
│   │   │   ├── generated/exercise-names.es.json
│   │   │   └── ui/es.ts
│   │   ├── coaches/{types.ts,fuerza.ts,hipertrofia.ts,definicion.ts,salud.ts,index.ts}
│   │   ├── engine/{generate.ts,slots.ts,scoring.ts,constraints.ts,splits.ts,prng.ts,patterns.ts}
│   │   ├── exercises/{repository.ts,api-client.ts}
│   │   └── progress/{aggregate.ts,metrics.ts}
│   ├── middleware.ts                      # protección de rutas + sesión en locals
│   └── styles/global.css                  # @import "tailwindcss" + @theme
├── scripts/
│   ├── sync-exercises.ts                  # API → MongoDB local (traduciendo)
│   ├── build-name-dictionary.ts           # genera exercise-names.es.json
│   ├── ensure-indexes.ts
│   └── check-taxonomy.ts                  # CI: detecta términos nuevos
├── tests/{engine,i18n}/
├── .env.example  ·  .env (git-ignored)
├── astro.config.mjs · tsconfig.json · package.json
└── planificacion.md
```

---

## 8. Ejecución por tandas

**Leyenda de prerrequisitos:** 🔑 variable de entorno · 💻 comando a ejecutar · 🖐️ acción manual tuya.

---

### ✅ TANDA 0 — Andamiaje del proyecto — **COMPLETADA**

**Objetivo.** Proyecto Astro en SSR con React y Tailwind, que arranca y pinta una página
con estilos aplicados. Sin lógica de negocio.

**Archivos a crear**
- `package.json`, `astro.config.mjs`, `tsconfig.json` (`strict: true`, alias `@/*`)
- `src/styles/global.css`, `src/layouts/Layout.astro`, `src/pages/index.astro`
- `src/components/astro/Nav.astro`
- `.gitignore`, `.env.example` *(ya entregado en esta fase)*

**Decisiones aplicadas:** ADR-02 (`@tailwindcss/vite`) y ADR-03 (`output: 'server'` + `@astrojs/vercel`).

**Prerrequisitos de tu lado**
- 🖐️ **Confirma el ADR-02** antes de que empiece: Astro 7 + Tailwind 4 (recomendado)
  o el stack legacy Astro 5 + Tailwind 3 + `@astrojs/tailwind`.
- 💻 `npm install`
- 💻 `npm run dev`

**Criterio de aceptación**
- [x] `npm run dev` levanta sin warnings en `http://localhost:4321`; las 4 rutas devuelven 200.
- [x] `/` renderiza con utilidades Tailwind aplicadas — verificado sobre el CSS compilado:
      `.bg-acento-500 → var(--color-acento-500)` y `.min-h-11 → calc(var(--spacing) * 11)`.
- [x] `npm run build` → `astro check` con **0 errores, 0 warnings, 0 hints** y
      `dist/server/entry.mjs` generado con el adaptador Node.
- [x] La isla React con `client:load` se renderiza en servidor y emite el marcado de
      hidratación correcto (`<astro-island client="load" renderer-url="…/react/dist/client.js">`).
- [ ] **Pendiente de tu comprobación:** el clic real sobre las series. La extensión de Chrome
      no estaba conectada, así que no pude accionarlo yo. Abre `http://localhost:4321` y pulsa
      los tres botones de serie.

**Versiones instaladas:** astro 7.3.2 · @astrojs/react 6.0.5 · @astrojs/node 11.1.5 ·
react 19 · tailwindcss 4.3.3 · @tailwindcss/vite 4.3.3 · typescript 5.9

**Nota de entorno:** npm 11 bloquea por defecto los scripts de instalación. Hubo que ejecutar
`npm install-scripts approve esbuild` para que Vite dispusiera de su binario. Si clonas el
repo en otra máquina, repite ese paso tras `npm install`.

---

### ✅ TANDA 1 — MongoDB + Better Auth + sesiones — **COMPLETADA**

**Objetivo.** Un usuario puede registrarse con nombre/correo/contraseña, iniciar sesión,
mantener la sesión entre recargas y cerrar sesión. Las rutas privadas quedan protegidas.

**Archivos a crear**
- `src/lib/db/client.ts` — `MongoClient` **singleton** (crítico en SSR: sin esto se agota el pool)
- `src/lib/auth/auth.ts` — Better Auth + `mongodbAdapter`, `emailAndPassword: { enabled: true }`,
  `requireEmailVerification: false`
- `src/lib/auth/auth-client.ts`, `src/lib/auth/guards.ts`
- `src/pages/api/auth/[...all].ts`
- `src/pages/login.astro`, `src/pages/registro.astro`
- `src/components/react/AuthForm.tsx`
- `src/middleware.ts` — inyecta sesión en `Astro.locals`; redirige a `/login`
  las rutas `/onboarding`, `/rutina`, `/calendario`, `/progreso`
- `src/env.d.ts` — tipar `App.Locals.user` / `App.Locals.session`

**Prerrequisitos de tu lado**
- 🖐️ Crear cluster en MongoDB Atlas (M0 gratis sirve) y un usuario de base de datos.
- 🖐️ En *Network Access* añadir tu IP (y `0.0.0.0/0` si vas a desplegar en serverless).
- 🔑 `MONGODB_URI`, `MONGODB_DB_NAME`
- 🔑 `BETTER_AUTH_SECRET` → 💻 `openssl rand -base64 32`
- 🔑 `BETTER_AUTH_URL=http://localhost:4321`

**Criterio de aceptación**
- [x] Registro crea documento en `user`; la contraseña se guarda **hasheada** (161 chars) en
      `account`, nunca en `user`, y no aparece en la respuesta de la API.
- [x] Login correcto crea `session` con cookie `httpOnly`; con contraseña incorrecta devuelve
      401 `INVALID_EMAIL_OR_PASSWORD`, correo duplicado 422 y contraseña corta 400.
- [x] `/rutina`, `/calendario` y `/progreso` sin sesión → 302 a `/login?redirigir=…`;
      con sesión → 200.
- [x] Cerrar sesión invalida la cookie: `get-session` pasa a `null` y `/rutina` vuelve a 302.
- [x] Aislamiento multi-usuario: dos cuentas obtienen `id` de sesión distintos.
- [x] **Sin verificación de correo ni recuperación de contraseña** (según spec).
- [ ] **Pendiente de tu comprobación:** el flujo completo en un navegador real (la extensión de
      Chrome sigue sin conectar). Registro → sesión persistente tras F5 → salir.

**Hallazgos de esta tanda (afectan a tandas posteriores):**

1. **`userId` se almacena como `ObjectId`, no como `string`.** El modelo de datos de §4
   asumía string. A partir de la Tanda 3, las colecciones de dominio (`profiles`, `routines`,
   `workout_logs`) deben guardar `userId` como `ObjectId` para poder cruzarse con las
   colecciones de Better Auth; si no, todo `$lookup` y todo filtro fallarán en silencio
   devolviendo cero resultados.
2. **Better Auth no crea índices.** Solo existía `_id_`. Como el middleware resuelve la sesión
   por `token` en **cada petición**, eso era un escaneo completo de colección por request.
   Creados en `scripts/ensure-indexes.ts` (adelantado desde la Tanda 9): `user.email` único,
   `session.token` único, `session.userId`, `session.expiresAt`, `account.userId`,
   `account.{providerId,accountId}`. Verificado que el índice único rechaza duplicados con
   `E11000`, lo que cierra la condición de carrera entre comprobar y registrar.
3. **El prefijo `__Secure-` de la cookie lo decide `advanced.useSecureCookies`**, no el
   atributo `secure`. Si se infiere del esquema de `BETTER_AUTH_URL`, un `.env` local que
   apunte al dominio de producción emite cookies `__Secure-`, que **el navegador rechaza sobre
   `http://localhost`**: el login parece funcionar pero la sesión no persiste, sin error
   visible. Ambas opciones quedan atadas a `import.meta.env.PROD`.
4. **Los campos de formulario en islas React deben ser NO controlados.** Navegadores y
   gestores de contraseñas autorrellenan los campos **antes** de que la isla se hidrate. Con
   inputs controlados (`value` + `onChange`), React encuentra en el DOM un valor donde su
   render decía `value=""`, aborta la hidratación con **React #418** y reconstruye el árbol en
   cliente. La solución es no renderizar el atributo `value` en servidor: campos con `name` y
   lectura con `FormData` al enviar. **Aplica igual al `SetTracker` de la Tanda 5**, que tendrá
   campos de peso y repeticiones.
5. **`FormEvent` está deprecado en `@types/react` 19.** Para un submit el tipo correcto es
   `React.SubmitEvent<HTMLFormElement>`, que además tipa `evento.target` como el formulario y
   permite construir el `FormData` sin castear.
6. **Un 403 en `sign-out` desde curl no es un fallo**: es la protección CSRF. Better Auth exige
   cabecera `Origin` en las peticiones que cambian estado. Verificado que con origen legítimo
   responde 200 y con origen ajeno 403.

**Dependencias añadidas:** `better-auth` 1.7.5 · `@better-auth/mongo-adapter` 1.7.5 (hay que
instalarlo aparte; `better-auth/adapters/mongodb` solo reexporta de él) · `mongodb` 7.6.0 ·
`@types/node` 24 (sin él, `MongoClientOptions` no resuelve los tipos TLS de Node y el
typecheck falla).

---

### ✅ TANDA 2 — Catálogo local + capa de traducción — **COMPLETADA**

**Objetivo.** Los 1.324 ejercicios viven en nuestra MongoDB, traducidos y consultables en
español. Implementa ADR-01 y todo el §3.

**Archivos a crear**
- `src/lib/i18n/body-parts.es.ts`, `muscles.es.ts`, `equipment.es.ts` *(86 términos, §1.3)*
- `src/lib/i18n/name-translator.ts` *(pipeline de 5 pasos, §3.3)*
- `src/lib/i18n/generated/exercise-names.es.json` *(generado y commiteado)*
- `src/lib/exercises/api-client.ts` *(paginación, reintentos con backoff, timeout)*
- `src/lib/exercises/repository.ts` *(consultas de pool que usará el motor)*
- `src/lib/engine/patterns.ts` *(derivación de patrones de movimiento, §6.6)*
- `scripts/sync-exercises.ts`, `scripts/build-name-dictionary.ts`,
  `scripts/ensure-indexes.ts`, `scripts/check-taxonomy.ts`
- `tests/i18n/taxonomy.test.ts` *(falla si la API añade términos no traducidos)*

**Prerrequisitos de tu lado**
- 🔑 `PUBLIC_EXERCISES_API_URL=https://exercises-dataset-rho.vercel.app/api/v1`
- 💻 `npm run build:names` → genera el diccionario de nombres
- 🖐️ **Revisar `exercise-names.es.json`** y corregir lo que suene raro *(paso de calidad;
  es un JSON plano, se revisa en diagonal en ~15 min)*
- 💻 `npm run sync:exercises` *(~1–2 min, 14 peticiones paginadas)*
- 💻 `npm run ensure:indexes`

**Criterio de aceptación**
- [x] `db.exercises.countDocuments()` → **1324**.
- [x] **0 documentos** con `body_part_es`, `target_es` o `equipment_es` vacío (100% taxonomía).
- [x] **100%** de los documentos con `translation.source !== 'passthrough'` (criterio: ≥95%).
- [x] `sync-report.json` lista los tokens pendientes por frecuencia.
- [x] Búsqueda en español operativa: «press de banca», «dominadas», «peso muerto»,
      «elevación de talones» devuelven resultados relevantes.
- [x] Sync **idempotente**: segunda ejecución → 0 insertados, 1324 actualizados, 1324 en total.
- [x] `npm run check:taxonomy` en verde, y **verificado con prueba negativa**: al quitar un
      término del diccionario, falla e imprime la línea exacta que hay que añadir.
- [x] Consultas de pool del motor usando índice (`explain` → `IXSCAN`).

**Calidad de la traducción de nombres.** El traductor por tokens se construyó en dos
iteraciones midiendo sobre los 1.324 nombres reales:

| | nombres sin ningún token pendiente |
| :--- | ---: |
| Primera versión | 57,8% |
| + léxico ampliado y concordancia de género | 80,7% |
| + segundo lote de cola larga | **91,5%** |

El 8,5% restante son 133 términos con 1–2 apariciones cada uno. Ahí la revisión humana del
JSON generado es más barata y mejor que seguir añadiendo reglas.

**Hallazgos de esta tanda:**

1. **La concordancia de género era imprescindible.** Sin ella salía «Sentadilla inverso» y
   «Elevación de talones inverso». Cada movimiento declara género y número, y los adjetivos
   se flexionan contra el núcleo: «Sentadilla inversa» pero «Curl inverso». Las posturas
   (`sentado`, `de pie`) se dejan invariables a propósito: describen a quien ejecuta, no al
   ejercicio, y así se usan en el español de gimnasio.
2. **La API trae datos con mojibake.** Varios nombres contienen `45в°` en vez de `45°`. Se
   normaliza en la ingesta.
3. **`male`, `female` y `pov` son metadatos del GIF**, no del ejercicio («barbell full squat
   (back pov)»). Se descartan al traducir.
4. **Solo 579 de 1.324 ejercicios reciben algún patrón de movimiento.** Es esperable —
   estiramientos y aislados no encajan en patrones compuestos— pero significa que la
   exclusión por lesión de la Tanda 4 **no puede apoyarse solo en `patterns`**: debe combinar
   patrón y `target`, como ya prevé §6.6.
5. **`PUBLIC_EXERCISES_API_URL` debe incluir `/api/v1`** y no llevar barra final. El cliente
   normaliza la barra y, ante un 4xx, devuelve un mensaje que nombra la variable en vez de un
   error de red genérico.

---

### ✅ TANDA 3 — Coaches + onboarding — **COMPLETADA**

**Objetivo.** El usuario elige uno de los 4 coaches, responde el cuestionario adaptado a ese
coach y su perfil queda guardado. Sin generar rutina todavía.

**Archivos a crear**
- `src/lib/coaches/types.ts` + los 4 arquetipos + `index.ts` *(§5)*
- `src/components/react/CoachSelector.tsx` *(4 tarjetas, filosofía, a quién va dirigido)*
- `src/components/react/Questionnaire.tsx` *(multi-paso, preguntas base + extras del coach)*
- `src/pages/onboarding/index.astro`
- `src/pages/api/onboarding.ts` *(POST, validado con Zod)*
- `src/lib/validation/questionnaire.ts`

**Prerrequisitos de tu lado**
- 🖐️ Revisar la tabla §5.1 y decirme si quieres cambiar **nombres, tono o filosofía** de algún
  coach; es contenido de producto, tu criterio manda.
- Ninguna variable de entorno nueva.

**Criterio de aceptación**
- [x] Las 4 tarjetas de coach se muestran como `radiogroup` accesible y seleccionable.
- [x] Las preguntas extra dependen del coach: Hipertrofia pregunta grupo prioritario y
      tolerancia al fallo; Salud pregunta horas sentado, dolor 0–10 y objetivo funcional.
- [x] Validación en cliente **y** en servidor con Zod. Rechazado con 400: coach inexistente,
      días fuera de rango, minutos no permitidos, zona de lesión inventada, extras obligatorios
      ausentes, **extras pertenecientes a otro coach** y escala fuera de rango.
- [x] `profiles` se crea con `userId` como **ObjectId**, y se verificó que cruza con `user`.
- [x] Completado el onboarding, `/onboarding` redirige a `/`; con `?editar=1` permite ajustarlo
      con las respuestas precargadas.
- [x] Multi-usuario: dos cuentas con coaches y extras independientes; rehacer el onboarding
      actualiza el perfil en vez de duplicarlo (2 documentos para 2 usuarios).
- [x] `POST /api/onboarding` anónimo → 401.

**Decisiones de esta tanda:**

1. **`userId` como `ObjectId`**, aplicando el hallazgo de la Tanda 1. Verificado explícitamente
   que cada perfil cruza con su documento en `user`: de haberlo guardado como string, el filtro
   habría devuelto cero resultados sin lanzar ningún error.
2. **Las preguntas extra se validan contra el coach elegido**, no con un esquema estático. Sin
   eso, alguien podría enviar el cuestionario de Fuerza habiendo elegido Salud y el motor
   recibiría respuestas que no sabe interpretar. También se rechazan claves que el coach no
   pidió, para no guardar basura en el perfil.
3. **`userId` sale siempre de la sesión, nunca del cuerpo** de la petición (riesgo R6).
4. **El onboarding es re-editable a propósito.** El criterio original solo pedía no repetirlo;
   redirigir sin más impediría cambiar de coach o de disponibilidad, que es algo que cambia con
   el tiempo. `?editar=1` resuelve ambas cosas.
5. **Se eliminó `PruebaIsla.tsx`**, el smoke test de la Tanda 0: la portada ya tiene contenido
   real y el componente quedaba como código muerto. Estaba previsto retirarlo en la Tanda 5.

---

### ✅ TANDA 4 — Motor determinista de rutinas — **COMPLETADA**

**Objetivo.** El corazón del producto (§6). Cuestionario + coach + catálogo → rutina completa
y estructurada. **Lógica pura, sin UI.**

**Archivos a crear**
- `src/lib/engine/prng.ts`, `constraints.ts`, `splits.ts`, `slots.ts`, `scoring.ts`, `generate.ts`
- `src/pages/api/routine/generate.ts`, `src/pages/api/routine/active.ts`
- `tests/engine/*.test.ts` — la batería clave:
  - determinismo (misma semilla → misma rutina, 100 iteraciones)
  - respeto de exclusiones por lesión
  - respeto del material disponible
  - **ningún día vacío** bajo restricciones extremas (degradación §6.5)
  - coherencia de prescripción con el coach (rangos de reps y descansos)

**Prerrequisitos de tu lado**
- 🔑 `ROUTINE_SEED_SALT` *(cualquier cadena estable; cambiarla regenera rutinas distintas)*
- 💻 `npm test`
- ⚠️ Requiere la Tanda 2 completada: el motor lee del catálogo local.

**Criterio de aceptación**
- [x] Determinismo: **100 generaciones** con la misma entrada dan rutinas byte a byte idénticas.
- [x] Dos usuarios con respuestas idénticas reciben semillas y selecciones distintas.
- [x] Caso extremo (*casa sin equipo* + hombro, rodilla y lumbar) da rutina válida, sin días
      vacíos y con los avisos aplicados.
- [x] «Evitar rodilla» elimina `deep_squat`, `jump` y `lunge`; «hombro» elimina `delts`,
      `overhead_press` y `behind_neck`; «lumbar» elimina `hip_hinge_loaded` y `bent_over_row`.
- [x] Fuerza → 3–5 reps y ≥ 300 s en el compuesto principal; Definición → ≥ 12 reps y ≤ 45 s.
- [x] Generar archiva la anterior: verificado con 3 versiones → **exactamente una activa**.
- [x] Cobertura de `engine/`: `generate.ts` 100%, `scoring.ts` 100%, `slots.ts` 100%,
      `prng.ts` 100%, `constraints.ts` 95,7%. **29 tests, todos en verde.**
- [x] **Auditoría sobre el catálogo real**: 4 coaches × 5 frecuencias × 4 materiales = **80
      rutinas**, cero días vacíos, cero recuentos de días incorrectos.

**Tres problemas de calidad detectados al probar contra el catálogo real** (no aparecían con
fixtures, y ninguno rompía un test: la estructura era correcta y el contenido no):

1. **Los estiramientos rellenaban ranuras de fuerza.** Salía «Estiramiento de pecho tras nuca»
   como accesorio de empuje a 2×12-15. Se derivó un patrón `stretch` en la ingesta; las ranuras
   de fuerza lo prohíben **en todos los niveles de relajación** y la de movilidad lo exige.
2. **Movilidad y cardio prescribían «1-1 repeticiones»**, que no significa nada para quien lo
   lee. Las ranuras declaran ahora su `medida` y esas dos van en **segundos**.
3. **Movimientos tras nuca en el coach de salud.** Cargan el hombro en rotación externa
   extrema. Se añadió el patrón `behind_neck`, vetado por Elena y por la lesión de hombro.

**Limitación conocida y no resuelta.** La API no expone dificultad del ejercicio, así que el
motor solo infiere complejidad por el equipamiento (penaliza barra olímpica y bosu a
principiantes). Puede por tanto programar un ejercicio avanzado de peso corporal —unos fondos
coreanos, por ejemplo— a un principiante. Resolverlo bien exige metadatos de dificultad que
habría que añadir al catálogo a mano o derivar por reglas sobre el nombre; queda anotado como
mejora, no como defecto de diseño del motor.

---

### ✅ TANDA 5 — `/rutina` + registro interactivo de series — **COMPLETADA**

**Objetivo.** La pantalla de uso diario: ver la rutina por días y registrar series, repeticiones
y peso mientras se entrena.

**Archivos a crear**
- `src/pages/rutina.astro` *(pestañas por día; marca el día de hoy)*
- `src/components/react/SetTracker.tsx` — **⭐ componente reutilizable clave**
- `src/components/react/ExerciseCard.tsx` *(imagen estática; el GIF solo bajo interacción, §9)*
- `src/components/react/RestTimer.tsx`
- `src/pages/api/logs/[date].ts` *(GET/PUT idempotente)*
- `src/lib/progress/metrics.ts` *(cálculo de volumen)*

**Diseño de `SetTracker` (se reutiliza en las tandas 6 y 7):**
- Una fila por serie: `nº · reps · kg · ✓`
- **Autorrelleno** con los valores de la última sesión del mismo ejercicio (*lo que más ahorra
  tiempo al usuario real: entrenando no se teclea a gusto*)
- **Guardado optimista** con debounce (~800 ms) + indicador de estado
- **Resistente a la pérdida de conexión:** borrador en `localStorage`, se reconcilia al volver
- Accesible con teclado, `inputMode="decimal"` para teclado numérico en móvil

**Prerrequisitos de tu lado**
- 💻 Completar el onboarding con un usuario real para tener una rutina activa que mostrar.
- 🖐️ Probarlo **en el móvil** (es donde se usará de verdad, con las manos ocupadas).

**Criterio de aceptación**
- [x] `/rutina` muestra la rutina por días con pestañas, y abre el día sugerido de la rotación.
- [x] Marcar una serie la persiste; el `GET` posterior devuelve `[true, true, false]`.
- [x] Editar reps/peso guarda con rebote de 800 ms y estado visible.
- [x] Completar todas las series → `status: "completed"` con `completedAt`.
- [x] `totals.volumeKg` correcto: 2×10×60 = **1200 kg**, y al completar 1200+8×62,5 = **1700 kg**.
- [x] **Idempotencia verificada en dos capas**: 5 PUT idénticos dejan **1 documento**, y una
      inserción directa duplicada la rechaza la propia base de datos con `E11000`.
- [x] El GIF **no se descarga en la carga inicial**: la isla sirve 6 miniaturas `.jpg` y cero
      `.gif`; la URL del GIF viaja en props y solo se pide al pulsar.
- [x] Validación: fecha imposible, formato libre, peso 9999 kg, 500 repeticiones, peso negativo
      y `dayIndex` fuera de rango → **400**. PUT anónimo → **401**.
- [ ] **Pendiente de tu comprobación:** uso real a una mano en 375 px. El marcado está puesto
      (78 objetivos de 44 px, `inputMode` numérico, `aria-label` por serie), pero la ergonomía
      de verdad solo se juzga con el móvil en la mano.

**Decisiones de esta tanda:**

1. **Campos no controlados, por el tecleo antes que por la hidratación.** Un input controlado
   que parsea en cada pulsación convierte `"2."` en `2` y borra el punto mientras se escribe
   `"2.5"`. Los valores viven en el DOM y en un `ref`; solo el estado de «serie hecha» es
   estado de React, porque cambia por toque y el botón debe repintarse.
2. **Guardado optimista con rebote de 800 ms.** Escribir un peso no puede disparar una
   petición por tecla.
3. **El borrador se escribe en `localStorage` ANTES de intentar la red** (riesgo R9). En un
   gimnasio de sótano no hay cobertura, y perder una sesión registrada es la forma más rápida
   de que alguien abandone la app. Al recuperar conexión se reintenta solo.
4. **El borrador se recupera en un efecto, no durante el render.** Leer `localStorage` en el
   inicializador de `useState` se ejecutaría también en el servidor y provocaría exactamente
   la discrepancia de hidratación de la Tanda 1.
5. **El cronómetro de descanso usa marcas de tiempo absolutas**, no un contador que resta un
   segundo por intervalo: el móvil ralentiza los timers al apagar la pantalla, que es justo
   cuando el usuario está descansando.
6. **Autorrelleno con la última sesión** del mismo ejercicio, como marca de agua en el campo y
   como valor al marcar la serie. Es lo que más tiempo ahorra con las manos ocupadas.

---

### 📅 TANDA 6 — `/calendario`

**Objetivo.** Vista mensual para auditar la constancia: qué días se entrenó, cuáles se saltaron.

**Archivos a crear**
- `src/pages/calendario.astro`
- `src/components/react/CalendarMonth.tsx` *(rejilla, navegación de meses, semana empieza en lunes)*
- `src/components/react/DayDetailDrawer.tsx` *(al pulsar un día: resumen de esa sesión)*
- `src/pages/api/progress/calendar.ts` *(`?year=&month=` → agregados del mes)*

**Prerrequisitos de tu lado**
- 🖐️ Registrar entrenamientos en **varios días distintos** (o pedirme un script de datos de
  prueba: `npm run seed:demo`) para que el calendario tenga algo que mostrar.

**Criterio de aceptación**
- [ ] Rejilla mensual correcta, con la semana empezando en lunes.
- [ ] Estados visualmente distinguibles: completado · parcial · saltado · sin programar · futuro.
- [ ] Navegar entre meses funciona y no pierde el estado.
- [ ] **Sin desfase de zona horaria:** un entrenamiento guardado a las 23:30 aparece en *ese*
      día, no en el siguiente *(la razón de §4.5 — verificar explícitamente)*.
- [ ] Pulsar un día abre el detalle con ejercicios, series y volumen de esa sesión.
- [ ] Un mes sin datos muestra un estado vacío útil, no una rejilla rota.
- [ ] Solo se ven los datos del usuario en sesión.

---

### 📈 TANDA 7 — `/progreso`

**Objetivo.** Gráficas e histórico: cargas, volumen y series completadas a lo largo del tiempo.

**Archivos a crear**
- `src/pages/progreso.astro`
- `src/components/react/charts/VolumeChart.tsx` *(volumen semanal, barras)*
- `src/components/react/charts/LoadProgressChart.tsx` *(peso máx. por ejercicio, líneas)*
- `src/components/react/charts/ConsistencyRing.tsx` *(sesiones hechas / programadas)*
- `src/components/react/ExerciseSelector.tsx` *(elegir qué ejercicio graficar, buscando en español)*
- `src/pages/api/progress/summary.ts` *(agregación con pipeline de MongoDB)*
- `src/lib/progress/aggregate.ts`

**Métricas expuestas:** volumen total semanal (kg) · récord personal por ejercicio ·
series completadas vs. planificadas · racha de constancia · reparto de volumen por grupo muscular.

**Prerrequisitos de tu lado**
- 🖐️ Ideal tener ≥ 2 semanas de registros; si no, `npm run seed:demo` genera un histórico realista.
- 🖐️ Decirme si prefieres **Recharts** (lo que propongo: React-nativo, buenos defaults,
  ~100 KB) u otra librería.

**Criterio de aceptación**
- [ ] Las tres gráficas renderizan con datos reales del usuario.
- [ ] El selector de ejercicio filtra la gráfica de cargas y busca en español.
- [ ] La agregación se hace **en MongoDB**, no trayendo todos los logs al servidor.
- [ ] Sin datos suficientes se muestra un estado vacío con guía, no una gráfica vacía.
- [ ] Legible en móvil (gráficas responsivas, no recortadas).
- [ ] La carga de `/progreso` con 6 meses de registros tarda < 1 s.

---

### 🏠 TANDA 8 — Dashboard `/` y pulido de producto

**Objetivo.** Cerrar el círculo: la landing/dashboard que orquesta todo y la coherencia visual.

**Archivos a crear/modificar**
- `src/pages/index.astro` — dos caras: **landing** sin sesión, **dashboard** con sesión
  (entreno de hoy, racha, acceso rápido, resumen del coach)
- `src/components/astro/{EmptyState,CoachBadge,StreakCounter}.astro`
- Revisión de todas las vistas: estados de carga, errores, responsive, foco de teclado
- `src/lib/i18n/ui/es.ts` — centralizar el copy de la app
- `public/` — favicon, manifest, og-image

**Prerrequisitos de tu lado**
- 🖐️ Preferencias de marca: nombre de la app, color de acento, modo claro/oscuro/ambos.

**Criterio de aceptación**
- [ ] Sin sesión, `/` es una landing que explica el producto e invita a registrarse.
- [ ] Con sesión y sin onboarding, `/` empuja a `/onboarding`.
- [ ] Con sesión y rutina activa, `/` muestra el entrenamiento de hoy con acceso en un clic.
- [ ] Ninguna cadena en inglés visible en toda la interfaz.
- [ ] Todas las páginas se ven bien de 375 px a 1440 px.
- [ ] Navegación por teclado completa y contraste AA.

---

### 🛡️ TANDA 9 — Robustez y despliegue

**Objetivo.** Dejarlo listo para usarse de verdad todos los días.

**Archivos a crear/modificar**
- Validación con Zod en **todos** los endpoints de API
- Rate limiting en `/api/auth/*` y `/api/routine/generate`
- `scripts/ensure-indexes.ts` ejecutado en el arranque de producción
- Página de error 500 y `404.astro`
- `README.md` del proyecto
- Config de despliegue (Vercel/Railway/Fly, según elijas)

**Prerrequisitos de tu lado**
- ✅ Plataforma de despliegue: **Vercel** (decidido y ya conectado al repo).
- 🖐️ Configurar las variables de entorno en el panel de Vercel (no se heredan del `.env` local).
- 🔑 Las mismas variables en producción, con `BETTER_AUTH_URL` apuntando al dominio real.
- 🖐️ En Atlas, `0.0.0.0/0` en *Network Access* si el hosting es serverless.

**Criterio de aceptación**
- [ ] Ningún endpoint acepta payload inválido sin devolver 400 con mensaje útil.
- [ ] **Prueba de aislamiento multi-usuario:** con el token del usuario A es imposible leer o
      escribir datos del usuario B en ninguna ruta *(auditoría explícita endpoint por endpoint)*.
- [ ] Índices verificados con `explain()`: las consultas de calendario y progreso usan índice.
- [ ] `npm run build` limpio, sin errores de tipos.
- [ ] Desplegado, con registro → onboarding → rutina → registro de series funcionando en el dominio real.
- [ ] Las cookies de sesión son `Secure` + `httpOnly` + `SameSite=Lax` en producción.

---

### 📊 Resumen de dependencias entre tandas

```
T0 andamiaje
 └─ T1 auth ──────────┬─ T3 onboarding ── T4 motor ── T5 rutina ─┬─ T6 calendario ─┐
                      │                                          └─ T7 progreso ───┤
 └─ T2 catálogo ──────┴──────────────────────────────────────────────────────────── T8 pulido ── T9 deploy
```

**T1 y T2 son independientes entre sí** (auth no necesita el catálogo y viceversa): si quieres
ir más rápido, se pueden abordar en cualquier orden. **T4 es el cuello de botella real** y donde
conviene invertir más tiempo de revisión: todo lo que viene después consume su salida.

---

## 9. Riesgos y mitigaciones

| # | Riesgo | Impacto | Mitigación |
| :-- | :--- | :--- | :--- |
| R1 | **Traducción de nombres de baja calidad** (1.318 nombres compuestos) | Alto — es lo primero que ve el usuario | Diccionario generado + **revisión humana** en T2; el JSON commiteado permite corregir cualquier nombre en un diff de una línea, sin tocar código |
| R2 | **Peso de los GIFs** (1.324 GIFs animados) | Alto — datos móviles y CPU | `image_url` estático por defecto con `loading="lazy"`; el GIF se carga **solo bajo interacción** (la propia API lo recomienda: ahorra >85% de transferencia) |
| R3 | **Desfase de zona horaria** en calendario | Medio — pero muy visible y confuso | `date` como string `YYYY-MM-DD` local (§4.5); criterio de aceptación explícito en T6 |
| R4 | **Cluster Atlas de la API pausado** a los 60 días | Medio — rompería el sync | ADR-01 nos desacopla: la app funciona sin la API una vez sincronizada. Opcional: ping a `/health` programado |
| R5 | **Agotamiento del pool de conexiones** en SSR | Alto — caída bajo carga | `MongoClient` singleton cacheado en `globalThis` (T1), compartido con Better Auth (ADR-04) |
| R6 | **Fuga de datos entre usuarios** | Crítico | `userId` en **toda** consulta; nunca confiar en un id que venga del cliente — siempre de `locals.session`; auditoría dedicada en T9 |
| R7 | **Rutinas que se sienten genéricas o repetitivas** | Medio — riesgo de producto, no técnico | Semilla por usuario (§6.4) + penalización de similitud en el scoring + botón "Regenerar" con `routineVersion` |
| R8 | **Incompatibilidad `@astrojs/tailwind`** | Bloqueante en T0 | Detectado **antes** de escribir código (ADR-02); decisión tuya pendiente, coste actual: cero |
| R9 | **Pérdida de datos entrenando** (móvil sin cobertura en el gimnasio) | Alto — pérdida de confianza | Borrador en `localStorage` + guardado optimista + reconciliación (T5) |

---

## ⏸️ Estado: esperando tu aprobación

**Entregables de la Fase 1:** `planificacion.md` (este archivo) y `.env.example`.

**Tres decisiones tuyas antes de la Tanda 0:**

1. **ADR-02 — Tailwind.** ¿Astro 7 + Tailwind 4 + `@tailwindcss/vite` (recomendado),
   o el stack legacy Astro 5 + Tailwind 3 + `@astrojs/tailwind` tal como pedía la spec?
2. **§5.1 — Coaches.** ¿Te convencen los 4 arquetipos, sus nombres y su tono?
3. **§1.2 — i18n.** Confirmado que las instrucciones ya vienen en español, ¿te vale la
   estrategia de diccionario (§3) o prefieres otro enfoque?

Dame el visto bueno y arranco con la **Tanda 0**.

claude --resume 328b5b8b-285b-49e4-938e-dd030580c276