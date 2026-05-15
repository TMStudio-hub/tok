# TO-K Backend: esquema exacto y contratos de activacion

## Objetivo

Definir un esquema exacto para Firebase Realtime Database y los contratos minimos de backend para que TO-K pueda:

- activar una familia desde cualquier primera pieza
- seguir usando `FID` como nucleo familiar
- mantener compatibilidad temporal con las apps beta actuales
- soportar packs, ampliaciones y asignacion opcional a correo
- sacar del frontend la logica sensible de activacion y admin

## Decision tecnica para la fase 1

Se recomienda mantener Firebase Realtime Database en la primera evolucion, porque las apps actuales ya trabajan sobre rutas como:

- `familias/{fid}/hogar`
- `familias/{fid}/miembros/{mid}`
- `familias/{fid}/alertas`
- `familias/{fid}/notas`
- `midIndex/{mid}`

Esto evita romper `HOME`, `ONE`, `KIDS`, `PETS` y `BOOKS` mientras el backend nuevo se incorpora.

Firestore puede evaluarse mas adelante, pero no es el paso mas eficiente si primero hay que cerrar seguridad y activacion.

## Identidades del sistema

- `UID`: usuario autenticado en Firebase Auth
- `FID`: familia o nucleo familiar
- `MID`: miembro o perfil dentro de la familia
- `AID`: asset fisico, una pieza concreta vendida
- `TOKEN`: codigo principal visible para activar la familia
- `PACKID`: agrupacion logica de varios assets vendidos juntos
- `ORDERID`: pedido administrativo

## Esquema exacto recomendado

```text
admin/
  orders/{orderId}
  familyTokens/{token}
  assets/{aid}
  packs/{packId}
  auditLogs/{logId}

familias/{fid}/
  meta
  hogar
  miembros/{mid}
  owners/{uid}
  assets/{aid}
  alertas/{alertId}
  notas/{noteId}
  push_pending/{pushId}

userFamilies/{uid}/{fid}
assetIndex/{aid}
midIndex/{mid}
emailIndex/{emailKey}/families/{fid}
emailIndex/{emailKey}/orders/{orderId}
emailIndex/{emailKey}/assets/{aid}
```

## Rutas admin exactas

### admin/orders/{orderId}

```json
{
  "orderId": "ORD-20260514-0001",
  "status": "draft",
  "mode": "initial",
  "customerName": "Nombre cliente",
  "customerEmail": "cliente@example.com",
  "customerEmailKey": "cliente_example_com",
  "familyId": null,
  "packId": "PACK-AB12CD34",
  "familyToken": "TOK-ABCD-1234",
  "notes": "Observaciones internas",
  "itemsCount": 3,
  "items": {
    "AID-HOME-001": {
      "aid": "AID-HOME-001",
      "productType": "HOME",
      "status": "assigned"
    },
    "AID-BOOKS-001": {
      "aid": "AID-BOOKS-001",
      "productType": "BOOKS",
      "status": "assigned"
    }
  },
  "createdByUid": "adminUid",
  "createdAt": 1770000000000,
  "updatedAt": 1770000000000
}
```

Valores recomendados:

- `status`: `draft | ready | delivered | redeemed | canceled`
- `mode`: `initial | expansion | replacement`

### admin/familyTokens/{token}

```json
{
  "token": "TOK-ABCD-1234",
  "type": "family_activation",
  "status": "available",
  "assignedEmail": "cliente@example.com",
  "assignedEmailKey": "cliente_example_com",
  "orderId": "ORD-20260514-0001",
  "packId": "PACK-AB12CD34",
  "familyId": null,
  "allowedFirstProducts": {
    "HOME": true,
    "BOOKS": true,
    "ONE": true,
    "KIDS": true,
    "PETS": true
  },
  "redeemedByUid": null,
  "redeemedByEmail": null,
  "redeemedAt": null,
  "createdByUid": "adminUid",
  "createdAt": 1770000000000,
  "expiresAt": null
}
```

Valores recomendados:

- `status`: `available | reserved | redeemed | expired | canceled`

### admin/assets/{aid}

```json
{
  "aid": "AID-BOOKS-001",
  "productType": "BOOKS",
  "status": "assigned",
  "orderId": "ORD-20260514-0001",
  "packId": "PACK-AB12CD34",
  "familyId": null,
  "assignedEmail": "cliente@example.com",
  "assignedEmailKey": "cliente_example_com",
  "assignedUid": null,
  "linkedMid": null,
  "linkedMidType": null,
  "activationMode": "initial",
  "replacementFor": null,
  "qrPayload": {
    "aid": "AID-BOOKS-001",
    "productType": "BOOKS",
    "v": 1
  },
  "nfcPayload": {
    "aid": "AID-BOOKS-001",
    "productType": "BOOKS",
    "v": 1
  },
  "createdAt": 1770000000000,
  "activatedAt": null,
  "retiredAt": null
}
```

Valores recomendados:

- `status`: `unassigned | assigned | active | retired | replaced`
- `activationMode`: `initial | expansion | replacement`

### admin/packs/{packId}

```json
{
  "packId": "PACK-AB12CD34",
  "orderId": "ORD-20260514-0001",
  "familyToken": "TOK-ABCD-1234",
  "familyId": null,
  "assignedEmail": "cliente@example.com",
  "assignedEmailKey": "cliente_example_com",
  "assetIds": {
    "AID-HOME-001": true,
    "AID-BOOKS-001": true,
    "AID-KIDS-001": true
  },
  "createdAt": 1770000000000,
  "updatedAt": 1770000000000
}
```

## Rutas familiares exactas

### familias/{fid}/meta

```json
{
  "fid": "FAM-9X2QK1",
  "status": "active",
  "ownerUid": "uid_propietario",
  "ownerEmail": "cliente@example.com",
  "ownerEmailKey": "cliente_example_com",
  "createdFromToken": "TOK-ABCD-1234",
  "createdFromAid": "AID-BOOKS-001",
  "createdFromProduct": "BOOKS",
  "createdAt": 1770000000000,
  "updatedAt": 1770000000000
}
```

### familias/{fid}/hogar

Se mantiene la forma actual para no romper `HOME`. Aqui siguen yendo nombre del hogar, foto, wifi, pin si aun no se ha migrado, tema y configuracion visual.

### familias/{fid}/miembros/{mid}

Se mantiene la forma actual para no romper `ONE`, `KIDS`, `PETS` y `BOOKS`.

### familias/{fid}/owners/{uid}

```json
{
  "uid": "uid_propietario",
  "role": "owner",
  "email": "cliente@example.com",
  "emailKey": "cliente_example_com",
  "status": "active",
  "joinedAt": 1770000000000,
  "lastLoginAt": 1770000000000
}
```

Valores recomendados:

- `role`: `owner | admin | editor | viewer`

### familias/{fid}/assets/{aid}

```json
{
  "aid": "AID-BOOKS-001",
  "productType": "BOOKS",
  "status": "active",
  "linkedMid": "books_1",
  "linkedMidType": "reader",
  "orderId": "ORD-20260514-0001",
  "packId": "PACK-AB12CD34",
  "addedAt": 1770000000000,
  "activatedAt": 1770000000000
}
```

## Indices exactos

### userFamilies/{uid}/{fid}

```json
{
  "role": "owner",
  "status": "active",
  "joinedAt": 1770000000000,
  "lastSeenAt": 1770000000000
}
```

### assetIndex/{aid}

```json
{
  "fid": "FAM-9X2QK1",
  "productType": "BOOKS",
  "status": "active",
  "linkedMid": "books_1",
  "updatedAt": 1770000000000
}
```

### midIndex/{mid}

Compatibilidad obligatoria con clientes actuales.

Durante la fase 1 se recomienda mantener:

```json
"books_1": "FAM-9X2QK1"
```

Si mas adelante quieres mas metadata, no rompas la ruta actual. Crea una ruta paralela nueva como `midMeta/{mid}`.

### emailIndex/{emailKey}

```json
{
  "families": {
    "FAM-9X2QK1": true
  },
  "orders": {
    "ORD-20260514-0001": true
  },
  "assets": {
    "AID-BOOKS-001": true
  }
}
```

## Maquinas de estado recomendadas

### Family token

`available -> redeemed`

Ramas excepcionales:

- `available -> expired`
- `available -> canceled`

Un token `redeemed` no puede volver a `available`.

### Asset

`unassigned -> assigned -> active`

Ramas excepcionales:

- `active -> replaced`
- `active -> retired`

### Order

`draft -> ready -> delivered -> redeemed`

Rama excepcional:

- `draft -> canceled`
- `ready -> canceled`

## Contratos minimos de Cloud Functions

## 1. adminCreateOrderBundle

Uso:

- crear pedido inicial o pack
- generar token principal
- generar `AID` por articulo

Auth:

- solo admin autenticado

Input:

```json
{
  "mode": "initial",
  "customerName": "Nombre cliente",
  "customerEmail": "cliente@example.com",
  "notes": "Pack regalo",
  "items": [
    { "productType": "HOME", "quantity": 1 },
    { "productType": "BOOKS", "quantity": 1 },
    { "productType": "KIDS", "quantity": 2 }
  ]
}
```

Output:

```json
{
  "orderId": "ORD-20260514-0001",
  "packId": "PACK-AB12CD34",
  "familyToken": "TOK-ABCD-1234",
  "assets": [
    { "aid": "AID-HOME-001", "productType": "HOME" },
    { "aid": "AID-BOOKS-001", "productType": "BOOKS" },
    { "aid": "AID-KIDS-001", "productType": "KIDS" },
    { "aid": "AID-KIDS-002", "productType": "KIDS" }
  ]
}
```

## 2. adminAddAssetsToFamily

Uso:

- ampliacion posterior de familia existente

Auth:

- solo admin autenticado

Input:

```json
{
  "familyId": "FAM-9X2QK1",
  "customerEmail": "cliente@example.com",
  "items": [
    { "productType": "HOME", "quantity": 1 }
  ],
  "notes": "Cliente ya tenia BOOKS"
}
```

Output:

```json
{
  "orderId": "ORD-20260515-0002",
  "familyId": "FAM-9X2QK1",
  "assets": [
    { "aid": "AID-HOME-002", "productType": "HOME" }
  ]
}
```

## 3. redeemFamilyActivationToken

Uso:

- primer canje del token principal
- crea `FID`
- une propietario y primer asset

Auth:

- usuario autenticado con Google

Input:

```json
{
  "token": "TOK-ABCD-1234",
  "activationAid": "AID-BOOKS-001",
  "activationProduct": "BOOKS"
}
```

Validaciones minimas:

- el token existe
- el token no esta usado ni expirado
- si `assignedEmail` existe, coincide con el email autenticado
- el `AID` existe y pertenece al pedido o pack del token
- el `AID` aun no esta activo en otra familia

Output:

```json
{
  "familyId": "FAM-9X2QK1",
  "ownerRole": "owner",
  "activatedAid": "AID-BOOKS-001",
  "linkedAssets": [
    "AID-BOOKS-001"
  ],
  "nextStep": "setup_product"
}
```

## 4. claimAssignedAsset

Uso:

- reclamar una pieza adicional ya preasignada a la familia

Auth:

- propietario o admin de la familia autenticado

Input:

```json
{
  "familyId": "FAM-9X2QK1",
  "aid": "AID-HOME-002",
  "productType": "HOME"
}
```

Validaciones minimas:

- el usuario pertenece a la familia
- el `AID` existe
- el `AID` esta asignado a esa familia o a ese email
- el `AID` no esta activo en otra familia

Output:

```json
{
  "familyId": "FAM-9X2QK1",
  "aid": "AID-HOME-002",
  "status": "active",
  "nextStep": "setup_home"
}
```

## 5. adminSearchFamilies

Uso:

- buscar familias desde admin por correo, `FID`, `ORDERID` o `AID`

Auth:

- solo admin autenticado

Input:

```json
{
  "query": "cliente@example.com"
}
```

Output:

```json
{
  "families": [
    {
      "familyId": "FAM-9X2QK1",
      "ownerEmail": "cliente@example.com",
      "assets": 2,
      "orders": 2
    }
  ]
}
```

## 6. generateFamilyInvite

Uso:

- invitar otro usuario a la familia sin compartir `FID` bruto

Auth:

- owner o admin de familia autenticado

Input:

```json
{
  "familyId": "FAM-9X2QK1",
  "role": "editor",
  "expiresInMinutes": 60
}
```

Output:

```json
{
  "inviteCode": "JOIN-8F2M-Q1XZ",
  "expiresAt": 1770003600000
}
```

## 7. WhatsApp Business API para avisos automáticos

La salida automática a WhatsApp no debe depender de `wa.me` ni de una sesión local de WhatsApp Desktop. Si se quiere envío real sin intervención manual, el punto correcto es backend.

Piezas previstas en Functions:

- trigger `sendFamilyAlertWhatsApp` sobre `familias/{fid}/alertas/{alertId}`
- callable admin `adminSendWhatsAppMessage` para TM Core o paneles internos

Variables de entorno mínimas:

- `ENABLE_TOK_ALERT_TRIGGER_EXPORT=true` solo en el proyecto que sea dueño de la RTDB `tok-familiar`; en `tm-ops-44e43` debe quedarse en `false` para evitar errores de deploy por trigger cross-project
- `WHATSAPP_TRIGGER_ENABLED=true` para activar el trigger automático
- `WHATSAPP_PHONE_NUMBER_ID=<phone-number-id de Meta>`
- `WHATSAPP_ACCESS_TOKEN=<token permanente o rotado>`
- `WHATSAPP_DEFAULT_TEMPLATE=<nombre de plantilla aprobada>` si se quiere iniciar conversaciones automáticas fuera de la ventana de 24h
- `WHATSAPP_DEFAULT_TEMPLATE_LANG=es`
- `WHATSAPP_ALERTS_DEFAULT_TO=346XXXXXXXX` como fallback global mientras no exista configuración por familia

Configuración opcional por familia:

```json
{
  "notifications": {
    "whatsapp": {
      "enabled": true,
      "to": "346XXXXXXXX",
      "mode": "template",
      "templateName": "tok_alerta_v1",
      "templateLanguageCode": "es",
      "sendOnlyTypes": ["scan", "sos", "ubicacion", "estoy"]
    }
  }
}
```

Esa estructura puede vivir en `familias/{fid}/meta` o `familias/{fid}/hogar`. Si no existe, el backend puede usar `WHATSAPP_ALERTS_DEFAULT_TO` como destino común.

Notas operativas:

- Para mensajes realmente automáticos a clientes o familias que no hayan escrito en las últimas 24h, Meta exige plantilla aprobada.
- El modo `text` solo es válido cuando la conversación ya está abierta según la política de WhatsApp Business.
- El trigger debe registrar logs y no depender de la sesión de WhatsApp Desktop del operador.

## Compatibilidad con las apps beta actuales

Debe mantenerse durante la fase 1:

1. `familias/{fid}/hogar` con la misma estructura funcional actual.
2. `familias/{fid}/miembros/{mid}` con la misma estructura funcional actual.
3. `midIndex/{mid}` como string simple apuntando a `fid`.
4. `familias/{fid}/alertas`, `notas` y `push_pending` sin cambiar de forma si aun hay clientes antiguos leyendolos.

No debe hacerse todavia:

- convertir `midIndex/{mid}` en objeto
- mover de golpe todo a Firestore
- exigir `FID` manual como paso principal de usuario

## Reglas de seguridad minimas

### Realtime Database

- `admin/**`: deny por defecto, acceso solo desde backend o usuarios admin validados
- `familias/{fid}`: acceso solo si el `uid` autenticado pertenece a `familias/{fid}/owners/{uid}` o a una ruta equivalente validada
- `midIndex`: escritura solo desde backend
- `assetIndex`: escritura solo desde backend
- `familyTokens`: sin lectura publica directa desde cliente

### Firebase Auth

- Google Auth para `tok-admin`
- Google Auth para propietario en activacion y gestion
- escaneos publicos sin login solo para vistas publicas del producto

## Operaciones que deben ser atomicas en backend

`redeemFamilyActivationToken` debe ejecutar como una operacion transaccional:

1. comprobar token
2. comprobar email si aplica
3. comprobar `AID`
4. crear `FID`
5. crear `familias/{fid}/meta`
6. crear `familias/{fid}/owners/{uid}`
7. crear `userFamilies/{uid}/{fid}`
8. activar el asset
9. escribir `assetIndex/{aid}`
10. marcar token como `redeemed`
11. actualizar pedido y pack si existen

Si falla un paso, no debe quedar un token gastado con familia a medias.

## Migracion recomendada por fases

### Fase 1

- anadir backend y nuevos nodos admin
- mantener clientes actuales compatibles
- seguir mostrando `FID` solo como respaldo o soporte

### Fase 2

- cambiar los clientes para que usen Google Auth del propietario donde toque
- reclamar assets por backend
- empezar a depender menos de `localStorage` y menos de `fid` en URL

### Fase 3

- introducir invitaciones de familia y multiusuario
- revisar si conviene migrar parte de admin o indices a Firestore
