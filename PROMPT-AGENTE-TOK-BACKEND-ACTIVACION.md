# Prompt para el agente de backend de activacion TO-K

Tu tarea es definir o implementar el backend de activacion de TO-K para que el sistema deje de depender del frontend en operaciones sensibles.

## Contexto

El ecosistema actual usa paginas HTML estaticas conectadas a Firebase Realtime Database. Hoy la activacion del hogar y parte del admin suceden desde frontend, lo cual no es valido para una version publica.

Objetivo:

- mover a backend la generacion y canje del token principal
- crear familias desde cualquier primera pieza
- mantener `FID` como nucleo familiar
- soportar packs, ampliaciones y assets fisicos por producto
- dejar compatibilidad temporal con las apps beta actuales

Lee y sigue como fuente de verdad estos documentos del repo:

- [tok/README-TOK-ADMIN-ACTIVACION.md](tok/README-TOK-ADMIN-ACTIVACION.md)
- [tok/README-TOK-BACKEND-ACTIVACION.md](tok/README-TOK-BACKEND-ACTIVACION.md)
- [tok/auditoria/plan-remediacion.md](tok/auditoria/plan-remediacion.md)

## Reglas de negocio obligatorias

1. Un `familyActivationToken` crea una sola familia.
2. Cada pieza fisica tiene su propio `AID`.
3. Un pack usa un unico token principal y varios `AID`.
4. Una compra posterior de una nueva pieza para una familia existente no crea un nuevo `FID`.
5. Si un token o asset tiene `assignedEmail`, debe coincidir con el email del usuario autenticado salvo excepcion administrativa explicita.
6. `midIndex/{mid}` debe mantenerse compatible como string simple en la fase 1.
7. Ningun flujo sensible puede confiar solo en `fid`, `mid`, `localStorage` o parametros de URL como frontera de seguridad.

## Implementacion esperada

Implementa o prepara estos componentes:

### 1. Autenticacion y roles

- Google Auth para admin interno
- Google Auth para propietario en activacion y gestion
- validacion server-side del rol admin antes de exponer operaciones admin

### 2. Cloud Functions o backend equivalente

Implementa estas operaciones con validacion fuerte y escritura atomica:

- `adminCreateOrderBundle`
- `adminAddAssetsToFamily`
- `redeemFamilyActivationToken`
- `claimAssignedAsset`
- `adminSearchFamilies`
- `generateFamilyInvite`

Si el stack ya usa Firebase Functions, mantenlo. Si no hay backend creado en este workspace, deja el codigo o scaffolding en el repositorio correcto y documenta lo que falte.

### 3. Realtime Database schema

Usa el esquema exacto documentado en [tok/README-TOK-BACKEND-ACTIVACION.md](tok/README-TOK-BACKEND-ACTIVACION.md).

Prioridades:

- `admin/orders/{orderId}`
- `admin/familyTokens/{token}`
- `admin/assets/{aid}`
- `admin/packs/{packId}`
- `familias/{fid}/meta`
- `familias/{fid}/owners/{uid}`
- `familias/{fid}/assets/{aid}`
- `userFamilies/{uid}/{fid}`
- `assetIndex/{aid}`
- `midIndex/{mid}` compatible

### 4. Seguridad

- `admin/**` no debe ser publico
- `midIndex` y `assetIndex` deben escribirse solo desde backend
- el canje del token debe ser transaccional
- si la operacion falla a mitad, no puede quedar un token consumido con familia incompleta

## Si no encuentras el codigo del backend en este workspace

Haz esto sin bloquearte:

1. Documenta que el backend no esta presente aqui.
2. Crea el contrato exacto de funciones, payloads y respuestas.
3. Si existe un repo o carpeta separada para Functions, trabaja alli.
4. Si no existe acceso al repo correcto, deja una propuesta implementable y pruebas de aceptacion.

## Criterios de aceptacion

1. Un admin autenticado puede crear un pedido con uno o varios articulos.
2. El sistema genera un token principal y un `AID` por pieza.
3. Un usuario autenticado puede canjear el token principal una sola vez para crear su `FID`.
4. Una pieza adicional puede vincularse a una familia ya existente sin crear otro `FID`.
5. `HOME`, `ONE`, `KIDS`, `PETS` y `BOOKS` pueden seguir leyendo las rutas familiares actuales durante la transicion.
6. El frontend deja de poder activar familias solo con llamadas directas inseguras a Firebase.

## Validaciones minimas a implementar o dejar especificadas

- token inexistente
- token usado
- token expirado
- email no coincide
- `AID` inexistente
- `AID` ya activo en otra familia
- usuario sin rol admin intentando crear pedidos
- usuario sin permiso intentando reclamar asset de otra familia

## Entregables esperados

1. Codigo backend o scaffolding de backend para las funciones criticas.
2. Reglas de seguridad o borrador de reglas acorde al nuevo modelo.
3. Documentacion breve de despliegue y variables necesarias.
4. Lista de cambios minimos que deberan hacer luego las apps cliente.
