import { collection, addDoc, query, where, getDocs, updateDoc, doc, writeBatch, serverTimestamp } from 'firebase/firestore';

/**
 * Crea una notificación para un usuario específico.
 * @param {Object} db - Instancia de Firestore
 * @param {string} usuarioId - UID del alumno
 * @param {string} tipo - Tipo de notificación (ej: 'pago', 'inasistencia', 'feriado')
 * @param {string} titulo - Título de la notificación
 * @param {string} mensaje - Cuerpo del mensaje
 * @param {Object} batch - (Opcional) Instancia de writeBatch si se está usando una transacción/batch.
 */
export const crearNotificacion = async (db, usuarioId, tipo, titulo, mensaje, batch = null) => {
  const notificacionData = {
    usuarioId,
    tipo,
    titulo,
    mensaje,
    leida: false,
    fecha: new Date().toISOString(),
    timestamp: serverTimestamp()
  };

  try {
    if (batch) {
      const nuevaNotifRef = doc(collection(db, 'notificaciones'));
      batch.set(nuevaNotifRef, notificacionData);
    } else {
      await addDoc(collection(db, 'notificaciones'), notificacionData);
    }
  } catch (error) {
    console.error('Error al crear notificación:', error);
  }
};

/**
 * Marca todas las notificaciones de un usuario como leídas.
 * @param {Object} db - Instancia de Firestore
 * @param {string} usuarioId - UID del alumno
 */
export const marcarNotificacionesLeidas = async (db, usuarioId) => {
  try {
    const q = query(
      collection(db, 'notificaciones'),
      where('usuarioId', '==', usuarioId),
      where('leida', '==', false)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.forEach(docSnap => {
      batch.update(docSnap.ref, { leida: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error al marcar notificaciones como leídas:', error);
  }
};

/**
 * Borra una notificación específica.
 * @param {Object} db - Instancia de Firestore
 * @param {string} notifId - ID del documento de la notificación
 */
export const borrarNotificacion = async (db, notifId) => {
  try {
    const notifRef = doc(db, 'notificaciones', notifId);
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(notifRef);
  } catch (error) {
    console.error('Error al borrar notificación:', error);
  }
};

/**
 * Borra todas las notificaciones de un usuario.
 * @param {Object} db - Instancia de Firestore
 * @param {string} usuarioId - UID del alumno
 */
export const borrarTodasLasNotificaciones = async (db, usuarioId) => {
  try {
    const q = query(
      collection(db, 'notificaciones'),
      where('usuarioId', '==', usuarioId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error('Error al borrar todas las notificaciones:', error);
  }
};
