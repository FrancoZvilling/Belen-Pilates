const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

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

Object.assign(exports, require('./cron.js'));
