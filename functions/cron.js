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
  schedule: '0 * * * *', // Every hour at minute 0
  timeZone: 'America/Argentina/Buenos_Aires'
}, async (event) => {
  const db = getFirestore();
  const d = new Date();
  
  const utc3Time = new Date(d.getTime() - (3 * 3600000));
  
  const t4 = new Date(utc3Time.getTime() + (4 * 3600000));
  const t4Date = `${t4.getUTCFullYear()}-${String(t4.getUTCMonth()+1).padStart(2,'0')}-${String(t4.getUTCDate()).padStart(2,'0')}`;
  const t4Hour = `${String(t4.getUTCHours()).padStart(2,'0')}:00`;

  const t24 = new Date(utc3Time.getTime() + (24 * 3600000));
  const t24Date = `${t24.getUTCFullYear()}-${String(t24.getUTCMonth()+1).padStart(2,'0')}-${String(t24.getUTCDate()).padStart(2,'0')}`;
  const t24Hour = `${String(t24.getUTCHours()).padStart(2,'0')}:00`;

  const diasMapLargo = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const t4DayStr = diasMapLargo[t4.getUTCDay()];
  const t24DayStr = diasMapLargo[t24.getUTCDay()];

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
        { type: '4h', date: t4Date, hour: t4Hour, dayStr: t4DayStr, timeObj: t4 },
        { type: '24h', date: t24Date, hour: t24Hour, dayStr: t24DayStr, timeObj: t24 }
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
          let mensaje = t.type === '4h' 
            ? `Recordá que tenés clase HOY a las ${t.hour} hs.` 
            : `Recordá que tenés clase MAÑANA a las ${t.hour} hs.`;

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
