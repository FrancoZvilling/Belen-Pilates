const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");
const { sendWhatsAppMessage } = require("./wasender");

exports.dailyPaymentReminders = onSchedule({
  schedule: '0 9 * * *', // 9:00 AM every day
  timeZone: 'America/Argentina/Buenos_Aires'
}, async (event) => {
  const db = getFirestore();
  const hoyUtc3 = new Date(new Date().getTime() - (3 * 3600000));
  hoyUtc3.setUTCHours(0,0,0,0);
  const hoyStr = `${hoyUtc3.getUTCFullYear()}-${String(hoyUtc3.getUTCMonth()+1).padStart(2,'0')}-${String(hoyUtc3.getUTCDate()).padStart(2,'0')}`;

  try {
    // 1. Obtener precios actualizados de la academia
    const configPreciosDoc = await db.collection('configuracion').doc('precios').get();
    const precios = configPreciosDoc.exists ? configPreciosDoc.data() : { plan_4_clases: 0, plan_8_clases: 0, plan_12_clases: 0 };

    const usersSnap = await db.collection('usuarios')
      .where('rol', '==', 'alumno')
      .where('estado', '==', 'activo')
      .get();

    const batch = db.batch();
    let notifsAdded = 0;
    const wpQueue = [];

    usersSnap.forEach((docSnap) => {
      const user = docSnap.data();
      if (!user.vencimiento_pago) return;

      const venc = new Date(user.vencimiento_pago + 'T12:00:00Z');
      const vencUtc3 = new Date(venc.getTime() - (3 * 3600000));
      vencUtc3.setUTCHours(0,0,0,0);

      const diffDays = Math.round((vencUtc3.getTime() - hoyUtc3.getTime()) / (1000 * 60 * 60 * 24));

      let titulo = null;
      let mensaje = null;
      let reminderType = null;
      let wpTexto = null;

      const primerNombre = (user.nombre || 'Hola').trim().split(' ')[0];
      const plan = user.plan || 8;
      const monto = (plan === 4 ? precios.plan_4_clases : (plan === 12 ? precios.plan_12_clases : precios.plan_8_clases)) || 0;
      const montoStr = monto.toLocaleString('es-AR');

      // Formatear vencimiento en DD-MM-YYYY
      const parts = user.vencimiento_pago.split('-');
      const fechaVencArg = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : user.vencimiento_pago;

      if (diffDays === 7) {
        titulo = "Aviso de Vencimiento";
        mensaje = "Tu mes de clases vence en 1 semana. Recordá abonar para mantener tu cupo.";
        reminderType = '7d';
        wpTexto = `¡Hola, ${primerNombre}! Esperamos que estés disfrutando tus clases en Loto Pilates. 🌸\n\nTe escribimos para recordarte que tu mes vence en una semana, el próximo ${fechaVencArg}.\n\nTu abono mensual (${plan} clases) es de $${montoStr}.\n\nSi querés renovar para asegurar tu horario el próximo mes, podés transferir a nuestro Alias: Belenpilates y enviarnos el comprobante por acá. ¡Muchas gracias!`;
      } else if (diffDays === 3) {
        titulo = "Aviso de Vencimiento";
        mensaje = "Tu mes de clases vence en 3 días.";
        reminderType = '3d';
        wpTexto = `¡Hola, ${primerNombre}! ¿Cómo estás? 🌸\n\nTe recordamos que tu cuota en Loto Pilates vence en 3 días (${fechaVencArg}).\n\nEl valor para renovar tu plan de ${plan} clases es de $${montoStr}.\nAlias para transferir: Belenpilates\n\nQuedamos a la espera de tu comprobante para mantener tu lugar reservado. ¡Te esperamos en clase!`;
      } else if (diffDays === 0) {
        titulo = "Mes Vencido";
        mensaje = "Tu mes de clases vence HOY. Por favor, regularizá tu pago para renovar tus clases.";
        reminderType = '0d';
        wpTexto = `¡Hola, ${primerNombre}! Te avisamos que tu mes de clases vence HOY (${fechaVencArg}). 🌸\n\nRecordá que para poder continuar asistiendo y mantener tus turnos fijos asignados, es necesario regularizar la cuota correspondiente a tu plan de ${plan} clases ($${montoStr}).\n\nAlias para transferir: Belenpilates\nPor favor, envianos el comprobante ni bien realices la transferencia para actualizar tu ficha. ¡Muchas gracias!`;
      }

      // 1. Notificación Push en la App
      if (titulo && mensaje) {
        const notifRef = db.collection('notificaciones').doc();
        batch.set(notifRef, {
          usuarioId: docSnap.id,
          tipo: diffDays === 0 ? 'vencido' : 'vencimiento_proximo',
          titulo: titulo,
          mensaje: mensaje,
          leida: false,
          fecha: new Date().toISOString()
        });
        notifsAdded++;
      }

      // 2. Notificación por WhatsApp
      if (wpTexto && user.telefono) {
        wpQueue.push({
          uid: docSnap.id,
          nombre: user.nombre,
          telefono: user.telefono,
          texto: wpTexto,
          reminderType: reminderType,
          hoyStr: hoyStr
        });
      }
    });

    if (notifsAdded > 0) {
      await batch.commit();
      console.log(`[Cron] Se crearon ${notifsAdded} notificaciones push de pago.`);
    }

    // Procesar cola de WhatsApp de forma secuencial y protegida
    if (wpQueue.length > 0) {
      console.log(`[Cron WP] Procesando ${wpQueue.length} mensajes de WhatsApp pendientes...`);
      for (const item of wpQueue) {
        try {
          const logId = `${item.uid}_${item.hoyStr}_${item.reminderType}`;
          const logRef = db.collection('whatsapp_logs').doc(logId);
          const logSnap = await logRef.get();

          if (logSnap.exists) {
            console.log(`[Cron WP] Mensaje ya enviado hoy a ${item.nombre} (${logId})`);
            continue;
          }

          const res = await sendWhatsAppMessage(item.telefono, item.texto);

          await logRef.set({
            usuarioId: item.uid,
            nombre: item.nombre,
            telefono: item.telefono,
            tipo: item.reminderType,
            fecha: item.hoyStr,
            timestamp: new Date().toISOString(),
            exito: res.success,
            error: res.error || null
          });

          // Pausa de 1.5 segundos entre mensajes para cuidar la sesión de WhatsApp
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (itemErr) {
          console.error(`[Cron WP] Error al enviar mensaje individual a ${item.nombre}:`, itemErr);
        }
      }
      console.log(`[Cron WP] Finalizado envío de mensajes de WhatsApp.`);
    }
  } catch (error) {
    console.error("[Cron] Error en dailyPaymentReminders:", error);
  }
});

exports.hourlyClassReminders = onSchedule({
  schedule: '*/30 * * * *', // Every 30 minutes
  timeZone: 'America/Argentina/Buenos_Aires'
}, async (event) => {
  const db = getFirestore();
  const d = new Date();
  
  const utc3Time = new Date(d.getTime() - (3 * 3600000));
  
  const getTarget = (hoursAhead) => {
    const t = new Date(utc3Time.getTime() + (hoursAhead * 3600000));
    const tDate = `${t.getUTCFullYear()}-${String(t.getUTCMonth()+1).padStart(2,'0')}-${String(t.getUTCDate()).padStart(2,'0')}`;
    const tHour = `${String(t.getUTCHours()).padStart(2,'0')}:${String(t.getUTCMinutes()).padStart(2,'0')}`;
    return { t, tDate, tHour };
  };

  const tgt2 = getTarget(2);
  const tgt4 = getTarget(4);
  const tgt24 = getTarget(24);

  const diasMapLargo = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const t2DayStr = diasMapLargo[tgt2.t.getUTCDay()];
  const t4DayStr = diasMapLargo[tgt4.t.getUTCDay()];
  const t24DayStr = diasMapLargo[tgt24.t.getUTCDay()];

  try {
    const snapFeriados = await db.collection('feriados').get();
    const feriadosGlobales = snapFeriados.docs.map(doc => doc.id);

    const usersSnap = await db.collection('usuarios')
      .where('rol', '==', 'alumno')
      .where('estado', '==', 'activo')
      .get();

    const batch = db.batch();
    let notifsAdded = 0;

    usersSnap.forEach((docSnap) => {
      const user = docSnap.data();
      const canceladas = user.clases_canceladas || [];
      const extra = user.clases_extra || [];
      const fijos = user.turnos_fijos || user.turnosFijos || [];
      const feriadosUser = user.feriados_disfrutados || [];

      let vencDate = null;
      if (user.vencimiento_pago) {
        vencDate = new Date(user.vencimiento_pago + 'T12:00:00Z');
        vencDate = new Date(vencDate.getTime() - (3 * 3600000));
        vencDate.setUTCHours(0,0,0,0);
      }

      const targets = [
        { type: '2h', date: tgt2.tDate, hour: tgt2.tHour, dayStr: t2DayStr, timeObj: tgt2.t },
        { type: '4h', date: tgt4.tDate, hour: tgt4.tHour, dayStr: t4DayStr, timeObj: tgt4.t },
        { type: '24h', date: tgt24.tDate, hour: tgt24.tHour, dayStr: t24DayStr, timeObj: tgt24.t }
      ];

      for (let t of targets) {
        const idClase = `${t.date}_${t.hour}`;
        
        if (vencDate) {
          const tDateOnly = new Date(t.timeObj.getTime());
          tDateOnly.setUTCHours(0,0,0,0);
          if (tDateOnly.getTime() > vencDate.getTime()) continue;
        }

        let tieneClase = false;
        
        const esFijo = fijos.some(f => f.dia === t.dayStr && f.hora === t.hour);
        const esExtra = extra.includes(idClase);

        if (esExtra) {
          if (!feriadosGlobales.includes(t.date)) {
            tieneClase = true;
          }
        } else if (esFijo) {
          if (!canceladas.includes(idClase) && !feriadosGlobales.includes(t.date) && !feriadosUser.includes(t.date)) {
            tieneClase = true;
          }
        }

        if (tieneClase) {
          let titulo = "Recordatorio de Clase";
          let mensaje = "";
          
          if (t.type === '2h') {
            titulo = "Asistencia Habilitada";
            mensaje = `Ya podés marcar el presente a tu clase de las ${t.hour} hs. ¡Te esperamos!`;
          } else if (t.type === '4h') {
            mensaje = `Recordá que tenés clase HOY a las ${t.hour} hs.`;
          } else if (t.type === '24h') {
            mensaje = `Recordá que tenés clase MAÑANA a las ${t.hour} hs.`;
          }

          const notifRef = db.collection('notificaciones').doc();
          batch.set(notifRef, {
            usuarioId: docSnap.id,
            tipo: 'clase',
            titulo: titulo,
            mensaje: mensaje,
            leida: false,
            fecha: new Date().toISOString()
          });
          notifsAdded++;
        }
      }
    });

    if (notifsAdded > 0) {
      await batch.commit();
      console.log(`[Cron] Se crearon ${notifsAdded} recordatorios de clases.`);
    }
  } catch (error) {
    console.error("[Cron] Error en hourlyClassReminders:", error);
  }
});
