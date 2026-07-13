import { doc, runTransaction, writeBatch, collection, getDoc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { crearNotificacion } from './notificacionesService';

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
      const creditosNormales = data.creditos_recuperacion || 0;
      const creditosFeriados = data.creditos_feriados_activos || [];
      const extras = data.clases_extra || [];

      // Filtrar créditos de feriado que no estén vencidos
      const hoy = new Date();
      // UTC-3 para comparar igual
      const utc = hoy.getTime() + (hoy.getTimezoneOffset() * 60000);
      const argDate = new Date(utc + (3600000 * -3));
      const hoyStr = `${argDate.getFullYear()}-${String(argDate.getMonth()+1).padStart(2,'0')}-${String(argDate.getDate()).padStart(2,'0')}`;
      
      const feriadosVigentes = creditosFeriados.filter(vto => vto >= hoyStr);
      const tieneFeriado = feriadosVigentes.length > 0;

      if (creditosNormales <= 0 && !tieneFeriado) {
        throw new Error("No tienes créditos disponibles para canjear.");
      }
      if (extras.includes(idTurnoDestino)) {
        throw new Error("Ya estás anotado en esta clase.");
      }

      let nuevosNormales = creditosNormales;
      let nuevosFeriados = [...feriadosVigentes];

      if (tieneFeriado) {
        // Consume el crédito de feriado que vence más pronto
        nuevosFeriados.sort();
        nuevosFeriados.shift();
      } else {
        nuevosNormales -= 1;
      }

      transaction.update(userRef, {
        creditos_recuperacion: nuevosNormales,
        creditos_feriados_activos: nuevosFeriados,
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
  let userName = "Un alumno";

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error("Usuario no encontrado");

      const data = userDoc.data();
      userName = `${data.nombre || ''} ${data.apellido || ''}`.trim() || "Un alumno";
      
      const canceladas = data.clases_canceladas || [];
      const extras = data.clases_extra || [];

      const clasesRestantes = data.clases_restantes ?? 0;

      if (canceladas.includes(idTurnoOrigen)) {
        throw new Error("Ya cancelaste el turno de origen anteriormente.");
      }
      if (extras.includes(idTurnoDestino)) {
        throw new Error("Ya estás anotado en el turno de destino.");
      }
      if (clasesRestantes <= 0) {
        throw new Error("No tienes clases suficientes para realizar este cambio.");
      }

      transaction.update(userRef, {
        clases_canceladas: [...canceladas, idTurnoOrigen],
        clases_extra: [...extras, idTurnoDestino],
        clases_restantes: clasesRestantes - 1
      });
    });

    try {
      const [fO, hO] = idTurnoOrigen.split('_');
      const [fD, hD] = idTurnoDestino.split('_');
      const [, mO, dO] = fO.split('-');
      const [, mD, dD] = fD.split('-');

      const adminMsg = `**${userName}** ha cambiado su horario del día **${dO}/${mO} a las ${hO} hs** por el día **${dD}/${mD} a las ${hD} hs**.`;
      
      await crearNotificacion(db, 'admin', 'cambio_turno', 'Cambio de Horario', adminMsg);
    } catch (notifErr) {
      console.error("Error al enviar notif a admin:", notifErr);
    }

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

  const currentHourDecimal = argDate.getHours() + (argDate.getMinutes() / 60);
  const diasMapLargo = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const batch = writeBatch(db);
  let modificaciones = 0;

  for (const usuario of usuariosActivos) {
    if (usuario.rol !== 'alumno') continue;

    let clasesRestantes = usuario.clases_restantes ?? 0;
    let historial = [...(usuario.historial_asistencias || [])];
    let userModified = false;
    let nuevasInasistencias = [];

    // Chequear los últimos 7 días (i=0 es hoy, i=7 hace una semana)
    for (let i = 0; i <= 7; i++) {
      const iterDate = new Date(argDate);
      iterDate.setDate(iterDate.getDate() - i);
      
      const dayIndex = iterDate.getDay();
      const iterStringLargo = diasMapLargo[dayIndex];
      const fechaIsoString = `${iterDate.getFullYear()}-${String(iterDate.getMonth()+1).padStart(2,'0')}-${String(iterDate.getDate()).padStart(2,'0')}`;
      
      const fijosDelDia = usuario.turnos_fijos?.filter(t => t.dia === iterStringLargo).map(t => ({ hora: t.hora, esExtra: false })) || [];
      const extrasDelDia = usuario.clases_extra?.filter(e => e.startsWith(fechaIsoString + '_')).map(e => ({ hora: e.split('_')[1], esExtra: true })) || [];
      
      const clasesDelDia = [...fijosDelDia, ...extrasDelDia];
      
      for (const clase of clasesDelDia) {
        const classHourInt = parseInt(clase.hora.split(':')[0]);
        
        let claseYaPaso = false;
        if (i === 0) {
          // Si es hoy, verificamos si ya pasó 1 HORA desde el comienzo de la clase
          if (currentHourDecimal >= classHourInt + 1) {
            claseYaPaso = true;
          }
        } else {
          // Si es un día anterior, la clase ya pasó definitivamente
          claseYaPaso = true;
        }

        if (claseYaPaso) {
          const idTurnoUnico = `${fechaIsoString}_${clase.hora}`;
          
          // Si es fijo, verificamos si fue cancelado o es feriado. Las extra no se pueden cancelar.
          if (!clase.esExtra) {
            if (usuario.clases_canceladas?.includes(idTurnoUnico)) continue;
            if (usuario.feriados_disfrutados?.includes(fechaIsoString)) continue;
          }
          
          // Verificar si ya hay un registro (presente o ausente) para esta clase
          const yaRegistrado = historial.some(h => h.fecha === fechaIsoString && h.hora === clase.hora);
          
          if (!yaRegistrado) {
            // Si es extra o le quedan clases, marcamos el ausente
            if (clase.esExtra || clasesRestantes > 0) {
              historial.push({
                fecha: fechaIsoString,
                hora: clase.hora,
                estado: 'ausente',
                motivo: 'automatico_lazy_sweep',
                timestamp: new Date().toISOString()
              });
              
              // Solo restamos clases_restantes si es turno fijo
              if (!clase.esExtra) {
                clasesRestantes -= 1;
              }
              userModified = true;
              nuevasInasistencias.push({ fecha: fechaIsoString, dia: iterStringLargo });
            }
          }
        }
      }
    }

    if (userModified) {
      const userRef = doc(db, 'usuarios', usuario.id);
      batch.update(userRef, {
        clases_restantes: clasesRestantes,
        historial_asistencias: historial
      });
      
      // Crear notificaciones individuales para cada inasistencia retroactiva o actual detectada
      for (const inasistencia of nuevasInasistencias) {
        const notifRef = doc(collection(db, 'notificaciones'));
        batch.set(notifRef, {
          usuarioId: usuario.id,
          tipo: 'inasistencia',
          titulo: 'Inasistencia Automática',
          mensaje: `Se ha registrado una inasistencia a tu clase del día ${inasistencia.dia} (${inasistencia.fecha}).`,
          leida: false,
          fecha: new Date().toISOString()
        });
      }
      
      modificaciones++;
    }
  }

  if (modificaciones > 0) {
    try {
      await batch.commit();
      console.log(`[Lazy Sweep] Se aplicaron inasistencias a ${modificaciones} usuarios.`);
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

      // 3. Crear notificación
      const notifRef = doc(collection(db, 'notificaciones'));
      transaction.set(notifRef, {
        usuarioId: uid,
        tipo: 'pago',
        titulo: 'Pago Recibido',
        mensaje: `Tu pago de $${monto} fue registrado exitosamente. Tu próximo vencimiento es el ${nuevoVencimiento.toLocaleDateString('es-AR')}.`,
        leida: false,
        fecha: new Date().toISOString()
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
 * @param {Object} nuevosPrecios - { plan_4_clases: 8000, plan_8_clases: 15000, plan_12_clases: 20000 }
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

/**
 * Declara un feriado y cancela las clases de ese día.
 * Al declarar feriado NO se otorgan créditos, simplemente el alumno pierde la clase.
 * @param {Object} db - Firestore
 * @param {string} fecha - Fecha del feriado 'YYYY-MM-DD'
 */
export const declararFeriado = async (db, fecha) => {
  try {
    // 1. Identificar el día de la semana
    const [year, month, day] = fecha.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const diasMapLargo = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diaSemana = diasMapLargo[dateObj.getDay()];

    if (['Domingo', 'Sábado'].includes(diaSemana)) {
      return { success: false, error: 'No se puede declarar feriado un fin de semana.' };
    }

    const batch = writeBatch(db);

    // 2. Comprobar si el feriado ya existe
    const feriadoRef = doc(db, 'feriados', fecha);
    const feriadoSnap = await getDoc(feriadoRef);
    if (feriadoSnap.exists()) {
      return { success: false, error: 'Este día ya ha sido declarado como feriado.' };
    }

    // Registrar el feriado en la colección 'feriados'
    batch.set(feriadoRef, {
      fecha,
      diaSemana,
      creadoEn: new Date().toISOString()
    });

    // 3. Buscar alumnos activos con turno fijo ese día
    const q = query(
      collection(db, 'usuarios'),
      where('rol', '==', 'alumno'),
      where('estado', '==', 'activo')
    );
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((userDoc) => {
      const data = userDoc.data();
      const turnosFijos = data.turnos_fijos || data.turnosFijos || [];
      
      // Si el alumno tiene turno fijo el día del feriado
      const tieneTurnoFijo = turnosFijos.some(t => t.dia === diaSemana);
      
      if (tieneTurnoFijo) {
        const feriadosDisfrutados = data.feriados_disfrutados || [];
        const clasesRestantes = data.clases_restantes || 0;
        
        batch.update(userDoc.ref, {
          feriados_disfrutados: [...feriadosDisfrutados, fecha],
          clases_restantes: Math.max(0, clasesRestantes - 1) // Pierde la clase
        });

        // Crear notificación de feriado
        const notifRef = doc(collection(db, 'notificaciones'));
        const [y, m, d] = fecha.split('-');
        batch.set(notifRef, {
          usuarioId: userDoc.id,
          tipo: 'feriado',
          titulo: 'Día Feriado Declarado',
          mensaje: `Se declaró feriado el día ${d}/${m}/${y}. La clase queda suspendida.`,
          leida: false,
          fecha: new Date().toISOString()
        });
      }
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error al declarar feriado:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Borra un feriado declarado y devuelve la clase a los alumnos afectados.
 * @param {Object} db - Firestore
 * @param {string} fecha - Fecha del feriado 'YYYY-MM-DD'
 */
export const borrarFeriado = async (db, fecha) => {
  try {
    const feriadoRef = doc(db, 'feriados', fecha);
    const feriadoSnap = await getDoc(feriadoRef);
    
    if (!feriadoSnap.exists()) {
      return { success: false, error: 'El feriado no existe o ya fue eliminado.' };
    }

    const [year, month, day] = fecha.split('-').map(Number);

    const batch = writeBatch(db);
    batch.delete(feriadoRef);

    // Buscar alumnos que "disfrutaron" este feriado
    const q = query(
      collection(db, 'usuarios'),
      where('rol', '==', 'alumno')
    );
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((userDoc) => {
      const data = userDoc.data();
      const feriadosDisfrutados = data.feriados_disfrutados || [];
      
      // Si a este alumno se le aplicó el feriado
      if (feriadosDisfrutados.includes(fecha)) {
        let clasesRestantes = data.clases_restantes || 0;
        let updateData = {
          feriados_disfrutados: feriadosDisfrutados.filter(f => f !== fecha),
          clases_restantes: clasesRestantes + 1
        };

        let mensajeNotif = `El feriado del ${day}/${month}/${year} ha sido cancelado y tu calendario ha vuelto a la normalidad. Se ha restaurado tu clase del abono.`;
        
        batch.update(userDoc.ref, updateData);

        // Crear notificación de reversión
        const notifRef = doc(collection(db, 'notificaciones'));
        batch.set(notifRef, {
          usuarioId: userDoc.id,
          tipo: 'feriado_revertido',
          titulo: 'Feriado Cancelado',
          mensaje: mensajeNotif,
          leida: false,
          fecha: new Date().toISOString()
        });
      }
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error al borrar feriado:', error);
    return { success: false, error: error.message };
  }
};
