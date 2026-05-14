# TO-K Admin: nuevo modelo de activacion

## Objetivo

Extender `tok-admin` para que deje de generar un unico token simple y pase a gestionar:

- un token principal para activar el nucleo familiar
- una identidad por pieza fisica
- asignacion opcional a correo del propietario
- packs de varios articulos
- ampliaciones posteriores sobre una familia ya existente

Este documento define el modelo recomendado para que cualquier primera pieza (`HOME`, `BOOKS`, `ONE`, `KIDS`, `PETS`) pueda crear el nucleo familiar sin romper la continuidad de datos.

## Principio base

La primera pieza no crea un ecosistema separado. Crea o reclama un mismo contenedor comun:

- `FID`: identificador de familia o nucleo familiar
- `MID`: identificador de miembro dentro del `FID`
- `UID`: usuario autenticado del propietario
- `AID`: identificador unico de cada pieza fisica

Los productos no se sincronizan entre si directamente. Todos leen y escriben dentro del mismo `FID`.

## Decision recomendada

Usar un modelo hibrido:

1. Un `familyActivationToken` visible para el cliente.
2. Un `AID` por cada pieza fisica, normalmente oculto dentro del QR, NFC o metadata del producto.

No se recomienda depender solo de un token por familia ni solo de tokens por producto.

Motivo:

- un token familiar simplifica la experiencia de activacion inicial
- un `AID` por pieza permite packs, ampliaciones, reposiciones y trazabilidad real

## Que debe hacer tok-admin

`tok-admin` debe poder crear y gestionar al menos estos objetos:

### 1. Pedido

Campos minimos:

- `orderId`
- `customerName`
- `customerEmail` opcional
- `status`
- `createdAt`
- `notes`
- `items[]`
- `packId` opcional
- `familyId` opcional si ya existe

### 2. Token principal de familia

Campos minimos:

- `token`
- `type = family_activation`
- `status = available | reserved | redeemed | expired`
- `assignedEmail` opcional
- `orderId`
- `packId` opcional
- `familyId` null hasta activacion
- `redeemedByUid` null hasta activacion
- `redeemedAt` null hasta activacion
- `createdAt`
- `expiresAt` opcional

Uso:

- sirve para crear el primer `FID`
- no se reutiliza tras el canje
- puede asignarse de antemano a un correo si el cliente te lo da

### 3. Asset o pieza fisica

Campos minimos:

- `aid`
- `productType = HOME | BOOKS | ONE | KIDS | PETS`
- `status = unassigned | assigned | active | replaced | retired`
- `orderId`
- `packId` opcional
- `familyId` opcional
- `assignedEmail` opcional
- `linkedMid` opcional
- `qrPayload` o `nfcPayload`
- `createdAt`
- `activatedAt` opcional

Uso:

- representa una pieza fisica concreta
- permite saber que articulos tiene cada familia
- permite asignar nuevas piezas a una familia ya activa sin tocar el token principal

## Flujos que tok-admin debe soportar

### Caso A. Primera compra de una sola pieza

Ejemplo: venden un `BOOKS`.

`tok-admin` genera:

- 1 `familyActivationToken`
- 1 `AID` de `BOOKS`

Activacion esperada:

1. El cliente inicia sesion con Google.
2. Introduce el token principal.
3. Backend valida token.
4. Backend crea `FID`.
5. Backend vincula el `UID` del propietario al `FID`.
6. Backend marca el `AID` del `BOOKS` como activo dentro de esa familia.

### Caso B. Pack de varios articulos

Ejemplo: `HOME + ONE + KIDS + BOOKS`.

`tok-admin` genera:

- 1 `familyActivationToken`
- 1 `AID` por pieza del pack
- 1 `packId`

Activacion esperada:

1. La primera pieza activada crea el `FID`.
2. Las demas piezas del mismo pack se vinculan al mismo `FID`.
3. No se crea un segundo token principal por cada articulo del pack.

### Caso C. Compra posterior de una pieza adicional

Ejemplo: una familia con `BOOKS` compra despues un `HOME`.

`tok-admin` debe permitir:

1. Buscar familia por `familyId`, correo o historial de pedidos.
2. Crear un nuevo `AID` para el nuevo articulo.
3. Dejarlo preasignado a la familia existente.

En este caso no hace falta crear un nuevo `familyActivationToken`, salvo que quieras lanzar una reactivacion manual o un flujo excepcional.

### Caso D. Cliente sin correo en el momento de la venta

`tok-admin` debe permitir crear pedido, token y assets sin `assignedEmail`.

Cuando el cliente active:

1. inicia sesion con Google
2. canjea el token principal
3. queda asociado ese `UID` y ese correo real al `FID`

## Recomendaciones de UX

- No pedir `FID` manual como flujo principal.
- No pedir token y `FID` a la vez.
- `FID` debe seguir existiendo como identificador tecnico y como respaldo, no como paso normal del usuario.
- Las piezas adicionales deben unirse por login del propietario, `AID` preasignado, invitacion o codigo de union temporal.

## Recomendaciones de seguridad

Estas decisiones estan alineadas con la auditoria ya incluida en este repo:

- mover activacion y generacion de codigos a backend o Cloud Functions
- proteger `tok-admin` con autenticacion real
- eliminar el fallback de activacion beta del frontend
- no confiar en `fid`, `mid` o rutas Firebase manipulables desde el cliente como frontera de seguridad

## Google Auth

### Admin interno

Obligatorio:

- login con Google
- validacion server-side de rol admin
- no cargar pedidos ni activaciones antes de validar el rol

### Propietario de familia

Muy recomendable para:

- primera activacion
- compra posterior
- recuperacion tras cambio de movil
- gestion multi dispositivo

### Escaneos publicos

No deben requerir Google si son flujos publicos o de emergencia.

## Modelo minimo de datos sugerido

Puede implementarse en Realtime Database o migrarse a Firestore. La estructura minima recomendada es:

```text
admin/orders/{orderId}
admin/familyTokens/{token}
admin/assets/{aid}
admin/packs/{packId}
familias/{fid}
familyMembers/{fid}/{uid}
assetIndex/{aid} -> fid
```

## Operaciones sensibles que deben salir del frontend

- generar token principal
- generar `AID`
- asignar correo a token o asset
- crear `FID`
- canjear token principal
- unir assets a una familia
- cambiar estado de pedido
- consultar panel admin completo

## Criterios de aceptacion para la evolucion de tok-admin

1. `tok-admin` puede crear pedidos con uno o varios articulos.
2. `tok-admin` puede generar un unico token principal por pedido o por familia.
3. `tok-admin` genera un `AID` por cada pieza fisica.
4. Si existe correo, puede quedar preasignado desde admin.
5. Si no existe correo, la familia se asigna al primer login valido del propietario.
6. Una compra posterior puede anadirse a una familia existente sin crear un nuevo `FID`.
7. Ninguna operacion sensible depende solo del frontend.

## Migracion gradual recomendada

### Fase 1

- mantener el token actual como `familyActivationToken`
- anadir en admin la generacion de `AID` por producto
- guardar `assignedEmail`, `orderId` y `packId`

### Fase 2

- mover generacion y canje a Cloud Functions
- anadir Google Auth para admin
- anadir roles reales de servidor

### Fase 3

- cambiar las apps cliente para que usen login del propietario y flujos de asset asignado
- dejar `FID` como identificador secundario y no como paso principal de UX
