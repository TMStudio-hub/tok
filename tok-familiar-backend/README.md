# tok-familiar backend

Backend minimo para la fase 2 de WhatsApp automatico sobre la RTDB propietaria `tok-familiar`.

Que hace:

- escucha `familias/{fid}/alertas/{alertId}` en Realtime Database
- resuelve el numero destino desde `meta`, `hogar`, miembros o fallback global
- envia por WhatsApp Cloud API desde backend
- evita el problema cross-project que teniamos en `tm-ops-44e43`

## Estructura

- `firebase.json`: raiz del proyecto Firebase para este backend
- `.firebaserc.example`: ejemplo de proyecto por defecto
- `functions/index.js`: trigger automatico `sendFamilyAlertWhatsApp`
- `functions/.env.example`: variables necesarias

## Arranque

1. Entra en esta carpeta.
2. Duplica `.firebaserc.example` a `.firebaserc` si vas a usar `tok-familiar` como proyecto por defecto.
3. Entra en `functions` y ejecuta `npm install`.
4. Duplica `.env.example` a `.env` y completa los valores reales.
5. Despliega con `firebase deploy --only functions:sendFamilyAlertWhatsApp`.

## Variables clave

- `WHATSAPP_TRIGGER_ENABLED=true` para activar el trigger
- `WHATSAPP_PHONE_NUMBER_ID` y `WHATSAPP_ACCESS_TOKEN` desde Meta
- `WHATSAPP_DEFAULT_MODE=text|template`
- `WHATSAPP_DEFAULT_TEMPLATE` solo si ya existe una plantilla aprobada para alertas
- `WHATSAPP_ALERTS_DEFAULT_TO` como fallback global mientras no haya configuracion por familia

## Nota de plantilla

La plantilla probada anoche (`jaspers_market_order_confirmation_v1`) parecia orientada a pedidos y no a alertas automáticas. Por eso este backend deja `WHATSAPP_DEFAULT_MODE=text` por defecto y solo usa `template` si le pasas una plantilla realmente preparada para alertas.