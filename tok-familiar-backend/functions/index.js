"use strict";

const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const { onValueCreated } = require("firebase-functions/v2/database");

if (!admin.apps.length) {
  admin.initializeApp({ databaseURL: normalizeOptionalString(process.env.TOK_DATABASE_URL) || "https://tok-familiar-default-rtdb.firebaseio.com" });
}

const REGION = "us-central1";
const TOK_DATABASE_INSTANCE = String(process.env.TOK_DATABASE_INSTANCE || "").trim();
const TOK_DATABASE_URL = normalizeOptionalString(process.env.TOK_DATABASE_URL) || "https://tok-familiar-default-rtdb.firebaseio.com";
const TOK_SKIP_FAMILY_LOOKUPS = isTruthyFlag(process.env.TOK_SKIP_FAMILY_LOOKUPS, true);
const WHATSAPP_TRIGGER_ENABLED = isTruthyFlag(process.env.WHATSAPP_TRIGGER_ENABLED, false);
const WHATSAPP_GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || "v25.0";
const WHATSAPP_PHONE_NUMBER_ID = normalizePhoneNumber(process.env.WHATSAPP_PHONE_NUMBER_ID);
const WHATSAPP_ACCESS_TOKEN = normalizeOptionalString(process.env.WHATSAPP_ACCESS_TOKEN);
const WHATSAPP_DEFAULT_MODE_RAW = normalizeOptionalString(process.env.WHATSAPP_DEFAULT_MODE).toLowerCase();
const WHATSAPP_DEFAULT_MODE = WHATSAPP_DEFAULT_MODE_RAW === "template" ? "template" : "text";
const WHATSAPP_DEFAULT_TEMPLATE = normalizeOptionalString(process.env.WHATSAPP_DEFAULT_TEMPLATE);
const WHATSAPP_DEFAULT_TEMPLATE_LANG =
  normalizeOptionalString(process.env.WHATSAPP_DEFAULT_TEMPLATE_LANG).toLowerCase() || "en_us";
const WHATSAPP_TEMPLATE_PARAM_MODE =
  normalizeOptionalString(process.env.WHATSAPP_TEMPLATE_PARAM_MODE).toLowerCase() || "alert5";
const WHATSAPP_ALERTS_DEFAULT_TO = normalizePhoneNumber(process.env.WHATSAPP_ALERTS_DEFAULT_TO);

const ALERT_TYPE_LABELS = {
  scan: "escaneo detectado",
  sos: "alguien ha indicado que está con la persona",
  estoy: "persona acompañada",
  ubicacion: "ubicación compartida",
  contacto_wa: "contacto por WhatsApp",
  contacto_sms: "contacto por SMS",
  contacto_tel: "llamada recibida",
  contacto_call: "llamada recibida",
  contacto_email: "correo recibido",
  contacto_telegram: "contacto por Telegram",
};

function nowTs() {
  return Date.now();
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isTruthyFlag(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function pickFirstString(...values) {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
}

function normalizePhoneNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeOptionalString(value) {
  return String(value || "").trim();
}

function maskPhoneNumber(value) {
  const normalized = normalizePhoneNumber(value);
  if (!normalized) return "";
  if (normalized.length <= 4) return normalized;
  return `${"*".repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}`;
}

function truncateText(value, maxLength) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function normalizeAlertType(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeTemplateParameters(values) {
  return asArray(values)
    .map((value) => truncateText(value, 240))
    .filter(Boolean)
    .map((text) => ({ type: "text", text }));
}

function getRuntimeWhatsAppSettings() {
  return {
    phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
    accessToken: WHATSAPP_ACCESS_TOKEN,
    defaultMode: WHATSAPP_DEFAULT_MODE,
    defaultTemplate: WHATSAPP_DEFAULT_TEMPLATE,
    defaultTemplateLang: WHATSAPP_DEFAULT_TEMPLATE_LANG,
    alertsDefaultTo: WHATSAPP_ALERTS_DEFAULT_TO,
    triggerEnabled: WHATSAPP_TRIGGER_ENABLED,
  };
}

function getWhatsAppRuntimeStatus(settings = null) {
  const resolved = settings || getRuntimeWhatsAppSettings();
  const missing = [];
  if (!resolved.phoneNumberId) missing.push("WHATSAPP_PHONE_NUMBER_ID");
  if (!resolved.accessToken) missing.push("WHATSAPP_ACCESS_TOKEN");
  return { ready: missing.length === 0, missing };
}

function getWhatsAppApiUrl(settings) {
  return `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/${settings.phoneNumberId}/messages`;
}

function getWhatsAppMessageId(responseBody) {
  return asArray(responseBody?.messages)[0]?.id || null;
}

async function sendWhatsAppApiPayload(payload, settings) {
  const response = await fetch(getWhatsAppApiUrl(settings), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const metaError = body?.error || {};
    const detailParts = [
      metaError.code ? `code=${metaError.code}` : null,
      metaError.error_subcode ? `subcode=${metaError.error_subcode}` : null,
      metaError.type ? `type=${metaError.type}` : null,
      `http=${response.status}`,
    ].filter(Boolean);
    const message = [
      metaError.message || `WhatsApp API respondió ${response.status}.`,
      detailParts.length ? `(${detailParts.join(", ")})` : null,
    ].filter(Boolean).join(" ");
    throw new Error(message);
  }

  return body;
}

async function sendWhatsAppTextMessage(to, body, settings) {
  return sendWhatsAppApiPayload(
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        preview_url: false,
        body: truncateText(body, 4096),
      },
    },
    settings
  );
}

async function sendWhatsAppTemplateMessage(to, templateName, languageCode, parameters, settings) {
  const components = parameters.length ? [{ type: "body", parameters }] : undefined;
  return sendWhatsAppApiPayload(
    {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode || settings.defaultTemplateLang || "en_us" },
        ...(components ? { components } : {}),
      },
    },
    settings
  );
}

function collectMemberWhatsappNumbers(members) {
  const phones = new Set();
  Object.values(asObject(members)).forEach((member) => {
    const memberData = asObject(member);
    const contactos = asObject(memberData.contactos);
    const phone = normalizePhoneNumber(
      pickFirstString(memberData.wa, contactos.wa, memberData.tel, contactos.tel)
    );
    if (phone) phones.add(phone);
  });
  return [...phones];
}

function resolveFamilyWhatsAppConfig(meta, home, members, settings) {
  const metaWhatsapp = asObject(asObject(asObject(meta).notifications).whatsapp);
  const homeWhatsapp = asObject(asObject(asObject(home).notifications).whatsapp);
  const memberPhones = collectMemberWhatsappNumbers(members);
  const fallbackMemberPhone = memberPhones.length === 1 ? memberPhones[0] : "";
  const to = normalizePhoneNumber(
    pickFirstString(
      metaWhatsapp.to,
      metaWhatsapp.phone,
      homeWhatsapp.to,
      homeWhatsapp.phone,
      home.whatsappAlertsTo,
      settings.alertsDefaultTo,
      fallbackMemberPhone
    )
  );
  const enabled = metaWhatsapp.enabled !== undefined
    ? isTruthyFlag(metaWhatsapp.enabled)
    : homeWhatsapp.enabled !== undefined
      ? isTruthyFlag(homeWhatsapp.enabled)
      : Boolean(to);
  const mode = pickFirstString(metaWhatsapp.mode, homeWhatsapp.mode, settings.defaultMode).toLowerCase();
  const sendOnlyTypes = [...new Set(
    asArray(metaWhatsapp.sendOnlyTypes)
      .concat(asArray(homeWhatsapp.sendOnlyTypes))
      .map(normalizeAlertType)
      .filter(Boolean)
  )];

  return {
    enabled,
    to,
    mode: mode === "template" ? "template" : "text",
    templateName: pickFirstString(metaWhatsapp.templateName, homeWhatsapp.templateName, settings.defaultTemplate),
    templateLanguageCode: pickFirstString(
      metaWhatsapp.templateLanguageCode,
      homeWhatsapp.templateLanguageCode,
      settings.defaultTemplateLang
    ),
    sendOnlyTypes,
  };
}

function buildAlertTimeText(alert) {
  const parts = [String(alert?.fecha || "").trim(), String(alert?.hora || "").trim()].filter(Boolean);
  return parts.join(" ").trim();
}

function buildAlertWhatsAppText(familyId, home, alert) {
  const type = normalizeAlertType(alert?.tipo);
  const label = ALERT_TYPE_LABELS[type] || `nueva alerta (${type || "desconocida"})`;
  const subject = truncateText(alert?.nombre || home?.nombre || "tu TO-K", 80);
  const when = buildAlertTimeText(alert);
  const lines = [
    "TO-K · Aviso automático",
    `${label.charAt(0).toUpperCase()}${label.slice(1)} para ${subject}.`,
    `Familia: ${familyId}`,
  ];

  if (when) lines.push(`Momento: ${when}`);
  if (alert?.url) lines.push(`Ubicación: ${alert.url}`);

  return truncateText(lines.join("\n"), 4096);
}

function buildAlertTemplateParameters(familyId, home, alert) {
  const type = normalizeAlertType(alert?.tipo);
  const subject = truncateText(alert?.nombre || home?.nombre || "tu TO-K", 80) || "tu TO-K";
  const when = truncateText(buildAlertTimeText(alert) || new Date(alert?.ts || nowTs()).toLocaleString("es-ES"), 80);
  const location = truncateText(alert?.url || "Sin ubicación adjunta", 240);
  const label = truncateText(ALERT_TYPE_LABELS[type] || type || "alerta", 80);

   if (WHATSAPP_TEMPLATE_PARAM_MODE === "compact3") {
    return normalizeTemplateParameters([subject, familyId || label, when]);
  }

  return normalizeTemplateParameters([label, subject, familyId, when, location]);
}

// ─────────────────────────────────────────────────────────────────────────────
// activarToken — Callable desde tok-one-beta.html
//
// Mueve la lógica de activación al servidor para que admin/** pueda
// estar completamente bloqueado en las Security Rules.
//
// Input:  { token: "TOK-XXXX-XXXX", aid: "AID-ONE-001", mid: "one_1" }
// Output: { fid: "<firebase-push-key>" }
// ─────────────────────────────────────────────────────────────────────────────
const { onCall, HttpsError } = require("firebase-functions/v2/https");

exports.activarToken = onCall(
  { region: REGION },
  async (request) => {
    const { token, aid, mid = "one_1" } = request.data || {};

    if (!token || typeof token !== "string") {
      throw new HttpsError("invalid-argument", "Introduce el token incluido con el regalo.");
    }
    if (!aid || typeof aid !== "string") {
      throw new HttpsError("invalid-argument", "Identificador de pieza no válido. Reprograma el NFC.");
    }

    const db = admin.database();
    const ts = nowTs();

    // 1 · Verificar token
    const tokenSnap = await db.ref(`admin/familyTokens/${token}`).get();
    if (!tokenSnap.exists()) {
      throw new HttpsError("not-found", "Token no encontrado. Comprueba que lo has escrito bien.");
    }
    const tokenData = asObject(tokenSnap.val());

    if ((tokenData.mode || "initial") !== "initial") {
      throw new HttpsError("failed-precondition", "Este token no corresponde a una activación inicial.");
    }
    if (tokenData.status && tokenData.status !== "available") {
      throw new HttpsError("already-exists", "Este token ya fue usado o ya no está disponible.");
    }
    if (tokenData.assignedEmail) {
      throw new HttpsError("permission-denied", "Este regalo está reservado a un email concreto. Contacta con El Taller de Memorias.");
    }

    // 2 · Verificar asset
    const assetSnap = await db.ref(`admin/assets/${aid}`).get();
    if (!assetSnap.exists()) {
      throw new HttpsError("not-found", "Esta pieza no tiene identificador válido. Reprograma el NFC antes de entregarla.");
    }
    const assetData = asObject(assetSnap.val());

    if ((assetData.productType || "").toUpperCase() !== "ONE") {
      throw new HttpsError("failed-precondition", "La pieza identificada no corresponde a un TO-K ONE.");
    }
    if (assetData.familyId || assetData.status === "active") {
      throw new HttpsError("already-exists", "Este TO-K ONE ya fue activado anteriormente.");
    }
    if (tokenData.orderId && assetData.orderId && tokenData.orderId !== assetData.orderId) {
      throw new HttpsError("failed-precondition", "El token no corresponde a esta pieza. Usa el token que viene con este llavero.");
    }

    // 3 · Crear familia y escribir todo atómicamente
    const familyRef = db.ref("familias").push();
    const fid = familyRef.key;
    const updates = {};

    updates[`familias/${fid}/meta`] = {
      fid, status: "active", ownerUid: null, ownerEmail: null,
      createdFromToken: token, createdFromAid: aid, createdFromProduct: "ONE",
      createdAt: ts, updatedAt: ts,
    };
    updates[`familias/${fid}/hogar`] = {
      nombre: "Mi hogar TO-K", emoji: "🏠", tema: "dia",
      wifi: { ssid: "", pass: "", type: "WPA" },
      redirect: "", creadoDesde: "ONE", fechaCreacion: ts,
    };
    updates[`familias/${fid}/miembros/${mid}`] = {
      nombre: "", bio: "", foto: "", pin: "1234", sesion_min: 0, tema: "dia",
      mostrar: { wifi: false, tel: false, wa: false, tg: false, email: false, ig: false, tt: false, web: false },
      wifi: { ssid: "", pass: "", type: "WPA" },
      contactos: { tel: "", wa: "", tg: "", email: "" },
      redes: { ig: "", tt: "", web: "" },
      ice: { sangre: "", alergias: "", condiciones: "", tel_emergencia: "" },
    };
    updates[`familias/${fid}/assets/${aid}`] = {
      aid, productType: "ONE", status: "active", linkedMid: mid, linkedMidType: "person",
      orderId: assetData.orderId || tokenData.orderId || null,
      packId: assetData.packId || tokenData.packId || null,
      addedAt: ts, activatedAt: ts,
    };
    updates[`admin/familyTokens/${token}`] = {
      ...tokenData, familyId: fid, status: "redeemed",
      redeemedByUid: null, redeemedAt: ts, updatedAt: ts,
    };
    updates[`admin/assets/${aid}`] = {
      ...assetData, familyId: fid, linkedMid: mid, linkedMidType: "person",
      mid, status: "active", activatedAt: ts, updatedAt: ts,
    };
    updates[`assetIndex/${aid}`] = {
      fid, productType: "ONE", status: "active", linkedMid: mid, updatedAt: ts,
    };
    if (tokenData.orderId) {
      updates[`admin/orders/${tokenData.orderId}/familyId`]   = fid;
      updates[`admin/orders/${tokenData.orderId}/status`]     = "redeemed";
      updates[`admin/orders/${tokenData.orderId}/updatedAt`]  = ts;
      updates[`admin/pedidos/${tokenData.orderId}/familyId`]  = fid;
      updates[`admin/pedidos/${tokenData.orderId}/estado`]    = "activado";
      updates[`admin/pedidos/${tokenData.orderId}/updatedAt`] = ts;
    }
    if (tokenData.packId) {
      updates[`admin/packs/${tokenData.packId}/familyId`]  = fid;
      updates[`admin/packs/${tokenData.packId}/updatedAt`] = ts;
    }
    updates[`activaciones/${token}`] = {
      usado: true, modo: "initial", familyId: fid, aid, mid,
      orderId: tokenData.orderId || assetData.orderId || null,
      fecha_activacion: new Date(ts).toISOString(),
      fecha_creacion: tokenData.createdAt
        ? new Date(tokenData.createdAt).toISOString()
        : new Date(ts).toISOString(),
    };

    await db.ref().update(updates);
    logger.info("[activarToken] Familia creada.", { token, aid, mid, fid });
    return { fid, mid };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
exports.sendFamilyAlertWhatsApp = onValueCreated(
  {
    region: REGION,
    ref: "/familias/{fid}/alertas/{alertId}",
    ...(TOK_DATABASE_INSTANCE ? { instance: TOK_DATABASE_INSTANCE } : {}),
  },
  async (event) => {
    const runtimeSettings = getRuntimeWhatsAppSettings();
    if (!runtimeSettings.triggerEnabled) return null;

    const status = getWhatsAppRuntimeStatus(runtimeSettings);
    if (!status.ready) {
      logger.warn("[WhatsApp] Trigger activo pero la API no está configurada.", status);
      return null;
    }

    const familyId = String(event.params?.fid || "").trim().toUpperCase();
    const alertId = String(event.params?.alertId || "").trim();
    const alert = asObject(event.data.val());
    if (!familyId || !alertId || !alert.tipo) {
      logger.warn("[WhatsApp] Evento de alerta incompleto; se omite.", { familyId, alertId });
      return null;
    }

    let meta = {};
    let home = {};
    let members = {};
    if (!TOK_SKIP_FAMILY_LOOKUPS) {
      const db = admin.database();
      const [metaSnap, homeSnap, membersSnap] = await Promise.all([
        db.ref(`familias/${familyId}/meta`).get(),
        db.ref(`familias/${familyId}/hogar`).get(),
        db.ref(`familias/${familyId}/miembros`).get(),
      ]);

      meta = asObject(metaSnap.val());
      home = asObject(homeSnap.val());
      members = asObject(membersSnap.val());
    }
    const config = resolveFamilyWhatsAppConfig(meta, home, members, runtimeSettings);

    if (!config.enabled) {
      logger.info("[WhatsApp] Alertas automáticas desactivadas para la familia.", { familyId, alertId });
      return null;
    }
    if (!config.to) {
      logger.warn("[WhatsApp] No hay número destino configurado para la familia.", { familyId, alertId });
      return null;
    }
    if (config.sendOnlyTypes.length && !config.sendOnlyTypes.includes(normalizeAlertType(alert.tipo))) {
      logger.info("[WhatsApp] Tipo de alerta omitido por configuración.", {
        familyId,
        alertId,
        tipo: alert.tipo,
      });
      return null;
    }

    try {
      let response;
      if (config.mode === "template") {
        if (!config.templateName) {
          logger.warn("[WhatsApp] La familia pide modo plantilla pero no hay templateName resuelto.", {
            familyId,
            alertId,
          });
          return null;
        }
        response = await sendWhatsAppTemplateMessage(
          config.to,
          config.templateName,
          config.templateLanguageCode,
          buildAlertTemplateParameters(familyId, home, alert),
          runtimeSettings
        );
      } else {
        response = await sendWhatsAppTextMessage(
          config.to,
          buildAlertWhatsAppText(familyId, home, alert),
          runtimeSettings
        );
      }

      logger.info("[WhatsApp] Alerta enviada correctamente.", {
        familyId,
        alertId,
        tipo: alert.tipo,
        to: maskPhoneNumber(config.to),
        mode: config.mode,
        messageId: getWhatsAppMessageId(response),
      });
    } catch (error) {
      logger.error("[WhatsApp] Falló el envío automático de la alerta.", {
        familyId,
        alertId,
        tipo: alert.tipo,
        to: maskPhoneNumber(config.to),
        errorMessage: error?.message || String(error),
        errorStack: error?.stack || null,
      });
    }

    return null;
  }
);