const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");

exports.dailyPaymentReminders = onSchedule({
  schedule: '0 9 * * *', // 9:00 AM every day
  timeZone: 'America/Argentina/Buenos_Aires'
}, async (event) => {
  const db = getFirestore();
  const hoyUtc3 = new Date(new Date().getTime() - (3 * 3600000));
  hoyUtc3.setUTCHours(0,0,0,0);

  try {
    const usersSnap = await db.collection('usuarios')
      .where('rol', '==', 'alumno')
      .where('estado', '==', 'activo')
      .get();

    const batch = db.batch();
    let notifsAdded = 0;

    usersSnap.forEach((docSnap) => {
      const user = docSnap.data();
      if (!user.vencimiento_pago) return;

      const venc = new Date(user.vencimiento_pago + 'T12:00:00Z');
      const vencUtc3 = new Date(venc.getTime() - (3 * 3600000));
      vencUtc3.setUTCHours(0,0,0,0);

      const diffDays = Math.round((vencUtc3.getTime() - hoyUtc3.getTime()) / (1000 * 60 * 60 * 24));

      let titulo = null;
      let mensaje = null;

      if (diffDays === 7) {
        titulo = "Aviso de Vencimiento";
        mensaje = "Tu mes de clases vence en 1 semana. Recordá abonar para mantener tu cupo.";
      } else if (diffDays === 3) {
        titulo = "Aviso de Vencimiento";
        mensaje = "Tu mes de clases vence en 3 días.";
      } else if (diffDays === 0) {
        titulo = "Mes Vencido";
        mensaje = "Tu mes de clases vence HOY. Por favor, regularizá tu pago para renovar tus clases.";
      }

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
    });

    if (notifsAdded > 0) {
      await batch.commit();
      console.log(`[Cron] Se crearon ${notifsAdded} notificaciones de pago.`);
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
