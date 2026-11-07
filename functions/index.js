const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { sendWhatsAppMessage } = require('./wasender');

initializeApp();
setGlobalOptions({ region: 'southamerica-east1' });

exports.sendPushNotification = onDocumentCreated('notificaciones/{docId}', async (event) => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data();

  try {
    const db = getFirestore();
    const tokens = [];
    
    if (data.usuarioId === 'admin') {
      const usersSnap = await db.collection('usuarios')
        .where('rol', '==', 'superadmin')
        .get();

      if (!usersSnap.empty) {
        usersSnap.forEach((doc) => {
          const user = doc.data();
          if (user.fcmToken) tokens.push(user.fcmToken);
        });
      }

      // Si es una inasistencia, también se la enviamos a los profesores (admin)
      if (data.tipo === 'inasistencia') {
        const adminSnap = await db.collection('usuarios')
          .where('rol', '==', 'admin')
          .get();
        if (!adminSnap.empty) {
          adminSnap.forEach((doc) => {
            const user = doc.data();
            if (user.fcmToken) tokens.push(user.fcmToken);
          });
        }
      }
    } else {
      const userDoc = await db.collection('usuarios').doc(data.usuarioId).get();
      if (userDoc.exists) {
        const user = userDoc.data();
        if (user.fcmToken) tokens.push(user.fcmToken);
      }
    }

    if (tokens.length === 0) {
      console.log('No FCM tokens found for target.');
      return;
    }

    const payload = {
      data: {
        title: data.titulo || 'Nueva Notificación',
        body: (data.mensaje || 'Tienes una nueva notificación en el sistema.').replace(/\*\*/g, ''),
        tipo: data.tipo || 'info',
      }
    };

    const response = await getMessaging().sendEachForMulticast({
      tokens: tokens,
      data: payload.data,
    });
    console.log('Notifications sent:', response.successCount);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
});

/**
 * Disparador automático al registrar un pago en pagos_historial.
 * Envía automáticamente la confirmación por WhatsApp al alumno.
 */
exports.onPagoRegistradoWhatsApp = onDocumentCreated('pagos_historial/{docId}', async (event) => {
  const snap = event.data;
  if (!snap) return;

  const pago = snap.data();
  if (!pago || !pago.alumnoId) return;

  try {
    const db = getFirestore();
    const userDoc = await db.collection('usuarios').doc(pago.alumnoId).get();
    if (!userDoc.exists) return;

    const user = userDoc.data();
    if (!user.telefono) {
      console.log(`[Pago WP] El alumno ${pago.alumnoNombre || pago.alumnoId} no tiene teléfono registrado.`);
      return;
    }

    // Idempotencia: Verificar que no se haya enviado ya para este comprobante
    const logId = `pago_${event.params.docId}`;
    const logRef = db.collection('whatsapp_logs').doc(logId);
    const logSnap = await logRef.get();
    if (logSnap.exists) {
      console.log(`[Pago WP] Ya se envió comprobante de WhatsApp para el pago ${event.params.docId}`);
      return;
    }

    const primerNombre = (user.nombre || pago.alumnoNombre || 'Hola').trim().split(' ')[0];
    
    // Formatear vencimiento otorgado a DD-MM-YYYY
    let fechaVencArg = pago.vencimiento_otorgado || '';
    if (fechaVencArg.includes('-')) {
      const parts = fechaVencArg.split('-');
      if (parts.length === 3) fechaVencArg = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    const montoFormateado = (pago.monto || 0).toLocaleString('es-AR');

    const mensaje = `¡Muchas gracias por tu pago, ${primerNombre}! 🌸\n\nRegistramos con éxito tu abono de $${montoFormateado}.\nTus clases se han renovado y tu próximo vencimiento será el ${fechaVencArg}.\n\n¡Nos vemos en Loto Pilates!`;

    const res = await sendWhatsAppMessage(user.telefono, mensaje);

    await logRef.set({
      usuarioId: pago.alumnoId,
      pagoId: event.params.docId,
      nombre: user.nombre || pago.alumnoNombre || '',
      telefono: user.telefono,
      tipo: 'pago_recibido',
      timestamp: new Date().toISOString(),
      exito: res.success,
      error: res.error || null
    });
  } catch (error) {
    console.error('[Pago WP] Error al enviar WhatsApp de confirmación de pago:', error);
  }
});

Object.assign(exports, require('./cron.js'));
