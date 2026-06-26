# Muro "Próximamente" (coming soon) con acceso por clave

**Fecha:** 2026-06-26
**Estado:** aprobado, pendiente de implementar
**Alcance:** poner LIBerico fuera de "live" mostrando una página de *Próximamente* a todo el público, manteniendo un acceso privado por clave para seguir usando la app real.

## Objetivo

LIBerico ya está desplegado en Cloudflare Workers (worker `liberico`, TanStack Start). Se quiere que:

- Cualquier visitante vea una página de **"Próximamente"** en **todas** las rutas.
- El dueño (y quien tenga la clave) pueda **saltarse el muro** con un enlace secreto y usar la app real con normalidad.
- **Lanzar de verdad** más adelante sea trivial (cambiar una variable y redeploy), sin reescribir código.

No incluye captación de emails ni backend nuevo. Página autocontenida.

## Contexto técnico relevante

- Deploy: Cloudflare Workers. `wrangler.jsonc` → `main: "@tanstack/react-start/server-entry"`.
- El `wrangler.json` generado en build tiene `"assets": { "directory": "../client" }`: Cloudflare sirve los assets estáticos **directamente** (sin pasar por el worker); las rutas HTML (SSR) sí las maneja el worker.
- TanStack Start (`@tanstack/react-start` 1.168.6) **auto-detecta** un archivo `src/server.ts` como *server entry* (visto en `@tanstack/start-plugin-core` `planning.ts`: `defaultEntry: 'server'`). El entry por defecto hace `createStartHandler(defaultStreamHandler)`.
- Acceso a secrets/bindings en el worker: `import { env } from "cloudflare:workers"` (soportado por `@cloudflare/vite-plugin` 1.25.5), leído **dentro** del handler.
- Paleta de marca ("Claro premium", `src/lib/landing-theme.ts` → `LANDING`): fondo `#F6F5F2`, tinta `#0F172A`, muted `#5A6B86`, línea `#E6E3DC`, ámbar de marca `#E8A13A`. Wordmark: `L` + `IB` (en ámbar) + `erico`. Fuentes: Fraunces / Libre Baskerville / IBM Plex Sans (Google Fonts).

## Enfoque elegido

**Muro en el *server entry* del worker** (`src/server.ts`). Envuelve el handler estándar de TanStack Start; intercepta toda request SSR antes de ejecutar nada de la app.

Descartados:
- **Muro en `__root.tsx` (`beforeLoad`)**: corre dentro del ciclo de React/router, la app se hidrata igual, más superficie de fuga.
- **Worker independiente + proxy con service binding**: aislamiento total pero dos workers y más complejidad de deploy. Sobreingeniería.

## Diseño

### Archivo nuevo: `src/server.ts`

Replica el entry por defecto y lo envuelve:

```
const startFetch = createStartHandler(defaultStreamHandler)
export default { async fetch(request, ...rest) { ...gate...; return startFetch(request, ...rest) } }
```

### Configuración (env de Cloudflare)

- `LIBERICO_COMING_SOON`: interruptor. Muro activo salvo que valga exactamente `"false"`.
- `LIBERICO_PREVIEW_KEY`: clave de acceso (secret). Si está vacía/ausente, el muro funciona pero **no** hay forma de entrar por `?key=` (failsafe: no abrir por error).

Se leen con `import { env } from "cloudflare:workers"` dentro del handler, con captura de error → defaults seguros (muro activo).

### Lógica por request

1. Si `LIBERICO_COMING_SOON === "false"` → `startFetch` (app normal). [interruptor de lanzamiento]
2. `?key=salir` → borra cookie (`Max-Age=0`) y 302 a la ruta limpia.
3. `?key=<valor>`:
   - si coincide con `LIBERICO_PREVIEW_KEY` (y la clave no está vacía) → fija cookie y 302 a la ruta limpia (sin el query).
   - si no coincide → página "Próximamente".
4. Cookie `liberico_preview` válida (igual a la clave) → `startFetch` (app real).
5. En cualquier otro caso → página **"Próximamente"**.

### Cookie

`liberico_preview=<clave>; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`
(30 días). La comparación clave↔cookie usa comparación de tiempo constante para no filtrar por *timing*.

### Respuesta "Próximamente"

- `200 OK`, `Content-Type: text/html; charset=utf-8`.
- `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store`.
- HTML **autocontenido** (CSS inline; fuentes vía Google Fonts CDN, con fallback de sistema). No depende de assets del build.
- Bilingüe por `Accept-Language`: `es*` → ES, resto → EN.
- Contenido: wordmark **LIBerico** (IB en ámbar), titular y subtítulo. **Sin email.**
  - ES: titular "Estamos afinando los últimos detalles." · sub "Volvemos muy pronto."
  - EN: heading "We're putting the finishing touches in place." · sub "Back very soon."

### Failsafe / errores

- Si leer env lanza o el handler del muro falla → se asume **muro activo** (nunca abrir la app por error).
- Si `LIBERICO_PREVIEW_KEY` está vacío → no se acepta ningún `?key=` ni cookie (no se puede abrir hasta configurar el secret).

## Archivos

- **Nuevo:** `src/server.ts` — server entry con muro + página inline.
- **Local (no commit):** `.dev.vars` (ya en `.gitignore`) con `LIBERICO_COMING_SOON` y `LIBERICO_PREVIEW_KEY` para `vite dev`.
- Posible: declaración de tipos para `cloudflare:workers` si TS no la resuelve (o acceso tipado con `as`).

No se toca `wrangler.jsonc` ni `@lovable.dev/vite-tanstack-config`.

## Operación

- **Fijar la clave (una vez):** `npx wrangler secret put LIBERICO_PREVIEW_KEY`
- **Deploy:** `npm run build && npx wrangler deploy`
- **Entrar a la app real:** visitar `https://<dominio>/?key=<CLAVE>` una vez (cookie 30 días). Salir: `?key=salir`.
- **Lanzar de verdad:** fijar var `LIBERICO_COMING_SOON=false` (o borrar `src/server.ts`) y redeploy.

## Verificación

- `npx tsc --noEmit`, `npm run lint`, `npm run build` en verde.
- Manual (local con `.dev.vars`):
  - sin clave → "Próximamente" en `/`, `/login`, `/prueba-1`.
  - `?key=<correcta>` → cookie + redirect + app real navegable.
  - `?key=incorrecta` → "Próximamente".
  - `LIBERICO_COMING_SOON=false` → app normal sin clave.

## Notas / límites asumidos

- Los chunks JS/CSS en `dist/client` siguen siendo descargables (los sirve Cloudflare directo); son inertes sin el HTML del SSR. Riesgo real nulo y aceptado.
- Las Edge Functions de Supabase viven en otro dominio: no se ven afectadas por el muro.
