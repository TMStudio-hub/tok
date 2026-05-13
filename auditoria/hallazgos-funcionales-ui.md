# Hallazgos funcionales, UI y assets

## 1. Estado funcional por app

| App | Estado observado | Recomendación |
| --- | --- | --- |
| HOME | Flujo de splash y configuración funciona. Sin `fid`, redirige fuera de la app. Con `fid` inexistente muestra hogar sin configurar. | Añadir pantalla diagnóstica opcional para enlaces base y errores de conexión; bloquear activación si Firebase falla. |
| ONE | Carga configuración con `fid/mid`; no mostró errores de consola. | Validar existencia/autorización de familia antes de permitir guardar perfil. |
| KIDS | Carga configuración; SOS y ubicación están implementados. | Revisar que mensajes y botones no se generen con HTML inseguro; validar `midIndex` desde backend. |
| PETS | Carga configuración; SOS, bitácora y salud están implementados. | Añadir límites a fotos y validar registros de salud/bitácora. |
| BOOKS | Carga dashboard y listas. Google Books respondió 429 en prueba puntual. | Añadir manejo visible de rate-limit, cache local y mensaje amable cuando la API falle. |
| Admin | Carga panel, overlay PIN y sincronización de Firebase. | No cargar datos ni UI sensible antes de autenticación real; arreglar QR de instrucciones 404. |
| Service worker | Código compacto y orientado a `push_pending`. | Parametrizar URL destino y revisar ciclo de vida/registro por entorno. |
| inventory-app | CRUD básico claro y funcional en código. | Separarla del ecosistema TO-K o documentar que es herramienta interna local. |

## 2. Problemas funcionales concretos

### F-01. QR de instrucciones roto

Admin referencia `https://tmstudio-hub.github.io/tok/tok-instrucciones.html`, pero la verificación devolvió 404.

Impacto: los QR impresos para instrucciones pueden llevar a una página inexistente.

Solución: crear `tok-instrucciones.html`, publicar la página o cambiar el QR a una URL existente.

### F-02. Notificaciones push incompletas

Hay placeholders para VAPID y FCM server key. El patrón actual sugiere beta, pero no producción.

Impacto: notificaciones pueden fallar silenciosamente o depender de HOME abierto/registrado.

Solución: backend/Cloud Functions para FCM y estados claros en UI cuando notificaciones no estén configuradas.

### F-03. Google Books dependiente de rate-limit externo

La prueba HTTP a Google Books devolvió 429.

Impacto: búsquedas pueden fallar por cuota, IP compartida o uso intensivo.

Solución: manejar 429 con reintentos espaciados, cache y mensaje de espera; considerar API key con cuota controlada si procede.

### F-04. HOME base redirige a Linktree

Sin `fid` y fuera de contexto NFC, HOME redirige a Linktree.

Impacto: para QA, soporte o usuarios que abran el enlace base, parece que la app desaparece.

Solución: mantener redirección solo para producción si es deseada, pero añadir `?debug=1`, landing de diagnóstico o página de ayuda.

### F-05. Admin muestra contenido detrás del overlay

El contenido existe y es visible en el árbol accesible aunque haya overlay de PIN.

Impacto: no es una barrera funcional ni de privacidad; puede filtrar datos en accesibilidad, inspección o fallos visuales.

Solución: no montar el panel hasta autenticación; no sincronizar Firebase antes de validar sesión.

## 3. Logos y estética

### Estado visual

Los logos cargan y se ven proporcionados en las primeras pantallas revisadas:

- HOME: logo principal 64x64.
- BOOKS: logo principal 48x48 y logo footer 20x20.
- Admin: logo cabecera 48x48.
- Footers dinámicos: logo TO-K generalmente 20px de alto, con opacidad baja.

La dirección visual por app es reconocible y las pantallas iniciales no mostraron solapes o desbordes evidentes en la pasada automatizada. El estilo beta es consistente, con paletas diferenciadas por producto.

### Problemas de assets

| Hallazgo | Impacto | Recomendación |
| --- | --- | --- |
| SVG locales muy pesados, hasta 1.2 MB. | Carga lenta para iconos pequeños y peor rendimiento móvil. | Exportar versiones optimizadas; evitar SVG con PNG base64 pesado para iconos. |
| HTML usa mayoritariamente logos remotos aunque hay copias locales. | Dependencia de red/GitHub Pages y riesgo de divergencia. | Usar rutas relativas locales con fallback remoto solo si hace falta. |
| Tamaños de logo no están centralizados. | Inconsistencia entre apps y footers. | Crear tokens CSS: `--logo-main`, `--logo-footer`, `--logo-admin`. |
| Footers con logo de 20px y opacidad 0.3-0.4. | Marca poco legible, especialmente en móvil o pantallas oscuras. | Subir a 24px o ajustar opacidad/contraste según fondo. |

## 4. UX y accesibilidad

Fortalezas:

- Las apps son móviles primero y las pantallas principales son directas.
- El lenguaje visual diferencia bien HOME, KIDS, PETS, BOOKS y ONE.
- Formularios de configuración son comprensibles para beta.
- Botones SOS y acciones rápidas están bien priorizados.

Mejoras recomendadas:

- Sustituir alertas `alert()`/`prompt()` por modales accesibles y consistentes.
- Añadir estados de carga y error por Firebase/API en todas las apps.
- Revisar contraste de textos de footer y microtextos en fondos oscuros.
- Añadir etiquetas/ayudas accesibles a botones de icono y teclados PIN.
- Evitar que pantallas sensibles existan en DOM si están bloqueadas.

## 5. Imágenes y fotos subidas

Varias apps convierten fotos a base64 con `FileReader` y las guardan en configuración.

Riesgos:

- No se observan límites claros de tamaño, tipo o compresión.
- Guardar base64 grande en Realtime Database puede aumentar coste, latencia y riesgo de superar límites.
- Datos de imagen se renderizan después en `img src`.

Recomendación:

- Validar tipo MIME y tamaño máximo antes de leer.
- Comprimir/redimensionar en cliente a dimensiones razonables.
- Preferir Firebase Storage con reglas y guardar solo URL/metadata en Database.

## 6. App de inventario

La app `inventory-app` tiene un diseño simple y claro, pero no comparte la estética TO-K y parece una herramienta aparte. Además, está ignorada por `.gitignore`, por lo que puede ser material local no destinado a publicación.

Recomendación:

- Decidir si forma parte del producto TO-K o si debe moverse fuera de la carpeta.
- Si se conserva, añadir autenticación, hardening y diseño acorde al ecosistema.
- Evitar mezclar `inventory.db` y `node_modules` con el paquete público.
