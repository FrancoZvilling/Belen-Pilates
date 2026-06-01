import { doc, runTransaction, writeBatch, collection, getDoc, setDoc } from 'firebase/firestore';
// import { db } from '../config/firebase'; // Uncomment when firebase is configured

/**
 * Cancela una clase con anticipación y otorga 1 crédito.
 * @param {Object} db - Firestore
 * @param {string} uid - ID del alumno
 * @param {string} idTurno - ID de la clase en formato "YYYY-MM-DD_HH:MM"
 */
export const cancelarClaseAnticipada = async (db, uid, idTurno) => {
  const userRef = doc(db, 'usuarios', uid);
  try {
    const result = await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error("Usuario no encontrado");

      const data = userDoc.data();
      const creditos = data.creditos_recuperacion || 0;
      const creditosUsados = data.creditos_usados_este_mes || 0;
      const clasesRestantes = data.clases_restantes ?? 0;
      const canceladas = data.clases_canceladas || [];
      const esExtra = data.clases_extra?.includes(idTurno);

      if (!esExtra && clasesRestantes <= 0) {
        throw new Error("No tienes clases restantes para descontar.");
      }

      if (canceladas.includes(idTurno)) {
        throw new Error("Ya cancelaste esta clase.");
      }

      let otorgarCredito = false;
      let nuevosCreditosUsados = creditosUsados;
      if (creditosUsados < 2) {
        otorgarCredito = true;
        nuevosCreditosUsados += 1;
      }

      const updateData = {
        creditos_recuperacion: creditos + (otorgarCredito ? 1 : 0),
        creditos_usados_este_mes: nuevosCreditosUsados,
        clases_canceladas: [...canceladas, idTurno]
      };

      if (!esExtra) {
        updateData.clases_restantes = clasesRestantes - 1;
      }

      transaction.update(userRef, updateData);
      return otorgarCredito;
    });
    return { success: true, otorgarCredito: result };
  } catch (error) {
    console.error("Error al cancelar anticipadamente:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Recupera una clase usando un crédito disponible.
 * @param {Object} db - Firestore
 * @param {string} uid - ID del alumno
 * @param {string} idTurnoDestino - ID de la clase elegida "YYYY-MM-DD_HH:MM"
 */
export const recuperarClase = async (db, uid, idTurnoDestino) => {
  const userRef = doc(db, 'usuarios', uid);
  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error("Usuario no encontrado");

      const data = userDoc.data();
      const creditos = data.creditos_recuperacion || 0;
      const extras = data.clases_extra || [];

      if (creditos <= 0) {
        throw new Error("No tienes créditos de recuperación.");
      }
      if (extras.includes(idTurnoDestino)) {
        throw new Error("Ya estás anotado en esta clase.");
      }

      transaction.update(userRef, {
        creditos_recuperacion: creditos - 1,
        clases_extra: [...extras, idTurnoDestino]
      });
    });
    return { success: true };
  } catch (error) {
    console.error("Error al recuperar clase:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Intercambia un turno sin modificar los créditos (Cancela el viejo y toma el nuevo a la vez).
 * @param {Object} db - Instancia de Firestore
 * @param {string} uid - ID del usuario
 * @param {string} idTurnoDestino - ID del nuevo turno "YYYY-MM-DD_HH:MM"
 * @param {string} idTurnoOrigen - ID del turno viejo "YYYY-MM-DD_HH:MM"
 */
export const intercambiarTurno = async (db, uid, idTurnoDestino, idTurnoOrigen) => {
  const userRef = doc(db, 'usuarios', uid);

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error("Usuario no encontrado");

      const data = userDoc.data();
      const canceladas = data.clases_canceladas || [];
      const extras = data.clases_extra || [];

      if (canceladas.includes(idTurnoOrigen)) {
        throw new Error("Ya cancelaste el turno de origen anteriormente.");
      }
      if (extras.includes(idTurnoDestino)) {
        throw new Error("Ya estás anotado en el turno de destino.");
      }

      transaction.update(userRef, {
        clases_canceladas: [...canceladas, idTurnoOrigen],
        clases_extra: [...extras, idTurnoDestino]
      });
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
      const esExtra = data.clases_extra?.includes(`${fechaIsoString}_${horaTurno}`);
      
      if (!esExtra && clasesRestantes <= 0) {
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

      const updateData = {
        historial_asistencias: [...historial, nuevoRegistro]
      };

      if (!esExtra) {
        updateData.clases_restantes = clasesRestantes - 1;
      }

      transaction.update(userRef, updateData);
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
      const creditosUsados = data.creditos_usados_este_mes || 0;
      const clasesRestantes = data.clases_restantes ?? 0;
      const esExtra = data.clases_extra?.includes(`${fechaIsoString}_${horaTurno}`);

      if (!esExtra && clasesRestantes <= 0) {
        throw new Error("No tienes clases restantes para descontar.");
      }

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

      let otorgarCredito = false;
      let nuevosCreditosUsados = creditosUsados;
      if (creditosUsados < 2) {
        otorgarCredito = true;
        nuevosCreditosUsados += 1;
      }

      const updateData = {
        creditos_recuperacion: creditos + (otorgarCredito ? 1 : 0),
        creditos_usados_este_mes: nuevosCreditosUsados,
        historial_asistencias: [...historial, nuevoRegistro]
      };

      if (!esExtra) {
        updateData.clases_restantes = clasesRestantes - 1;
      }

      transaction.update(userRef, updateData);
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

/**
 * Barrido Perezoso (Lazy Sweep) para inasistencias automáticas.
 * Busca clases pasadas (más de 1h) en el día actual que no tengan presente ni ausente,
 * y les asigna "ausente" descontando la clase sin dar créditos.
 */
export const ejecutarBarridoInasistencias = async (db, usuariosActivos) => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const argDate = new Date(utc + (3600000 * -3));

  const dayIndex = argDate.getDay();
  const diasMapLargo = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const todayStringLargo = diasMapLargo[dayIndex];
  
  const fechaIsoString = `${argDate.getFullYear()}-${String(argDate.getMonth()+1).padStart(2,'0')}-${String(argDate.getDate()).padStart(2,'0')}`;
  const currentHourDecimal = argDate.getHours() + (argDate.getMinutes() / 60);

  const batch = writeBatch(db);
  let modificaciones = 0;

  for (const usuario of usuariosActivos) {
    if (usuario.rol !== 'alumno') continue;

    const clasesDeHoy = usuario.turnos_fijos?.filter(t => t.dia === todayStringLargo) || [];
    if (clasesDeHoy.length === 0) continue;

    let clasesRestantes = usuario.clases_restantes ?? 0;
    let historial = [...(usuario.historial_asistencias || [])];
    let userModified = false;

    for (const clase of clasesDeHoy) {
      const classHourInt = parseInt(clase.hora.split(':')[0]);
      
      // Si ya pasó 1 HORA desde el comienzo de la clase
      if (currentHourDecimal >= classHourInt + 1) {
        
        // Verificar si ya hay un registro (presente o ausente) para esta clase hoy
        const yaRegistrado = historial.some(h => h.fecha === fechaIsoString && h.hora === clase.hora);
        
        if (!yaRegistrado && clasesRestantes > 0) {
          // Si no está registrado y tiene clases, le clavamos el ausente automático
          historial.push({
            fecha: fechaIsoString,
            hora: clase.hora,
            estado: 'ausente',
            motivo: 'automatico_lazy_sweep',
            timestamp: new Date().toISOString()
          });
          clasesRestantes -= 1;
          userModified = true;
        }
      }
    }

    if (userModified) {
      const userRef = doc(db, 'usuarios', usuario.id);
      batch.update(userRef, {
        clases_restantes: clasesRestantes,
        historial_asistencias: historial
      });
      modificaciones++;
    }
  }

  if (modificaciones > 0) {
    try {
      await batch.commit();
      console.log(`[Lazy Sweep] Se aplicaron ${modificaciones} inasistencias automáticas.`);
    } catch (error) {
      console.error("[Lazy Sweep] Error al ejecutar el batch:", error);
    }
  }
};

// ============================================================================
// MODULO DE PAGOS Y FACTURACIÓN
// ============================================================================

/**
 * Registra un pago para un alumno, extiende su vencimiento 30 días y guarda el recibo.
 * @param {Object} db - Firestore
 * @param {string} uid - ID del alumno
 * @param {number} monto - Monto abonado
 * @param {string} nombreAdmin - Nombre del admin que cobra
 */
export const registrarPagoAlumno = async (db, uid, monto, nombreAdmin = "Admin") => {
  const userRef = doc(db, 'usuarios', uid);
  const nuevoPagoRef = doc(collection(db, 'pagos_historial'));

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error("Usuario no encontrado");

      const data = userDoc.data();
      let nuevoVencimiento = new Date();
      
      // Si ya tiene vencimiento y es futuro, le sumamos 30 días a ese. Si está vencido, le sumamos 30 días a HOY.
      if (data.vencimiento_pago) {
        const vencimientoActual = new Date(data.vencimiento_pago + 'T12:00:00Z');
        if (vencimientoActual > new Date()) {
          nuevoVencimiento = vencimientoActual;
        }
      }
      
      nuevoVencimiento.setDate(nuevoVencimiento.getDate() + 30);
      
      // Formato YYYY-MM-DD
      const mesAbonadoStr = `${nuevoVencimiento.getFullYear()}-${String(nuevoVencimiento.getMonth() + 1).padStart(2, '0')}-${String(nuevoVencimiento.getDate()).padStart(2, '0')}`;

      // 1. Actualizar usuario
      // Al pagar se reinician las clases restantes. Asumimos 8 o 12 según su plan
      const clasesNuevas = data.plan || 8; 

      transaction.update(userRef, {
        vencimiento_pago: mesAbonadoStr,
        clases_restantes: clasesNuevas,
        creditos_recuperacion: 0,
        creditos_usados_este_mes: 0,
        clases_canceladas: [],
        clases_extra: []
      });

      // 2. Registrar el historial financiero
      transaction.set(nuevoPagoRef, {
        alumnoId: uid,
        alumnoNombre: data.nombre,
        monto: monto,
        fecha_pago: new Date().toISOString(),
        vencimiento_otorgado: mesAbonadoStr,
        registrado_por: nombreAdmin
      });
    });
    return { success: true };
  } catch (error) {
    console.error("Error al registrar pago:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Actualiza los precios globales de los planes.
 * @param {Object} db - Firestore
 * @param {Object} nuevosPrecios - { plan_8_clases: 15000, plan_12_clases: 20000 }
 */
export const actualizarPrecios = async (db, nuevosPrecios) => {
  const configRef = doc(db, 'configuracion', 'precios');
  try {
    await setDoc(configRef, nuevosPrecios, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar precios:", error);
    return { success: false, error: error.message };
  }
};
