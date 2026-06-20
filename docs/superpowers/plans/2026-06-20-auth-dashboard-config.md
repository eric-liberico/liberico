# Configuración dashboard — Google OAuth + email passwordless

Fecha: 2026-06-20

## Google OAuth

El error:

```json
{
  "code": 400,
  "error_code": "validation_failed",
  "msg": "Unsupported provider: provider is not enabled"
}
```

significa que el provider `google` no está habilitado en el proyecto Supabase remoto. No es un error
de React.

En Supabase Dashboard:

1. Authentication → Sign In / Providers → Google.
2. Activar Google.
3. Añadir Google OAuth Client ID y Client Secret.
4. En Google Cloud Console, el Authorized redirect URI debe ser:

```text
https://tlspxuwiakcrhshwvjeo.supabase.co/auth/v1/callback
```

5. En Supabase Auth → URL Configuration → Redirect URLs, añadir:

```text
http://localhost:8080/auth/callback
http://localhost:5173/auth/callback
https://<dominio-produccion>/auth/callback
```

## Email passwordless — código OTP

`signInWithOtp` puede enviar enlace mágico o código OTP según la plantilla de email.

- Si la plantilla contiene `{{ .ConfirmationURL }}`, Supabase envía enlace mágico.
- Si la plantilla contiene `{{ .Token }}`, Supabase envía un código OTP. La longitud se configura
  en Authentication → Providers → Email → Email OTP length; Supabase admite 6-10 dígitos.

Para LIBerico queremos **código OTP**, no enlace mágico. La plantilla de Magic Link en Supabase debe
incluir `{{ .Token }}` y no debe prometer un botón/enlace de acceso. La UI exige exactamente 8
caracteres, así que Supabase debe tener Email OTP length = 8.

Supabase Dashboard → Authentication → Email Templates → Magic Link:

Subject:

```text
Tu código de acceso a LIBerico
```

Body mínimo:

```html
<h2>Tu código de acceso</h2>
<p>Introduce este código en LIBerico:</p>
<p style="font-size: 24px; font-weight: 700;">{{ .Token }}</p>
```

No usar `{{ .ConfirmationURL }}` si la pantalla pide código.
