export const generarBolsaDeTurnos = (usuariosActivos, diasHaciaFuturo = 14, currentUserUid = null) => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const argDate = new Date(utc + (3600000 * -3)); // UTC-3 (Argentina)
  
  const currentMonth = argDate.getMonth();
  const currentYear = argDate.getFullYear();

  const diasMapLargo = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  const horariosBase = {
    'Lunes': ['08:00', '09:00', '10:00', '11:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'],
    'Martes': ['08:00', '09:00', '10:00', '11:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'],
    'Miércoles': ['08:00', '09:00', '10:00', '11:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'],
    'Jueves': ['08:00', '09:00', '10:00', '11:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'],
    'Viernes': ['08:00', '09:00', '10:00', '15:00', '16:00', '17:00', '18:00']
  };

  const bolsa = [];

  // Empezar a buscar desde mañana (i=1). Opcional: desde hoy (i=0) si la hora aún no pasó.
  // Lo haremos desde mañana para simplificar la recuperación/cambio.
  for (let i = 1; i <= diasHaciaFuturo; i++) {
    const checkDate = new Date(argDate);
    checkDate.setDate(argDate.getDate() + i);

    // No cortamos por mes calendario, permitimos buscar los días pedidos (ej: 7 o 14 días)

    const diaSemanaNombre = diasMapLargo[checkDate.getDay()];
    const horasDisponibles = horariosBase[diaSemanaNombre];

    // Si es Sábado o Domingo no hay horarios base (undefined)
    if (!horasDisponibles) continue;

    const fechaIsoString = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;

    // Para cada hora del día
    horasDisponibles.forEach(hora => {
      const idUnico = `${fechaIsoString}_${hora}`;

      let ocupacionBase = 0;
      let cancelaciones = 0;
      let extraOcupantes = 0;
      let esClaseDelUsuario = false;

      usuariosActivos.forEach(user => {
        if (user.rol !== 'alumno') return;

        // 1. Ocupación Base (tiene el turno fijo)
        const turnos = user.turnos_fijos || user.turnosFijos;
        const tieneFijo = turnos?.some(t => t.dia === diaSemanaNombre && t.hora === hora);
        if (tieneFijo) ocupacionBase++;

        // 2. Cancelaciones para esta fecha exacta o morosidad
        const canceloEstaManual = user.clases_canceladas?.includes(idUnico);
        const estaMoroso = user.clases_restantes <= 0;
        const canceloEsta = canceloEstaManual || estaMoroso;
        
        if (canceloEsta && tieneFijo) cancelaciones++;

        // 3. Extras para esta fecha exacta (recuperaciones o swaps de llegada)
        const sumoEsta = user.clases_extra?.includes(idUnico);
        if (sumoEsta && !estaMoroso) extraOcupantes++;

        // 4. Chequear si esta clase pertenece al usuario que está buscando en la bolsa
        if (currentUserUid && user.id === currentUserUid) {
          if (canceloEstaManual) esClaseDelUsuario = true; // La canceló, no puede volver a anotarse
          if (tieneFijo && !canceloEsta) esClaseDelUsuario = true; // Ya va fijo a esta clase
          if (sumoEsta && !estaMoroso) esClaseDelUsuario = true; // Ya va como extra
        }
      });

      // Regla 1: Debe haber al menos 1 alumno fijo para que la clase "exista"
      // Regla Nueva: No debe ser una clase del usuario actual
      if (ocupacionBase > 0 && !esClaseDelUsuario) {
        // Regla 2 y 3: Matemática dinámica
        const ocupacionReal = ocupacionBase - cancelaciones + extraOcupantes;
        
        // Si hay lugar (máximo 7 alumnos, por ende ocupación real < 8)
        if (ocupacionReal < 8) {
          const mesesAbrev = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
          const fechaFormateada = `${diaSemanaNombre} ${checkDate.getDate()} de ${mesesAbrev[checkDate.getMonth()]}`;

          bolsa.push({
            id: idUnico,
            fechaIso: fechaIsoString,
            fecha: fechaFormateada, // Ej: "Jueves 15 de Oct"
            hora: hora,
            ocupacion: ocupacionReal,
            capacidad: 8
          });
        }
      }
    });
  }

  return bolsa;
};

/**
 * Genera la agenda real y proyectada de un usuario específico.
 * Combina sus turnos fijos, resta las cancelaciones y suma los extras.
 * @param {Object} userData - Datos del usuario desde Firebase
 * @param {number} diasHaciaFuturo - Días a proyectar (por defecto 14)
 * @returns {Array} - Array de objetos turno listos para UI
 */
export const generarAgendaUsuario = (userData, diasHaciaFuturo = 14) => {
  if (!userData || userData.estado === 'inactivo') return [];

  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const argDate = new Date(utc + (3600000 * -3)); // UTC-3 (Argentina)

  const diasMapLargo = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  const agenda = [];

  // Recorrer los próximos "diasHaciaFuturo" días (incluyendo hoy)
  for (let i = 0; i <= diasHaciaFuturo; i++) {
    const checkDate = new Date(argDate);
    checkDate.setDate(argDate.getDate() + i);

    const diaSemanaNombre = diasMapLargo[checkDate.getDay()];
    const fechaIsoString = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    const esHoy = i === 0;
    const esManana = i === 1;
    const diaMes = `${checkDate.getDate()}/${checkDate.getMonth() + 1}`;
    const etiquetaDia = esHoy ? 'Hoy' : esManana ? 'Mañana' : `${diaSemanaNombre} ${diaMes}`;

    // Buscar si tiene un turno fijo este día de la semana
    const turnos = userData.turnos_fijos || userData.turnosFijos || [];
    const turnosFijosHoy = turnos.filter(t => t.dia === diaSemanaNombre);

    turnosFijosHoy.forEach(fijo => {
      const idTurnoUnico = `${fechaIsoString}_${fijo.hora}`;
      
      // Si está en la lista de canceladas, lo saltamos (fue borrado)
      if (userData.clases_canceladas?.includes(idTurnoUnico)) {
        return;
      }

      // Si el día fue feriado
      if (userData.feriados_disfrutados?.includes(fechaIsoString)) {
        agenda.push({
          id: idTurnoUnico,
          fechaOriginal: fijo.dia,
          fechaIsoString: fechaIsoString,
          fecha: etiquetaDia,
          fechaPura: checkDate,
          hora: fijo.hora,
          tipo: 'Fijo',
          isPresente: false,
          isAusente: false,
          estadoEspecial: 'feriado',
          isCancelado: true,
          esIntercambiable: false 
        });
        return;
      }

      // Chequear si hay historial marcado real (presente/ausente)
      const registroHistorial = userData.historial_asistencias?.find(h => h.fecha === fechaIsoString && h.hora === fijo.hora);

      agenda.push({
        id: idTurnoUnico,
        fechaOriginal: fijo.dia,
        fechaIsoString: fechaIsoString,
        fecha: etiquetaDia,
        fechaPura: checkDate, // para ordenamiento duro
        hora: fijo.hora,
        tipo: 'Fijo',
        isPresente: registroHistorial?.estado === 'presente',
        isAusente: registroHistorial?.estado === 'ausente',
        estadoEspecial: userData.clases_restantes <= 0 ? 'ausente_pago' : null,
        isCancelado: false, // Ya no se muestra cancelado, simplemente desaparece o es normal
        esIntercambiable: true // Los turnos fijos se pueden cambiar
      });
    });

    // Ahora buscar si tiene clases extra este día exacto
    userData.clases_extra?.forEach(extra => {
      if (extra.startsWith(fechaIsoString)) {
        const horaExtra = extra.split('_')[1];
        
        // Chequear historial
        const registroHistorial = userData.historial_asistencias?.find(h => h.fecha === fechaIsoString && h.hora === horaExtra);

        agenda.push({
          id: extra,
          fechaOriginal: diaSemanaNombre,
          fechaIsoString: fechaIsoString,
          fecha: etiquetaDia,
          fechaPura: checkDate,
          hora: horaExtra,
          tipo: 'Recupero / Extra',
          isPresente: registroHistorial?.estado === 'presente',
          isAusente: registroHistorial?.estado === 'ausente',
          estadoEspecial: userData.clases_restantes <= 0 ? 'ausente_pago' : null,
          isCancelado: false,
          esIntercambiable: false // Los turnos extra NO se pueden cambiar otra vez
        });
      }
    });
  }

  // Ordenar cronológicamente
  agenda.sort((a, b) => {
    if (a.fechaPura.getTime() !== b.fechaPura.getTime()) {
      return a.fechaPura.getTime() - b.fechaPura.getTime();
    }
    return parseInt(a.hora.split(':')[0]) - parseInt(b.hora.split(':')[0]);
  });

  return agenda;
};
