# Guau Guau (antes Salchipaseo)

App para registrar los paseos de tu perro: rutas por GPS, metas, niveles, logros, consejos según la raza (salchicha, pug, golden) y familias que comparten un perro.

- **Web:** https://vicevll.github.io/salchipaseo/ (esta carpeta, publicada con GitHub Pages)
- **Apps de iPhone y Android:** repo `salchipaseo-ios` (Capacitor). Cargan esta misma web, así que los cambios aquí llegan solos a las apps.
- **Base de datos:** Supabase. `schema.sql` tiene todas las tablas, permisos y funciones; se puede correr completo en un proyecto nuevo.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html`, `app.js`, `styles.css` | La app |
| `app-nativa.js` | Conexión con las funciones nativas (GPS en segundo plano, avisos, botón volver de Android) |
| `config.js` | URL y clave pública de Supabase (nunca pongas aquí la secret key) |
| `privacidad.html`, `borrar-cuenta.html` | Política de privacidad y cómo eliminar la cuenta (Google Play las pide) |
| `*-sprite.webp`, `ilu-*.webp`, `fondo-*.webp`, `*-cara.webp` | Animaciones e ilustraciones de cada raza |
| `leaflet.*`, `supabase.js` | Librerías (mapas y base de datos) |

Contacto: vicentoxfm@gmail.com
