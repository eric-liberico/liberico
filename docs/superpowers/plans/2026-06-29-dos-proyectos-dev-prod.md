# Separación en dos proyectos Supabase (dev / prod) — Plan de implementación (v2)

> **Para ejecutores:** plan **operado por humano** (mayoría de pasos son dashboard de Supabase/Stripe/Google/Cloudflare y requieren valores de secrets que solo tiene el dueño). Los pasos `[CLI]` los puede ejecutar un agente con `DEV_REF` + valores. Checkbox (`- [ ]`) para seguimiento.
>
> **v2 (2026-06-29):** incorpora la revisión cruzada (Claude + ChatGPT + Codex). Cambios clave vs v1: **Fase 0 nueva** (reconciliar 3 migraciones fantasma de prod), `verify_jwt` de `stripe-webhook` en `config.toml`, `db push` con `--db-url`/`--linked` (no `--project-ref`), `VITE_ENABLE_TEST_CREDITS`, mecanismo de Cloudflare preciso, eliminado el smoke test que escribía en prod, refaseo dev-setup vs prod-promotion.

**Goal:** Aislar desarrollo/preview de producción creando un segundo proyecto Supabase (`dev`), dejando el actual como `prod`, sin tocar (escribir) prod durante el montaje.

**Architecture:** El proyecto actual `tlspxuwiakcrhshwvjeo` se queda como **prod**. Se crea un **dev** vacío, sembrado desde las migraciones del repo (`db push --linked`). Local + previews de Cloudflare → dev; worker de producción → prod. La palanca dev/prod del frontend son las **`VITE_*` en build-time** (local `.env`; builds desplegados = variables de **build** de Cloudflare por trigger).

**Tech Stack:** Supabase CLI, Management API (curl), Cloudflare Workers (wrangler + `@cloudflare/vite-plugin` vía `@lovable.dev/vite-tanstack-config` + TanStack Start), Vite, Stripe, Google OAuth, Deno Edge Functions.

## Global Constraints

- **Prod no se ESCRIBE durante el montaje.** Todo se construye en dev. Las únicas operaciones sobre prod son **read-only** (consultar esquema/estado) hasta la promoción real (Fase E, fuera de este montaje).
- **Project refs:** prod = `tlspxuwiakcrhshwvjeo`. dev = `<DEV_REF>` (sustituir en todos los comandos).
- **Token CLI/API:** memoria `supabase-cli-token`. Nunca commitear. Usar como `SUPABASE_ACCESS_TOKEN=...`.
- **`VITE_*` es build-time.** `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`/`VITE_ENABLE_TEST_CREDITS` se hornean al construir. Cambiar una var runtime del worker NO cambia a qué Supabase apunta el cliente hidratado.
- **Migraciones — `db push` (verificado en CLI 2.95.4):** acepta `--linked` (default), `--db-url`, `--local`. **NO existe `--project-ref` en `db push`** (sí en `functions deploy`/`secrets`/`link`). En **dev** (vacío) `db push --linked` funciona. En **prod** `db push` se niega por **divergencia: prod tiene 86 migraciones, el repo 83**; las 3 ausentes en el repo son `20260615120000_llm_precios_coste_fijo`, `20260615130000_rename_edge_functions_spanish_b`, `20260615140000_rename_edge_functions_literatura`. **No** ejecutar `migration repair` ni `db pull`.
- **Secrets:** valores actuales de prod **no se pueden leer** (`secrets list` solo da nombres + digest). Recopilar de la fuente. **A replicar manualmente: 26** (29 nombres `Deno.env.get` distintos − 3 `SUPABASE_*` auto-inyectados; verificado con grep 2026-06-29).
- **Stripe en dev = modo TEST** (`sk_test_…` + webhook de test). Dev nunca mueve dinero real.
- **Privacidad:** dev arranca vacío. Nunca copiar datos reales de estudiantes.
- **Frontend a prod:** push a `main` bloqueado por política → PR. Otras ramas = preview en Cloudflare. Remoto `origin = git@github-empresa:eric-liberico/liberico.git`.

## Variables por tipo (no confundir edge secrets con build/runtime vars)

- **Edge secrets (26, en Supabase, `supabase secrets set`):** `ANTHROPIC_API_KEY`, `ANTHROPIC_ANALYSIS_MODEL`, `ANTHROPIC_EVALUATION_MODEL`, `ANTHROPIC_QUESTIONS_MODEL`, `OPENAI_API_KEY`, `OPENAI_TRANSCRIPTION_MODEL`, `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE`, `STRIPE_SECRET_KEY` (test), `STRIPE_WEBHOOK_SECRET` (test), `APP_URL`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_IMPERSONATED_SUBJECT`, `LIBERICO_CALENDAR_ID`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`, `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `MODAL_CONTROL_TOKEN`, `MODAL_DISPATCH_URL`, `ENABLE_TEST_CREDITS` (=`true` en dev), `ORAL_B_CONVERSATION_ENABLED`, `ORAL_B_LIMITE_DIARIO`, `ORAL_SIM_LIMITE_DIARIO`, `AVATAR_MAX_PARALLEL`.
- **Auto-inyectados por Supabase (NO poner):** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`.
- **Frontend build-time (`VITE_*`, en `.env` local y build vars de Cloudflare):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_ENABLE_TEST_CREDITS` (=`true` en dev/preview; ausente/`false` en prod — [comprar-creditos.tsx:171](../../../src/routes/comprar-creditos.tsx#L171)).
- **Runtime del worker (vars/secrets de Cloudflare, NO build):** `LIBERICO_COMING_SOON`, `LIBERICO_PREVIEW_KEY` (las consume [src/server.ts](../../../src/server.ts)).

---

## FASE 0 — Reconciliar las migraciones fantasma (resuelve A2 + colapsa la divergencia)

**Files:** Create `supabase/migrations/20260615120000_llm_precios_coste_fijo.sql`, `..._130000_rename_edge_functions_spanish_b.sql`, `..._140000_rename_edge_functions_literatura.sql`.

**Por qué primero:** dev se siembra desde el repo. Si el repo no tiene estas 3, dev ≠ prod. Backportearlas también hace repo == prod (86==86), eliminando la causa de que `db push` se niegue.

- [ ] **Step 1 [CLI]: Extraer el SQL real de las 3 desde prod (read-only):**

```bash
for V in 20260615120000 20260615130000 20260615140000; do
  curl -s -A "liberico-cli" -X POST "https://api.supabase.com/v1/projects/tlspxuwiakcrhshwvjeo/database/query" \
    -H "Authorization: Bearer <token sbp_>" -H "Content-Type: application/json" \
    --data "{\"query\":\"select array_to_string(statements, ';\\n') as sql from supabase_migrations.schema_migrations where version='$V';\"}" \
    > "/tmp/ghost_$V.json"; done
```

> **Guard (finding):** confirmar que `statements` NO está vacío antes de fiarte de la extracción (si una migración se registró con un `insert into schema_migrations(version,name)` manual, `statements` podría ser `NULL`). Verificado 2026-06-29: las 3 tienen `array_length(statements,1)` = **5 / 11 / 20** respectivamente, así que la extracción es fiable. Si en el futuro saliera `0`/`NULL`, reconstruir el SQL a mano y **contrastarlo con el efecto real en prod** (p. ej. `\d llm_precios`, datos de `llm_precios`/`llm_uso`) antes de crear el fichero.

- [ ] **Step 2 [CODE]: Crear los 3 ficheros** en `supabase/migrations/` con ese SQL. **Fidelidad antes que elegancia:**
  - El nombre debe ser **exactamente** `<version>_<name>.sql` con los names reales: `llm_precios_coste_fijo`, `rename_edge_functions_spanish_b`, `rename_edge_functions_literatura` (preservar `version`/`name` tal cual están en prod).
  - El `.sql` debe **representar lo aplicado en prod**, no una versión "mejorada". Si hace falta idempotencia, usar **envoltorios conservadores** (`ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `WHERE NOT EXISTS`) que NO cambien la semántica. Prohibido renombrar, reordenar o "limpiar" el SQL real.

- [ ] **Step 3 [CODE]: Verificar que no rompen el orden** y commitear:

```bash
ls supabase/migrations/ | grep 20260615
git add supabase/migrations/2026061512*.sql supabase/migrations/2026061513*.sql supabase/migrations/2026061514*.sql
git commit -m "chore(migrations): backport de 3 migraciones aplicadas en prod ausentes del repo (reconcilia historial)"
```

**Verificación (set exacto, no solo conteo):** el criterio es que el conjunto de versiones del repo iguale al de prod **en ambos sentidos**, no `wc -l`. Comparar:

```bash
# versiones del repo
ls supabase/migrations/*.sql | sed -E 's#.*/([0-9]+)_.*#\1#' | sort -u > /tmp/repo_v.txt
# versiones en prod (read-only)
curl -s -A "liberico-cli" -X POST "https://api.supabase.com/v1/projects/tlspxuwiakcrhshwvjeo/database/query" \
  -H "Authorization: Bearer <token sbp_>" -H "Content-Type: application/json" \
  --data '{"query":"select version from supabase_migrations.schema_migrations order by version;"}' \
  | grep -oE '[0-9]{14}' | sort -u > /tmp/prod_v.txt
echo "EN PROD y NO en repo:"; comm -13 /tmp/repo_v.txt /tmp/prod_v.txt
echo "EN repo y NO en prod:"; comm -23 /tmp/repo_v.txt /tmp/prod_v.txt
```
Expected: **ambos `comm` vacíos** (set idéntico). Las 3 versiones reconciliadas ya están aplicadas en prod, así que NO se re-aplican.

---

## FASE A — Crear y sembrar dev (sin escribir en prod)

### Task A1: Inventario y valores de secrets

- [ ] **Step 1 [CLI]: Listar nombres en prod** (sin valores): `supabase secrets list --project-ref tlspxuwiakcrhshwvjeo`.
- [ ] **Step 2 [MANUAL]: Recopilar los 26 valores** de su fuente (Stripe `sk_test_…` del modo test; resto del gestor de contraseñas/paneles).

### Task A2: Crear proyecto dev (dashboard)

- [ ] **Step 1 [MANUAL]:** New project `liberico-dev`, misma org, misma región, plan Free. Guardar **DB password** y la **connection string** (Settings → Database → Connection string, modo "URI") como `SUPABASE_DB_URL_DEV`.
- [ ] **Step 2 [MANUAL]:** Anotar `DEV_REF`, `https://<DEV_REF>.supabase.co`, **anon key**.
- [ ] **Verificación:** `curl -s "https://<DEV_REF>.supabase.co/auth/v1/health" -H "apikey: <DEV_ANON_KEY>"` → `"GoTrue is healthy"`.

### Task A3: Sembrar esquema en dev (con las 86 migraciones)

- [ ] **Step 1 [CLI]:** `SUPABASE_ACCESS_TOKEN="<token>" supabase link --project-ref <DEV_REF>` (pide DB password).
- [ ] **Step 2 [CLI]:** `SUPABASE_ACCESS_TOKEN="<token>" supabase db push --linked`. Expected: aplica las **86** migraciones (incluidas las 3 de Fase 0).
- [ ] **Verificación [CLI]:** consultar `count(*)` de `information_schema.tables` (>0), `courses` (3 cursos, spanish-b activo), y que `llm_precios.coste_fijo_usd` existe (prueba de que la Fase 0 entró).

### Task A4: `config.toml` — verify_jwt de webhooks, y desplegar funciones

**Files:** Modify `supabase/config.toml`.

- [ ] **Step 1 [CODE]: Declarar el webhook como público** (Supabase verifica JWT por defecto; sin esto el código de [stripe-webhook](../../../supabase/functions/stripe-webhook/index.ts) ni se ejecuta). Añadir a `supabase/config.toml`:

```toml
[functions.stripe-webhook]
verify_jwt = false
```

- [ ] **Step 2 [CLI]: Auditar si hay otras funciones públicas** antes de fijar nada más (no asumir):

```bash
for d in supabase/functions/*/; do n=$(basename "$d"); [ "$n" = "_shared" ] && continue; rg -q "getUser\(" "$d/index.ts" 2>/dev/null || echo "revisar: $n"; done
```
Para cada "revisar", confirmar si autentica de otra forma (HMAC, etc.) o si debe ser `verify_jwt=false`. (`add-test-credits` y `create-checkout-session` SÍ autentican vía `getUser` → quedan con default `true`.)

- [ ] **Step 3 [CODE]: Commit** de `config.toml`.
- [ ] **Step 4 [CLI]: Desplegar todas a dev:** `supabase functions deploy --project-ref <DEV_REF>`.
- [ ] **Verificación:** en dashboard dev, `stripe-webhook` = "No JWT verification". `curl -s -o /dev/null -w "%{http_code}" .../functions/v1/stripe-webhook` → no 401 por JWT.

### Task A5: Secrets en dev

- [ ] **Step 1 [CLI]:** `supabase secrets set --project-ref <DEV_REF> <los 26 = valores>` (`ENABLE_TEST_CREDITS=true`, `STRIPE_SECRET_KEY=sk_test_…`). Calendar reutilizable con calendario de test o posponer (best-effort, no rompe reservas).
- [ ] **Verificación:** `supabase secrets list --project-ref <DEV_REF>` muestra los 26 nombres.

---

## FASE B — Integraciones de dev en modo test

### Task B1: Google OAuth en dev
- [ ] **[MANUAL]** Google Cloud → OAuth Client → Authorized redirect URIs: añadir `https://<DEV_REF>.supabase.co/auth/v1/callback`.
- [ ] **[MANUAL]** Supabase dev → Auth → Providers → Google: mismo Client ID/Secret (memoria `reference_google_oauth`).
- [ ] **[MANUAL]** Supabase dev → Auth → URL Configuration: Site URL = frontend dev; Redirect URLs = frontend dev + `http://localhost:3000`.

### Task B2: Stripe test
- [ ] **[MANUAL]** Stripe → Test mode → Webhooks → Add endpoint: `https://<DEV_REF>.supabase.co/functions/v1/stripe-webhook`, mismos eventos que el endpoint live (incl. `checkout.session.completed`).
- [ ] **[MANUAL]** Copiar el `whsec_…` de test → **[CLI]** `supabase secrets set --project-ref <DEV_REF> STRIPE_WEBHOOK_SECRET="whsec_..."`.
- [ ] **Verificación (dos pruebas separadas):**
  - **(a) Firma aceptada:** Stripe → "Send test webhook" (`checkout.session.completed`) → en logs de `stripe-webhook` (dev) la **firma valida** (no rechazo por JWT ni HMAC). OJO: el evento genérico puede no traer `client_reference_id`/`metadata`, así que la función puede devolver **400 por payload** aunque la firma sea correcta — eso NO es fallo de webhook.
  - **(b) Crédito real:** flujo completo desde la app dev (Checkout en modo test con tarjeta `4242…`) → el webhook acredita créditos en `perfiles`/`creditos_compras`. Esta es la prueba E2E real.

### Task B3: Admin de prueba en dev
- [ ] **[MANUAL]** Registrarte / crear usuario en dev; anotar `user_id`.
- [ ] **[CLI]** `update perfiles set rol='admin', activo=true where user_id='<USER_ID>'` vía Management API a `<DEV_REF>`.
- [ ] **Verificación:** login en dev → `/admin` y `/profesor-sesiones` cargan.

---

## FASE C — Frontend a dev (local + preview)

### Task C1: Local → dev
**Files:** Modify `.env` (gitignored, solo local).
- [ ] **[MANUAL]** Editar `.env`:
```
VITE_SUPABASE_URL=https://<DEV_REF>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<DEV_ANON_KEY>
VITE_ENABLE_TEST_CREDITS=true
```
- [ ] **Verificación:** `npm run dev` → Network apunta a `<DEV_REF>`; el botón "+20 créditos" aparece (gracias a `VITE_ENABLE_TEST_CREDITS`).
- [ ] **Rollback:** restaurar `.env` con los valores de prod revierte al instante.

### Task C2: Cloudflare — dos entornos build-time (la pieza crítica)
> **Dos palancas distintas, no confundir:** (a) **runtime** del worker (`LIBERICO_COMING_SOON`/`LIBERICO_PREVIEW_KEY`) → vía `vars`/secrets del worker o `[env.<name>]`/`CLOUDFLARE_ENV`. (b) **build-time** `VITE_*` (incl. la URL de Supabase y `VITE_ENABLE_TEST_CREDITS`) → vía **variables de BUILD de Cloudflare con scope por trigger**, NO `CLOUDFLARE_ENV`.

- [ ] **Step 1 [MANUAL]: Identificar el deploy actual** (git-integrado Workers Builds vs `wrangler deploy` manual): Cloudflare → `liberico` → Settings → Build.
- [ ] **Step 2 [MANUAL]: Elegir UNA opción determinista:**
  - **(Recomendado por simplicidad) Dos workers:** `liberico` (prod, sin cambios) y `liberico-dev` (`[env.dev] name="liberico-dev"` en `wrangler.jsonc`), cada uno construido con su `.env`/build vars. Deploy: `npm run build && wrangler deploy` (prod) / `wrangler deploy --env dev` (dev).
  - **Un worker + Workers Builds:** **build variables por trigger** — Production (rama `main`): `VITE_SUPABASE_URL`=prod, `VITE_SUPABASE_PUBLISHABLE_KEY`=prod, **sin** `VITE_ENABLE_TEST_CREDITS`. Preview (demás ramas): los de **dev** + `VITE_ENABLE_TEST_CREDITS=true`.
- [ ] **Step 3 [MANUAL]: Runtime del muro por entorno:** `LIBERICO_COMING_SOON`/`LIBERICO_PREVIEW_KEY` como vars/secrets del worker (dev preview puede ir con `LIBERICO_COMING_SOON=false`).
- [ ] **Verificación (determinista — HTML *y* JS servido):**
```bash
curl -s "https://<preview-dev-url>/" | grep -oE "https://[a-z0-9]+\.supabase\.co" | sort -u   # → <DEV_REF>
# y el bundle JS hidratado (la URL también va ahí):
JS=$(curl -s "https://<preview-dev-url>/" | grep -oE '/assets/[^"]+\.js' | head -1)
curl -s "https://<preview-dev-url>$JS" | grep -oE "https://[a-z0-9]+\.supabase\.co" | sort -u   # → <DEV_REF>
```
Producción (`main`) debe dar `tlspxuwiakcrhshwvjeo` en ambos. Si el preview muestra el ref de prod → las build vars de preview no se aplicaron.

---

## FASE D — Scripts seguros + verificación read-only + docs

### Task D1: Scripts de despliegue por entorno
**Files:** Modify `package.json`.
- [ ] **[CODE]** Añadir (sustituir `<DEV_REF>`):
```jsonc
"db:push:dev": "supabase db push --db-url \"$SUPABASE_DB_URL_DEV\"",
"db:push:prod": "echo 'PROD: db push se NIEGA por divergencia. Usa Management API (docs/arquitectura.md#entornos-y-despliegue-dev--prod).' && exit 1",
"fn:deploy:dev": "supabase functions deploy --project-ref <DEV_REF>",
"fn:deploy:prod": "supabase functions deploy --project-ref tlspxuwiakcrhshwvjeo"
```
> `db:push:dev` usa `--db-url` (determinista) en vez de depender del `link` local (que vive en `supabase/.temp/`, por máquina). `fn:*:*` sí aceptan `--project-ref`.
> **Importante (doc Supabase):** `--db-url` exige la connection string **percent-encoded**. Si la DB password tiene caracteres especiales (`@ : / ? # & %`), hay que codificarlos (`@`→`%40`, etc.) o el URI se parsea mal. Guardar `SUPABASE_DB_URL_DEV` ya codificada y probar `npm run db:push:dev` con esa forma antes de fiarte.
- [ ] **[CLI] Verificación:** `npm run db:push:prod` imprime el aviso y sale con 1.
- [ ] **[CODE] Commit** de `package.json`.

### Task D2: Verificación read-only de aislamiento (NO escribir en prod)
- [ ] **[MANUAL]** Checklist:
  - [ ] `vite dev` y preview `dev` llaman a `<DEV_REF>` (HTML + JS).
  - [ ] Producción (`main`) sigue llamando a `tlspxuwiakcrhshwvjeo` (read-only: `curl | grep`).
  - [ ] Dev usa `sk_test_…` + webhook de test.
  - [ ] Dev no escribe en calendario real.
  - [ ] Sin datos reales de estudiantes en dev.
- [ ] **NOTA:** no se hace ningún smoke test que ESCRIBA en prod (eliminado de v1).

### Task D3: Documentación y memoria
**Files:** Modify `docs/arquitectura.md` (sección "Estado actual" → dos proyectos).
- [ ] **[CODE]** Actualizar `docs/arquitectura.md` (de "un solo proyecto" a "prod `tlspxuwiakcrhshwvjeo` + dev `<DEV_REF>`") y la memoria `project_entornos_dev_prod` con el `DEV_REF`. Commit.

---

## FASE E — (SEPARADA, posterior al montaje) Primera promoción real a prod

> Fuera del montaje inicial. Se ejecuta cuando haya una migración **necesaria y revisada**, no como prueba.

- [ ] **Pre-flight A1 (audit de drift):** antes de cualquier `fn:deploy:prod` masivo, comparar el `verify_jwt` real de cada función en el dashboard de prod vs `config.toml`. Si prod tiene funciones desplegadas a mano con ajustes que `config.toml` no refleja, redeplegar desde `config.toml` podría voltearlas. Reconciliar `config.toml` con la realidad de prod primero.
- [ ] **Migración:** aplicar a dev (`npm run db:push:dev`) → validar → aplicar a prod vía Management API. Tras Fase 0 el historial de versiones queda reconciliado (set repo == prod), pero `db:push:prod` **sigue bloqueado por política operacional** (no por divergencia): reevaluar un `db push` directo a prod solo tras una prueba explícita en un proyecto desechable y aprobación del dueño.
- [ ] **Funciones:** `npm run fn:deploy:prod` (o por nombre).
- [ ] **Frontend:** PR `feat/...` → `main` → Cloudflare construye prod con sus build vars.

---

## Self-Review (cobertura)

- **A2 fantasmas** → Fase 0 (con SQL real extraído). **Crear dev** → A2. **Esquema** → A3. **verify_jwt + funciones** → A4 (+ audit A1 en Fase E). **Secrets (26)** → A1/A5. **Auth/Stripe test/admin** → B1–B3. **Local+`VITE_ENABLE_TEST_CREDITS`** → C1. **Cloudflare build-time** → C2 (palancas separadas + verificación HTML *y* JS). **Scripts (`db:push` con `--db-url`)** → D1. **Aislamiento read-only (sin escribir prod)** → D2. **Docs** → D3. **Promoción a prod separada** → Fase E.
- **F1** corregido (Task D1 y Global Constraints). **F2** corregido (D2, sin smoke-write). **F3** (A4). **F4** (C1+Variables). **F5** (C2, palanca correcta). **F6** (26 + bloque de variables por tipo). **F7** (refaseo A–E). **A1** (Fase E pre-flight). **A3** (C2 verifica JS). **A4** (buckets versionados → solo checklist).

## Puntos para verificar con fuentes oficiales

1. Workers Builds: ¿soporta build variables por trigger production/preview en tu plan? (si no → dos workers).
2. Eventos exactos del webhook de Stripe a replicar en test.
3. Claves IA compartidas vs separadas en dev (coste mezclado en facturación; `llm_uso` sí es por proyecto).
4. Free tier de Supabase: pausa por inactividad y límites suficientes para dev.
