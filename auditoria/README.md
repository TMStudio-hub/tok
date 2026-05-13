# Documentos de auditoría TO-K

Fecha de auditoría: 2026-05-13

Alcance revisado:

- `tok-home-beta.html` como centralita del ecosistema familiar.
- `tok-one-beta.html`, `tok-kids-beta.html`, `tok-pets-beta.html` y `tok-books-beta.html` como apps conectadas por `fid`/`mid`.
- `tok-admin.html` como generador interno de pedidos, códigos y QR.
- `firebase-messaging-sw.js` como puente de notificaciones.
- SVG locales y assets remotos publicados en GitHub Pages.
- `inventory-app/` como app local independiente de inventario encontrada dentro de la carpeta `tok`.

Documentos incluidos:

- `auditoria-360.md`: visión ejecutiva, metodología, estado por componente y mapa de riesgos.
- `hallazgos-seguridad.md`: vulnerabilidades y recomendaciones técnicas priorizadas.
- `hallazgos-funcionales-ui.md`: funcionalidad, estética, logos, assets, enlaces y comportamiento visual.
- `plan-remediacion.md`: plan de actuación por fases con criterios de aceptación.

Resumen ejecutivo:

El ecosistema TO-K carga y la arquitectura principal está clara: HOME actúa como central familiar y el resto de apps escriben eventos y configuración en Firebase Realtime Database. El estado actual es apto para beta controlada, pero no para producción abierta. Los riesgos más importantes son autorización basada en cliente, PIN por defecto, bypass de activación cuando Firebase falla, escritura directa en rutas `fid`/`mid`, panel admin expuesto en frontend, datos renderizados con `innerHTML` sin escape y dependencias externas sin CSP/SRI.

Prioridad recomendada:

1. Bloquear reglas Firebase y mover operaciones sensibles a backend o Cloud Functions.
2. Eliminar fallback de activación y PIN por defecto.
3. Sanear todo renderizado de datos externos o de usuario.
4. Corregir Admin para que no exponga ni sincronice datos antes de una autenticación real.
5. Optimizar logos/assets y sustituir dependencias remotas por versiones locales controladas.
