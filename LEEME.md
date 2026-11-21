# Salchipaseo · cómo ponerla en marcha

Esta carpeta es la app lista para subir a internet. Solo hay que hacer 3 cosas: preparar Supabase, activar el login con Google y publicar la carpeta. Toma unos 20 minutos.

```
salchipaseo/
├── index.html            ← la app
├── config.js             ← AQUÍ pegas los datos de Supabase (único archivo que editas)
├── app.js, styles.css
├── assets/               ← GIFs de Goku
├── icons/, manifest.webmanifest   ← para instalarla en el teléfono
├── vendor/               ← Leaflet (mapas) y supabase-js
└── supabase/schema.sql   ← tablas y permisos de la base de datos
```

---

## 1. Crear el proyecto en Supabase

1. Entra a <https://supabase.com>, crea una cuenta y luego **New project** (elige la región más cercana, por ejemplo São Paulo).
2. Cuando termine de crearse, ve a **SQL Editor → New query**, pega todo el contenido de `supabase/schema.sql` y presiona **Run**.
   Esto crea las tablas `dogs` (perros), `routes` (rutas) y `walks` (paseos), con seguridad por usuario: cada persona solo ve sus propios datos.
3. Ve a **Project Settings → API Keys** y copia:
   - la **Project URL** (algo como `https://abcdxyz.supabase.co`, también aparece en **Data API**)
   - la **Publishable key** (empieza con `sb_publishable_…`). Si tu proyecto es antiguo y solo ves la *anon key*, sirve igual.
4. Abre `config.js` y pega ambos valores:

```js
window.SALCHIPASEO_CONFIG = {
  SUPABASE_URL: 'https://abcdxyz.supabase.co',
  SUPABASE_KEY: 'sb_publishable_xxxxxxxx'
};
```

> La publishable key es pública por diseño, está bien que vaya en el archivo. **Nunca** pongas la *secret key* ni la *service_role key*.

---

## 2. Activar "Continuar con Google"

### 2a. En Google Cloud
1. Entra a <https://console.cloud.google.com>, crea un proyecto (ej: "Salchipaseo").
2. Ve a **Google Auth Platform** (o **APIs y servicios → Pantalla de consentimiento de OAuth**) y configura:
   - Nombre de la app: *Salchipaseo*, tu correo de soporte.
   - Público: **Externo**.
   - Mientras esté en modo **Prueba**, solo pueden entrar los correos que agregues como *usuarios de prueba*. Cuando quieras abrirla a todos, presiona **Publicar app**.
3. Ve a **Clientes → Crear cliente** (o **Credenciales → Crear credenciales → ID de cliente de OAuth**):
   - Tipo: **Aplicación web**.
   - **Orígenes de JavaScript autorizados**: la dirección donde publicarás la app, ej. `https://salchipaseo.netlify.app`.
   - **URI de redirección autorizados**: `https://abcdxyz.supabase.co/auth/v1/callback` (tu Project URL + `/auth/v1/callback`; también la ves en Supabase al activar Google).
4. Copia el **Client ID** y el **Client secret**.

### 2b. En Supabase
1. **Authentication → Sign In / Providers → Google**: actívalo y pega el Client ID y el Client secret. Guarda.
2. **Authentication → URL Configuration**:
   - **Site URL**: la dirección de tu app, ej. `https://salchipaseo.netlify.app`
   - **Redirect URLs**: agrega la misma dirección (`https://salchipaseo.netlify.app/**`). Si vas a probar en tu computador, agrega también `http://localhost:8000/**`.

---

## 3. Publicar la app

El login con Google necesita que la app esté en una dirección web real (`https://…`); abriendo el archivo con doble clic no funciona.

**Opción más fácil · Netlify Drop**
1. Entra a <https://app.netlify.com/drop>.
2. Arrastra la carpeta `salchipaseo` completa.
3. Netlify te da una dirección (ej. `https://nombre-raro-123.netlify.app`; puedes cambiarla en *Site configuration*).
4. Vuelve a los pasos 2a.3 y 2b.2 y usa esa dirección exacta.

**Otras opciones:** Vercel (arrastrar carpeta), GitHub Pages o Cloudflare Pages. Cualquier hosting de archivos estáticos sirve.

**Probar en tu computador antes de publicar:** dentro de la carpeta ejecuta `python3 -m http.server 8000` y abre `http://localhost:8000` (recuerda agregar esa dirección en Google y en Supabase).

---

## 4. En el teléfono

- Abre la dirección de la app y toca **Continuar con Google**.
- La primera vez te pedirá crear el perfil de tu perro.
- Para tenerla como app: **iPhone** → Safari → Compartir → *Agregar a inicio*. **Android** → Chrome → ⋮ → *Instalar app*.
- Durante el paseo deja la pantalla encendida (la app lo pide automáticamente cuando el navegador lo permite). Si el teléfono se bloquea, el navegador pausa el GPS.
- Si se cae internet a mitad de paseo no pasa nada: el paseo queda guardado en el teléfono y se sube solo cuando vuelve la conexión.

---

## Problemas comunes

| Qué ves | Qué revisar |
|---|---|
| Aviso "Falta conectar Supabase" en el login | `config.js` todavía tiene los valores de ejemplo. |
| Google dice `redirect_uri_mismatch` | En Google Cloud, el URI de redirección debe ser exactamente `https://TU-PROYECTO.supabase.co/auth/v1/callback`. |
| Google dice "acceso bloqueado" / app no verificada | La app está en modo Prueba: agrega tu correo como usuario de prueba o publícala. |
| Vuelves a la app pero sigues sin sesión | Agrega la dirección de tu app en Supabase → URL Configuration → Redirect URLs. |
| "Unsupported provider" | El proveedor Google no está activado en Supabase. |
| No cargan los datos / error al guardar | Vuelve a ejecutar `supabase/schema.sql` (crea tablas y permisos). |
| El mapa se ve como cuadrícula verde sin calles | No hay internet o se bloquearon los mapas; el recorrido igual se registra. |
