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
 * TODO: Mover la lógica original si hace falta, pero ahora usaremos la nueva.
 */
export const marcarAsistencia = async (db, uid, idSesion) => {
  // ... (keep this for legacy if needed, or we just leave it)
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
 * Nueva lógica de asistencia: Guarda en el array interno del usuario y resta clases_restantes
 */
export const registrarAsistenciaAlumno = async (db, uid, fechaIsoString, horaTurno) => {
  const userRef = doc(db, 'usuarios', uid);
  
  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error("Usuario no encontrado");

      const data = userDoc.data();
      const clasesRestantes = data.clases_restantes ?? 0;
      
      if (clasesRestantes <= 0) {
        throw new Error("No tienes clases restantes para descontar.");
      }

      const historial = data.historial_asistencias || [];
      
      // Para evitar dobles presentes en la misma clase
      const yaDioPresente = historial.some(h => h.fecha === fechaIsoString && h.hora === horaTurno);
      if (yaDioPresente) {
        throw new Error("Ya registraste tu asistencia para esta clase.");
      }

      const nuevoRegistro = {
        fecha: fechaIsoString,
        hora: horaTurno,
        estado: 'presente',
        timestamp: new Date().toISOString()
      };

      transaction.update(userRef, {
        clases_restantes: clasesRestantes - 1,
        historial_asistencias: [...historial, nuevoRegistro]
      });
    });
    return { success: true };
  } catch (error) {
    console.error("Error registrando asistencia:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Nueva lógica de inasistencia: Guarda en el array como 'ausente' y suma 1 a creditos_recuperacion
 */
export const registrarInasistenciaAlumno = async (db, uid, fechaIsoString, horaTurno) => {
  const userRef = doc(db, 'usuarios', uid);
  
  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error("Usuario no encontrado");

      const data = userDoc.data();
      const creditos = data.creditos_recuperacion ?? 0;

      const historial = data.historial_asistencias || [];
      
      // Para evitar dobles registros en la misma clase
      const yaRegistrado = historial.some(h => h.fecha === fechaIsoString && h.hora === horaTurno);
      if (yaRegistrado) {
        throw new Error("Ya hay un registro para esta clase.");
      }

      const nuevoRegistro = {
        fecha: fechaIsoString,
        hora: horaTurno,
        estado: 'ausente',
        timestamp: new Date().toISOString()
      };

      // Nota: NO restamos clases_restantes porque la inasistencia se canjea después.
      transaction.update(userRef, {
        creditos_recuperacion: creditos + 1,
        historial_asistencias: [...historial, nuevoRegistro]
      });
    });
    return { success: true };
  } catch (error) {
    console.error("Error registrando inasistencia:", error);
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
