import { doc, runTransaction } from 'firebase/firestore';
// import { db } from '../config/firebase'; // Uncomment when firebase is configured

/**
 * Intercambia un turno por otro.
 * @param {Object} db - Instancia de Firestore
 * @param {string} uid - ID del usuario
 * @param {string} idSesionNueva - ID de la sesión que quiere tomar
 * @param {string} idSesionVieja - ID de la sesión que va a dejar
 */
export const intercambiarTurno = async (db, uid, idSesionNueva, idSesionVieja) => {
  const userRef = doc(db, 'usuarios', uid);
  const sesionNuevaRef = doc(db, 'sesiones', idSesionNueva);
  const sesionViejaRef = doc(db, 'sesiones', idSesionVieja);

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const sesionNuevaDoc = await transaction.get(sesionNuevaRef);
      const sesionViejaDoc = await transaction.get(sesionViejaRef);

      if (!userDoc.exists() || !sesionNuevaDoc.exists() || !sesionViejaDoc.exists()) {
        throw new Error("Uno de los documentos no existe");
      }

      const sesionNuevaData = sesionNuevaDoc.data();
      const userProximosTurnos = userDoc.data().proximos_turnos || [];
      const alumnosAnotadosNueva = sesionNuevaData.alumnos_anotados || [];

      // 1. Validar que id_sesion_nueva tenga cupo
      const capacidadMax = sesionNuevaData.capacidad_max || 8;
      if (alumnosAnotadosNueva.length >= capacidadMax) {
        throw new Error("La sesión nueva ya está llena");
      }

      // 2. Remover al UID del alumno de alumnos_anotados en id_sesion_a_abandonar
      const alumnosAnotadosVieja = sesionViejaDoc.data().alumnos_anotados || [];
      const nuevosAnotadosVieja = alumnosAnotadosVieja.filter(id => id !== uid);
      transaction.update(sesionViejaRef, { alumnos_anotados: nuevosAnotadosVieja });

      // 3. Agregar al UID del alumno en alumnos_anotados de id_sesion_nueva
      transaction.update(sesionNuevaRef, { 
        alumnos_anotados: [...alumnosAnotadosNueva, uid] 
      });

      // 4. Actualizar el array proximos_turnos en el documento del usuario
      const nuevosProximosTurnos = userProximosTurnos.filter(id => id !== idSesionVieja);
      nuevosProximosTurnos.push(idSesionNueva);
      transaction.update(userRef, { proximos_turnos: nuevosProximosTurnos });

      // Nota: No se descuentan clases del contador.
    });
    return { success: true };
  } catch (error) {
    console.error("Error al intercambiar turno:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Marca la asistencia de un alumno (Resta clase y guarda en historial)
 */
export const marcarAsistencia = async (db, uid, idSesion) => {
  const userRef = doc(db, 'usuarios', uid);
  const historialRef = doc(db, 'historial_asistencias', `${uid}_${Date.now()}`);

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error("Usuario no encontrado");

      const clasesRestantes = userDoc.data().clases_restantes_mes || 0;
      if (clasesRestantes <= 0) {
        throw new Error("No tienes clases restantes este mes");
      }

      transaction.update(userRef, { clases_restantes_mes: clasesRestantes - 1 });
      
      transaction.set(historialRef, {
        alumno: uid,
        fecha: new Date().toISOString(),
        idSesion: idSesion
      });
    });
    return { success: true };
  } catch (error) {
    console.error("Error al marcar asistencia:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Cancela el turno devolviendo un crédito de recuperación.
 */
export const cancelarConAnticipacion = async (db, uid, idSesion) => {
  const userRef = doc(db, 'usuarios', uid);
  const sesionRef = doc(db, 'sesiones', idSesion);

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const sesionDoc = await transaction.get(sesionRef);

      if (!userDoc.exists() || !sesionDoc.exists()) {
        throw new Error("Documento no encontrado");
      }

      // Remover de la sesión
      const anotados = sesionDoc.data().alumnos_anotados || [];
      transaction.update(sesionRef, { 
        alumnos_anotados: anotados.filter(id => id !== uid) 
      });

      // Sumar crédito y remover de próximos turnos
      const creditos = userDoc.data().creditos_recuperacion || 0;
      const proximos = userDoc.data().proximos_turnos || [];
      transaction.update(userRef, { 
        creditos_recuperacion: creditos + 1,
        proximos_turnos: proximos.filter(id => id !== idSesion)
      });
    });
    return { success: true };
  } catch (error) {
    console.error("Error al cancelar turno:", error);
    return { success: false, error: error.message };
  }
};
