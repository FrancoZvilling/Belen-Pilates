const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
admin.initializeApp();

setGlobalOptions({ region: 'southamerica-east1' });

exports.sendPushNotification = onDocumentCreated('notificaciones/{docId}', async (event) => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data();

  if (data.usuarioId !== 'admin') {
    return;
  }

  try {
    const db = admin.firestore();
    
    const usersSnap = await db.collection('usuarios')
      .where('rol', '==', 'superadmin')
      .get();

    if (usersSnap.empty) {
      console.log('No superadmins found.');
      return;
    }

    const tokens = [];
    usersSnap.forEach((doc) => {
      const user = doc.data();
      if (user.fcmToken) {
        tokens.push(user.fcmToken);
      }
    });

    if (tokens.length === 0) {
      console.log('No FCM tokens found for superadmins.');
      return;
    }

    const payload = {
      notification: {
        title: data.titulo || 'Nueva Notificación',
        body: data.mensaje || 'Tienes una nueva notificación en el sistema.',
      },
      data: {
        tipo: data.tipo || 'info',
      }
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens: tokens,
      notification: payload.notification,
      data: payload.data,
    });
    console.log('Notifications sent:', response.successCount);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
});

