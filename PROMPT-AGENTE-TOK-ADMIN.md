# Prompt para el agente de TO-K Admin

Tu tarea es evolucionar `tok-admin` para soportar el nuevo modelo de activacion de TO-K.

## Contexto funcional

Hoy `tok-admin` genera solo un token de activacion simple para `HOME`.

El ecosistema TO-K debe pasar a soportar que cualquier primera pieza (`HOME`, `BOOKS`, `ONE`, `KIDS`, `PETS`) pueda iniciar el nucleo familiar. El nucleo sigue siendo una familia identificada por `FID`, y los miembros siguen usando `MID`, pero ahora cada pieza fisica debe tener su propio `AID`.

Objetivo:

- mantener un token principal para activar la familia
- anadir una identidad por pieza fisica
- soportar packs y compras posteriores
- permitir asignacion opcional a correo del cliente
- preparar `tok-admin` para autenticacion real y logica server-side

## Reglas de negocio que debes implementar

1. Debe existir un unico `familyActivationToken` por activacion inicial de familia.
2. Debe existir un `AID` por cada pieza fisica.
3. Un pack con varios articulos usa un solo token principal, pero varios `AID`.
4. Una compra posterior de una nueva pieza para una familia existente no debe crear un nuevo `FID`.
5. Si el admin conoce el correo del cliente, debe poder asignarlo al token principal y a los assets generados.
6. Si el correo no se conoce en la venta, el sistema debe permitir activacion posterior por el primer login valido del propietario.
7. `FID` sigue siendo el identificador del nucleo familiar, pero no debe ser el eje principal del flujo de activacion para el usuario.

## Cambios funcionales esperados en tok-admin

Anade o adapta estas capacidades:

- crear pedidos con uno o varios articulos
- seleccionar tipo de articulo por item: `HOME`, `BOOKS`, `ONE`, `KIDS`, `PETS`
- generar un solo `familyActivationToken` por pedido inicial
- generar un `AID` por cada articulo del pedido
- guardar `assignedEmail` opcional
- guardar `orderId`, `packId`, estados y fechas
- permitir marcar un pedido como ampliacion de una familia existente
- permitir buscar una familia existente por correo, `FID` o historial si el backend ya lo soporta

## Restricciones tecnicas

- No dejes la seguridad en el frontend.
- Si hoy el panel escribe directamente en Firebase desde el navegador, prepara la transicion a Cloud Functions o backend.
- No cargues datos admin antes de validar autenticacion real y rol admin.
- No mantengas PIN local como unico control de acceso.

## Modelo de datos minimo que debes usar o aproximar

```text
admin/orders/{orderId}
admin/familyTokens/{token}
admin/assets/{aid}
admin/packs/{packId}
familias/{fid}
familyMembers/{fid}/{uid}
assetIndex/{aid} -> fid
```

## Entregables esperados

1. Extender la interfaz de `tok-admin` para pedidos multi item.
2. Extender la logica de generacion para emitir:
   - un `familyActivationToken`
   - uno o varios `AID`
3. Guardar toda la metadata minima necesaria para packs, email y relacion con familia.
4. Dejar preparado el codigo para que el canje real del token pase por backend.
5. Documentar cualquier laguna si el repo actual no contiene el codigo fuente completo de `tok-admin`.

## Si no encuentras tok-admin en este workspace

Actua asi:

1. Documenta explicitamente que el codigo fuente de `tok-admin` no esta en este repo.
2. Crea o actualiza documentacion tecnica con el modelo propuesto.
3. Si existe un repo separado o una carpeta externa, aplica alli los cambios.
4. Si no existe acceso al repo de admin, deja preparados los contratos de datos, payloads y pantallas esperadas.

## Resultado esperado

Al terminar, `tok-admin` debe quedar conceptualmente listo para este flujo:

- el admin crea un pedido
- el sistema genera 1 token principal y N assets
- el cliente activa la familia desde cualquier primera pieza
- las piezas futuras se unen al mismo `FID`
- el panel puede gestionar pedidos iniciales, packs y ampliaciones sin duplicar familias
