# Plan de remediación

Objetivo: convertir el ecosistema TO-K de beta funcional a versión publicable, reduciendo riesgo de acceso indebido, XSS, errores de activación, dependencias frágiles y problemas de rendimiento visual.

## Fase 0. Preparación y contención

Duración estimada: 0.5-1 día  
Prioridad: inmediata

Acciones:

1. Congelar publicación pública de Admin hasta asegurar autenticación real.
2. Exportar reglas actuales de Firebase y hacer copia de seguridad de Realtime Database.
3. Revisar qué URLs están publicadas en QR físicos ya generados.
4. Identificar si `inventory-app` forma parte del producto o es herramienta local separada.

Criterios de aceptación:

- Hay copia de seguridad de datos.
- Admin no se comparte públicamente o queda protegido fuera del hosting público.
- Se conoce el estado real de reglas Firebase antes de tocar producción.

## Fase 1. Seguridad crítica

Duración estimada: 2-4 días  
Prioridad: crítica

Acciones:

1. Reglas Firebase `deny by default`.
2. Implementar autenticación real con Firebase Auth, tokens custom o backend propio.
3. Mover a backend/Cloud Functions:
   - Validación de códigos de activación.
   - Creación de familias.
   - Escritura de `midIndex`.
   - Generación de códigos Admin.
   - Escritura/lectura de pedidos Admin.
   - Envío de notificaciones FCM.
4. Eliminar el fallback de activación `BETA` cuando Firebase falla.
5. Eliminar PIN por defecto `1234` y fallback Admin `2810`.
6. Bloquear PIN débiles y añadir límite de intentos.

Criterios de aceptación:

- Un usuario sin sesión no puede leer ni escribir `familias`, `admin`, `activaciones`, `midIndex` ni `push_pending`.
- Un usuario autenticado solo puede acceder a su familia y miembros permitidos.
- Activar un código requiere validación server-side y no continúa si Firebase/backend falla.
- Admin no carga ni sincroniza datos hasta que el rol esté validado en servidor.

## Fase 2. XSS y validación de datos

Duración estimada: 2-5 días  
Prioridad: alta

Acciones:

1. Sustituir `innerHTML` por creación de nodos y `textContent` para datos dinámicos.
2. Crear helpers seguros:
   - `setText(el, value)`.
   - `safeUrl(value, allowedProtocols, allowedHosts)`.
   - `createExternalLink(url, label)` con `rel="noopener noreferrer"`.
3. Sanear datos que deban admitir HTML con DOMPurify y política mínima.
4. Validar esquemas antes de escribir Firebase: nombre, teléfono, WhatsApp, URL, foto, mensajes, notas, libros y pedidos.
5. Añadir límites de tamaño/tipo para fotos y migrar imágenes a Storage si procede.

Criterios de aceptación:

- Inyectar `<script>`, atributos `onerror`, `javascript:` o HTML en nombre/notas/libros/pedidos no ejecuta código.
- Todos los enlaces externos abren con `rel="noopener noreferrer"`.
- Las fotos grandes se rechazan o comprimen antes de guardar.

## Fase 3. Notificaciones y service worker

Duración estimada: 2-3 días  
Prioridad: alta

Acciones:

1. Retirar server keys del cliente.
2. Configurar FCM desde backend/Cloud Functions con Admin SDK.
3. Convertir eventos `scan`, `sos`, `ubicacion` y `estoy` en registros server-side que disparen push.
4. Parametrizar URL de apertura del service worker por entorno.
5. Añadir estados UI: notificaciones activadas, bloqueadas, no configuradas o error.

Criterios de aceptación:

- No hay claves servidor FCM en HTML/JS público.
- KIDS/PETS disparan push aunque HOME no esté abierto como listener activo.
- Al tocar una notificación, abre la URL correcta del entorno actual.

## Fase 4. Assets, UI y rendimiento

Duración estimada: 1-3 días  
Prioridad: media-alta

Acciones:

1. Optimizar los SVG y eliminar PNG base64 innecesario.
2. Crear versiones `logo-main` y `logo-footer` ligeras.
3. Cambiar referencias remotas a rutas relativas locales cuando la app se publica junto a assets.
4. Centralizar tamaños de logo por CSS.
5. Corregir `tok-instrucciones.html` 404.
6. Añadir manejo visible de 429/error en Google Books.
7. Revisar contraste y tamaño de logos footer.

Criterios de aceptación:

- Cada logo de interfaz pesa idealmente menos de 50 KB; si es icono simple, menos de 20 KB.
- La app funciona si GitHub Pages de assets externos está temporalmente inaccesible.
- El QR de instrucciones abre una página válida.
- La búsqueda de libros muestra error controlado ante 429 o caída de API.

## Fase 5. Dependencias, CSP y publicación

Duración estimada: 1-2 días  
Prioridad: media

Acciones:

1. Añadir CSP en hosting o meta equivalente si no hay control de cabeceras.
2. Self-host de `qrcodejs` o añadir SRI con versión fija.
3. Revisar dominios externos mínimos: Firebase, Google Books, fuentes, Linktree/propios.
4. Preparar checklist de release por entorno: local, staging, producción.

Criterios de aceptación:

- CSP bloquea scripts inline no autorizados o se justifica temporalmente cada excepción.
- Dependencias externas críticas están fijadas, auditadas y documentadas.

## Fase 6. `inventory-app`

Duración estimada: 1-3 días si se conserva  
Prioridad: alta si se expone en red; baja si es solo experimento local

Acciones:

1. Decidir si se mantiene dentro de `tok`.
2. Añadir autenticación y autorización en endpoints Express.
3. Cambiar `cors()` abierto por allowlist.
4. Añadir `helmet`, rate limiting y validación de payloads.
5. Actualizar dependencias vulnerables; probar migración de `sqlite3` o alternativa mantenida.
6. Sustituir `innerHTML` en tablas por render seguro.

Criterios de aceptación:

- `npm audit --omit=dev` no reporta vulnerabilidades altas.
- Un origen no autorizado no puede llamar CRUD.
- Datos con HTML no se ejecutan en el frontend.

## Fase 7. QA final

Duración estimada: 2-4 días  
Prioridad: obligatoria antes de producción

Acciones:

1. Crear pruebas Playwright para:
   - Activación válida/inválida.
   - Alta de HOME.
   - Configuración ONE/KIDS/PETS/BOOKS.
   - SOS y alertas.
   - Admin autenticado y denegado.
2. Crear pruebas Firebase Emulator para reglas.
3. Revisar Lighthouse móvil: performance, accessibility, best practices.
4. Revisar flujos reales con QR/NFC en Android e iOS.
5. Probar offline/caída Firebase/CDN/API.

Criterios de aceptación:

- Suite E2E verde en rutas críticas.
- Reglas Firebase probadas contra accesos cruzados.
- No hay errores de consola inesperados en las pantallas principales.
- QR/NFC abren la app correcta y no rompen si falta `fid`.

## Orden sugerido de ejecución

1. Admin y reglas Firebase.
2. Activación y PIN.
3. XSS/render seguro.
4. FCM/service worker.
5. Assets/logos/enlaces.
6. Inventory-app.
7. QA automatizado y release.

Este orden reduce primero el riesgo de exposición de datos y después estabiliza experiencia, rendimiento y mantenimiento.
