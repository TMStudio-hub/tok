# Hallazgos de seguridad

Escala usada: Crítico, Alto, Medio, Bajo.

## S-01. Firebase expuesto sin autenticación visible

Severidad: Crítico  
Componentes: HOME, ONE, KIDS, PETS, BOOKS, Admin

Evidencia:

- No se encontró uso de Firebase Auth (`getAuth`) en las páginas revisadas.
- Las apps leen y escriben en rutas como `familias/{FID}/hogar`, `familias/{FID}/miembros/{MID}`, `familias/{FID}/alertas`, `familias/{FID}/push_pending` y `midIndex/{MID}` desde JavaScript del navegador.
- No hay archivo de reglas Firebase en el workspace revisado.

Impacto:

Si las reglas de Realtime Database son permisivas, cualquiera con un `fid` o `mid` podría leer, alterar o borrar perfiles, datos familiares, alertas, códigos y pedidos. Aunque las reglas externas fueran restrictivas, el cliente actual no demuestra un modelo de identidad robusto.

Remediación:

- Configurar reglas `deny by default`.
- Usar Firebase Auth o tokens custom por familia/dispositivo.
- Mover activaciones, generación de códigos, `midIndex`, push y operaciones admin a Cloud Functions o backend propio.
- Añadir pruebas con Firebase Emulator para demostrar que un usuario no puede leer/escribir rutas ajenas.

## S-02. Panel Admin sensible en frontend público

Severidad: Crítico  
Componente: `tok-admin.html`

Evidencia:

- El PIN Admin es cliente-side, con fallback documentado `2810`.
- El panel lee/escribe `admin/config/pin`, `admin/pedidos` y `activaciones/{codigo}` desde el navegador.
- En la prueba visual, el overlay de PIN aparece, pero el contenido del panel y la sincronización de pedidos existen detrás en DOM.

Impacto:

Un usuario no autorizado podría inspeccionar el código, manipular funciones globales, saltar el overlay visual o abusar de reglas Firebase abiertas para generar activaciones y consultar pedidos.

Remediación:

- Retirar Admin de hosting público o protegerlo con autenticación real.
- Mover generación de códigos y escritura de pedidos a backend.
- No guardar ni leer PIN administrativo desde una ruta pública de Firebase.
- Evitar cargar datos administrativos hasta que el backend haya validado sesión/rol.

## S-03. Bypass de activación en HOME

Severidad: Crítico  
Componente: `tok-home-beta.html`

Evidencia:

- En `activarCodigo`, el `catch` de validación Firebase permite continuar a setup con `window._codigoActivacion = codigo || 'BETA'`.

Impacto:

Una caída de red, bloqueo deliberado o error de Firebase permite activar un hogar sin validar código. Esto rompe el control comercial y de seguridad del alta.

Remediación:

- Eliminar el fallback beta en producción.
- Mostrar error bloqueante si Firebase no puede validar el código.
- Marcar activación como operación atómica de servidor: validar código, crear familia, marcar código usado.

## S-04. PIN por defecto y protección local débil

Severidad: Alto  
Componentes: HOME, ONE, KIDS, PETS, Admin

Evidencia:

- HOME usa fallback `1234` al guardar/comparar PIN.
- ONE, KIDS y PETS inicializan `pin:'1234'`.
- Admin usa fallback `2810`.

Impacto:

Los PIN protegen pantallas privadas o configuración, pero son conocidos, de 4 dígitos y comparados en cliente. Sirven como barrera visual, no como seguridad real.

Remediación:

- Forzar creación de PIN único durante activación y bloquear `1234`, `0000`, `1111`, secuencias y repetidos.
- Limitar intentos y añadir cooldown local/servidor.
- No usar el PIN como autorización de base de datos; solo como desbloqueo local secundario.

## S-05. XSS por `innerHTML` con datos no escapados

Severidad: Alto  
Componentes: todos los HTML principales e `inventory-app/public/app.js`

Evidencia:

- Se renderizan con plantillas HTML datos como notas, alertas, libros de Google Books, pedidos, cliente, salud, bitácora, redes sociales, footer redirect, fotos y URLs.
- En inventario, almacenes y productos se insertan en tablas con `innerHTML` usando datos de API.

Impacto:

Un valor malicioso guardado en Firebase, Google Books, SQLite o query/config podría ejecutar JavaScript en el navegador de familiares o administradores. En Admin, esto puede escalar a robo de datos o generación de códigos.

Remediación:

- Usar `textContent`, `setAttribute` y creación de nodos DOM para datos dinámicos.
- Si se necesita HTML rico, usar un sanitizador probado como DOMPurify con política estricta.
- Validar URLs con allowlist de protocolos `https:`, `tel:`, `sms:` y dominios esperados.
- Añadir CSP para reducir impacto de inyección.

## S-06. FCM y notificaciones no listas para producción

Severidad: Alto  
Componentes: HOME, ONE, BOOKS, service worker

Evidencia:

- VAPID key y FCM server key están como placeholders `REEMPLAZA...`.
- BOOKS y HOME contienen referencias a server key en cliente.
- El service worker escucha `push_pending` y abre URL hardcoded a GitHub Pages.

Impacto:

Las notificaciones pueden no funcionar realmente. Si se rellena una server key legacy en cliente, quedaría expuesta y permitiría abuso de envío. El patrón `push_pending` además depende de permisos de lectura/escritura del cliente.

Remediación:

- Usar Firebase Cloud Messaging con Admin SDK desde backend/Cloud Functions.
- Mantener VAPID pública donde corresponda, pero nunca exponer server keys.
- Hacer que KIDS/PETS escriban eventos y que backend decida notificaciones.
- Parametrizar URLs de service worker por entorno.

## S-07. Dependencias externas sin CSP/SRI

Severidad: Medio-Alto  
Componentes: HTML principales

Evidencia:

- No se encontraron cabeceras/meta CSP.
- No se encontraron atributos `integrity` en scripts externos como qrcodejs.
- Se importan SDKs y fuentes desde dominios externos.

Impacto:

Un compromiso de CDN, dependencia externa o inyección de HTML tiene más margen para ejecutar scripts. También hay dependencia operativa de terceros.

Remediación:

- Definir CSP estricta por hosting.
- Self-host de qrcodejs o usar SRI con versión fijada.
- Reducir dominios permitidos a los necesarios.
- Considerar build estático con bundling y hashes.

## S-08. Enlaces externos con `target="_blank"` incompleto

Severidad: Medio  
Componentes: HOME, ONE

Evidencia:

- Se detectaron enlaces `target="_blank"` sin `rel="noopener"` en HOME y ONE.

Impacto:

Abre riesgo de tabnabbing si el destino puede controlar `window.opener`.

Remediación:

- Añadir siempre `rel="noopener noreferrer"` a enlaces externos en nueva pestaña.
- Centralizar creación de enlaces externos en una función segura.

## S-09. Datos persistentes en localStorage/cookies

Severidad: Medio  
Componentes: HOME, ONE, KIDS, PETS, BOOKS, Admin

Evidencia:

- `fid`, historial admin y estado local se guardan en `localStorage`; HOME también usa cookie para `fid`.

Impacto:

Datos persistentes pueden quedar en dispositivos compartidos y facilitar acceso posterior a perfiles o configuración.

Remediación:

- Reducir datos persistidos al mínimo.
- Añadir opción de cerrar sesión/olvidar hogar.
- Evitar guardar datos administrativos sensibles en `localStorage`.

## S-10. `inventory-app` sin hardening de backend

Severidad: Alto si se expone en red  
Componente: `inventory-app`

Evidencia:

- `app.use(cors())` permite cualquier origen.
- No hay autenticación ni autorización en endpoints CRUD.
- `npm audit --omit=dev` reporta 7 vulnerabilidades: 2 bajas y 5 altas, principalmente transitivas vía `sqlite3/node-gyp/tar`.

Impacto:

Si el servidor se expone fuera de localhost, cualquier origen podría crear, editar o borrar almacenes/productos. Las vulnerabilidades transitivas aumentan riesgo en instalación/build.

Remediación:

- Añadir login, sesiones o token de API.
- Limitar CORS a dominios propios.
- Añadir `helmet`, rate limiting y validación con esquema.
- Actualizar dependencias y probar cambio a `sqlite3@6` o alternativa mantenida.
