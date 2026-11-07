/**
 * Módulo de integración con WasenderAPI para Loto Pilates.
 * Limpieza estricta de teléfonos argentinos y envío seguro de mensajes.
 */

function sanitizeArgentinePhone(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  // Si empieza con prefijo internacional argentino
  if (digits.startsWith('549')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('54')) {
    digits = digits.slice(2);
    if (digits.startsWith('9')) digits = digits.slice(1);
  }

  // Quitar el 0 de prefijo de larga distancia si está presente
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Si tiene exactamente 10 dígitos (ej: 3541225588 o 1122334455), es válido directo
  if (digits.length === 10) {
    return '549' + digits;
  }

  // Si tiene 12 dígitos e incluye '15' correspondiente a celulares locales (prefijo móvil)
  if (digits.length === 12) {
    // Código de área de 2 dígitos (ej: 11 15 xxxxxxxx)
    if (digits.slice(2, 4) === '15') {
      const res = digits.slice(0, 2) + digits.slice(4);
      if (res.length === 10) return '549' + res;
    }
    // Código de área de 3 dígitos (ej: 351 15 xxxxxxx)
    if (digits.slice(3, 5) === '15') {
      const res = digits.slice(0, 3) + digits.slice(5);
      if (res.length === 10) return '549' + res;
    }
    // Código de área de 4 dígitos (ej: 3541 15 xxxxxx)
    if (digits.slice(4, 6) === '15') {
      const res = digits.slice(0, 4) + digits.slice(6);
      if (res.length === 10) return '549' + res;
    }
  }

  return null;
}

/**
 * Envía un mensaje de texto por WhatsApp a través de WasenderAPI.
 * @param {string} rawPhone - Número de teléfono tal cual está guardado en la base de datos
 * @param {string} text - Contenido del mensaje de texto
 * @returns {Promise<{success: boolean, error?: string, data?: any}>}
 */
async function sendWhatsAppMessage(rawPhone, text) {
  const sanitized = sanitizeArgentinePhone(rawPhone);
  if (!sanitized) {
    console.warn(`[Wasender] Teléfono inválido o incompleto: "${rawPhone}"`);
    return { success: false, error: 'Número de teléfono inválido o incompleto' };
  }

  const apiKey = process.env.WASENDER_API_KEY;
  const apiUrl = process.env.WASENDER_API_URL || 'https://www.wasenderapi.com/api/send-message';

  if (!apiKey) {
    console.error('[Wasender] Falta configurar WASENDER_API_KEY en variables de entorno.');
    return { success: false, error: 'Falta clave de API de WhatsApp' };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        to: sanitized,
        text: text
      })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error('[Wasender] Error devuelto por WasenderAPI:', response.status, data);
      return { success: false, status: response.status, data };
    }

    console.log(`[Wasender] Mensaje enviado correctamente a ${sanitized}`);
    return { success: true, data };
  } catch (error) {
    console.error('[Wasender] Error de red o conexión al enviar WhatsApp:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sanitizeArgentinePhone,
  sendWhatsAppMessage
};
