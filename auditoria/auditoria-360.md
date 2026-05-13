# Auditoría 360 del ecosistema TO-K

Fecha: 2026-05-13  
Tipo: revisión estática, prueba local en navegador, verificación de assets externos y auditoría de dependencias npm en `inventory-app`.

## 1. Estado general

TO-K está formado por páginas HTML estáticas con CSS y JavaScript embebido. Todas las apps beta principales comparten Firebase Realtime Database y una misma configuración pública de Firebase. La navegación se organiza alrededor de `tok-home-beta.html`, que funciona como centralita familiar, y de apps por perfil o caso de uso: ONE, KIDS, PETS y BOOKS.

El diseño está bastante avanzado para beta: las pantallas iniciales son coherentes, las apps cargan sin errores de consola relevantes en la pasada local y no se detectaron desbordes obvios en las primeras vistas revisadas. Aun así, la frontera entre interfaz, seguridad y administración está demasiado mezclada en el cliente. La aplicación confía en `fid`, `mid`, `localStorage`, cookies y PIN visual para operaciones que deberían estar protegidas por reglas de servidor.

Calificación global para producción: no listo.  
Calificación para beta privada: usable con controles manuales, pero con riesgo alto si se comparte públicamente.

## 2. Metodología

Acciones realizadas:

- Lectura de los HTML principales, service worker y app de inventario.
- Búsquedas de patrones críticos: Firebase, `innerHTML`, `localStorage`, PIN, placeholders, CSP, SRI, enlaces externos, service worker y notificaciones.
- Servidor local temporal en `http://127.0.0.1:8765` con Node para cargar las páginas como web.
- Prueba en navegador de HOME, ONE, KIDS, PETS, BOOKS y Admin con `fid=AUDIT_FID` y `mid` de prueba.
- Validación HTTP de assets y dependencias externas.
- Medición de tamaño de archivos locales y logos.
- `npm audit --omit=dev` en `inventory-app`.

Limitaciones:

- No se auditaron reglas reales de Firebase porque no hay archivo de reglas en el workspace.
- No se hicieron escrituras destructivas ni pruebas con datos reales de familias.
- No se revisó tráfico autenticado porque las apps no implementan Firebase Auth visible.

## 3. Componentes revisados

| Componente | Estado funcional | Riesgo principal |
| --- | --- | --- |
| HOME | Carga splash y flujo de configuración. Sin `fid` redirige a Linktree. Con `fid` inexistente muestra hogar sin configurar. | Bypass de activación si Firebase falla, PIN por defecto, escritura directa de hogar, datos renderizados con HTML. |
| ONE | Carga configuración con `fid/mid`; lee WiFi del hogar y perfil miembro. | Perfil modificable por URL/cliente si reglas lo permiten, PIN por defecto, render de enlaces/redes con HTML. |
| KIDS | Carga configuración con `fid/mid`; flujo SOS, ubicación y `push_pending`. | Uso de `midIndex` y alertas desde cliente, PIN por defecto, datos de emergencia en HTML. |
| PETS | Carga configuración, SOS, bitácora y salud. | Escritura directa en miembro, bitácora, salud y alertas; render de datos no escapados. |
| BOOKS | Carga dashboard de lectura y usa Google Books API. | Dependencia con cuota/rate-limit, render de resultados externos con HTML, FCM server key placeholder. |
| Admin | Carga overlay de PIN, generador de pedidos, códigos y estadísticas. | Panel sensible en cliente, PIN cliente/Firebase, datos visibles detrás del overlay, escritura de activaciones y pedidos desde navegador. |
| Service worker | Escucha `push_pending` y abre HOME al hacer clic. | Rutas hardcoded a GitHub Pages, depende de que el cliente vigile Firebase, sin control de autorización visible. |
| inventory-app | App Express/SQLite local independiente. | Sin autenticación, CORS abierto, `innerHTML` con datos de API, dependencias npm vulnerables. |

## 4. Pruebas de carga local

Resultado de la pasada en navegador:

| Página | Resultado observado |
| --- | --- |
| `tok-home-beta.html?fid=AUDIT_FID` | Carga `screen-splash`; muestra hogar sin configurar. Logo HOME visible 64x64 desde GitHub Pages. |
| `tok-one-beta.html?fid=AUDIT_FID&mid=one_1` | Entra en pantalla de configuración porque no hay perfil. Sin errores de consola. |
| `tok-kids-beta.html?fid=AUDIT_FID&mid=kids_1` | Entra en configuración. Sin errores de consola. |
| `tok-pets-beta.html?fid=AUDIT_FID&mid=pets_1` | Entra en configuración. Sin errores de consola. |
| `tok-books-beta.html?fid=AUDIT_FID&mid=books_1` | Carga dashboard principal con contadores a cero. Logos visibles 48x48 y footer 20x20. |
| `tok-admin.html` | Carga overlay de PIN, pero el contenido del panel y datos sincronizados aparecen en el DOM detrás del overlay. |

Observación importante: abrir HOME sin `fid` en contexto de navegador normal redirige a `https://linktr.ee/tallermemoriasstudio`. Esto es intencional para no-NFC, pero dificulta diagnóstico y puede confundir a usuarios que abren el enlace base.

## 5. Assets y logos

Tamaños locales en `tok/`:

| Archivo | Tamaño aproximado |
| --- | ---: |
| `tok.svg` | 1219.7 KB |
| `pets.svg` | 1042.4 KB |
| `books.svg` | 1021.3 KB |
| `home.svg` | 838.3 KB |
| `kids.svg` | 823.0 KB |
| `one.svg` | 309.6 KB |

Tamaños remotos comprobados:

| URL | Estado | Tamaño aproximado |
| --- | ---: | ---: |
| `https://tmstudio-hub.github.io/tok/tok.svg` | 200 | 897.1 KB |
| `https://tmstudio-hub.github.io/tok/home.svg` | 200 | 622.4 KB |
| `https://tmstudio-hub.github.io/tok/one.svg` | 200 | 230.1 KB |
| `https://tmstudio-hub.github.io/tok/kids.svg` | 200 | 609.8 KB |
| `https://tmstudio-hub.github.io/tok/pets.svg` | 200 | 776.5 KB |
| `https://tmstudio-hub.github.io/tok/books.svg` | 200 | 760.9 KB |

Conclusión de assets: los logos son visualmente funcionales, pero demasiado pesados para iconos de interfaz. Además, las páginas usan principalmente URLs remotas aunque existen copias locales. Esto introduce latencia, dependencia de red y riesgo de inconsistencias entre local y producción.

## 6. Enlaces y dependencias externas

Verificación HTTP:

| Recurso | Estado observado |
| --- | --- |
| `tok-instrucciones.html` en GitHub Pages | 404, referenciado por Admin para QR de instrucciones. |
| `qrcodejs` CDN | 200. |
| Firebase SDK 10.12.0 | 200. |
| Google Books API | 429 en prueba puntual, dependiente de cuota/rate-limit. |
| Linktree | 200. |
| `tallerdememorias.es` | 200. |

No se encontraron `Content-Security-Policy` ni atributos `integrity` para scripts CDN. Hay al menos enlaces `target="_blank"` sin `rel="noopener"` en HOME y ONE.

## 7. Riesgos principales

1. Autorización ausente o no demostrada en cliente: las rutas Firebase dependen de `fid` y `mid` controlables desde URL/localStorage.
2. Admin público en HTML: genera códigos, guarda pedidos, lee/escribe PIN y sincroniza datos desde el navegador.
3. Activación insegura: HOME permite continuar si falla Firebase durante validación del código.
4. PIN por defecto: varias apps usan `1234`; Admin usa fallback `2810`.
5. XSS: muchos datos de usuario, libros, alertas, pedidos, bitácora y enlaces se interpolan con `innerHTML`.
6. Push incompleto/inseguro: VAPID y FCM server key son placeholders; server key en cliente sería un riesgo si se rellena.
7. Dependencias externas sin hardening: no hay CSP/SRI, y varias funciones críticas dependen de CDNs o APIs remotas.
8. Assets pesados: logos de cientos de KB a más de 1 MB para tamaños visibles de 20 a 64 px.
9. App de inventario sin autenticación ni hardening, con dependencias vulnerables.

## 8. Conclusión

El producto tiene una base de experiencia de usuario interesante y coherente, pero la seguridad necesita una capa de backend/reglas antes de producción. La prioridad no es añadir más pantallas, sino cerrar permisos, sanitizar renderizados, separar administración del cliente público y estabilizar assets/dependencias. Una vez resuelto eso, el ecosistema puede pasar de beta artesanal a versión publicable con mucha más confianza.
