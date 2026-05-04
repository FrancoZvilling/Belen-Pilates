import { create } from 'zustand';

// Mock Data
const INITIAL_TURNOS = [
  { id: 't1', fecha: 'Jueves 14', hora: '16:00' },
  { id: 't2', fecha: 'Martes 19', hora: '18:00' },
];

const INITIAL_BOLSA = [
  { id: 'b1', fecha: 'Miércoles 13', hora: '17:00', ocupacion: 4, capacidad: 8 },
  { id: 'b2', fecha: 'Viernes 15', hora: '10:00', ocupacion: 7, capacidad: 8 },
  { id: 'b3', fecha: 'Viernes 15', hora: '18:00', ocupacion: 2, capacidad: 8 },
];

const INITIAL_CAMILLAS = [
  { id: 'c1', estado: 'presente', alumno: 'Ana López' },
  { id: 'c2', estado: 'presente', alumno: 'Carlos Ruiz' },
  { id: 'c3', estado: 'presente', alumno: 'María Gómez' },
  { id: 'c4', estado: 'reservada', alumno: 'Pedro Martínez' },
  { id: 'c5', estado: 'reservada', alumno: 'Lucía Fernández' },
  { id: 'c6', estado: 'libre', alumno: null },
  { id: 'c7', estado: 'libre', alumno: null },
  { id: 'c8', estado: 'libre', alumno: null },
];

const HORARIOS_BASE = ['08:00', '09:00', '10:00', '14:00', '15:00', '18:00', '19:00', '20:00'];
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

const INITIAL_GRILLA = DIAS.map(dia => ({
  dia,
  horarios: HORARIOS_BASE.map(hora => ({
    hora,
    lugares_disponibles: (dia === 'Martes' && hora === '18:00') ? 0 : 
                         (dia === 'Jueves' && hora === '15:00') ? 1 : 
                         (dia === 'Viernes' && hora === '20:00') ? 0 : 3
  }))
}));

// Mock Data para Panel de Pagos
const INITIAL_ALUMNOS = [
  { id: 'a1', nombre: 'Laura Gómez', plan: 8, ultimo_pago: '10/04/2026', vencimiento: '10/05/2026', estado_pago: 'pagado', clases_restantes: 4 },
  { id: 'a2', nombre: 'Carlos Ruiz', plan: 12, ultimo_pago: '05/04/2026', vencimiento: '05/05/2026', estado_pago: 'pendiente', clases_restantes: 0 },
  { id: 'a3', nombre: 'Ana López', plan: 8, ultimo_pago: '15/03/2026', vencimiento: '15/04/2026', estado_pago: 'vencido', clases_restantes: 0 },
  { id: 'a4', nombre: 'Pedro Martínez', plan: 8, ultimo_pago: '02/05/2026', vencimiento: '02/06/2026', estado_pago: 'pagado', clases_restantes: 7 },
  { id: 'a5', nombre: 'Lucía Fernández', plan: 12, ultimo_pago: '28/04/2026', vencimiento: '28/05/2026', estado_pago: 'pagado', clases_restantes: 10 },
];

export const useMockStore = create((set) => ({
  // Alumno
  userNombre: 'María',
  misTurnos: INITIAL_TURNOS,
  clasesRestantes: 6,
  clasesMaximas: 8,
  mesActual: 'Mayo',
  infoPago: {
    vencimiento: '10 de Mayo',
    monto: '$15.000'
  },
  bolsaTurnos: INITIAL_BOLSA,
  creditosRecuperacion: 0,
  marcarAsistencia: () => set((state) => ({
    clasesRestantes: Math.max(0, state.clasesRestantes - 1)
  })),
  intercambiarTurno: (idSesionNueva, idSesionVieja) => set((state) => {
    const turnosSinElViejo = state.misTurnos.filter(t => t.id !== idSesionVieja);
    const nuevoTurno = state.bolsaTurnos.find(b => b.id === idSesionNueva);
    if (!nuevoTurno) return state;

    const turnoAdquirido = {
      id: nuevoTurno.id,
      fecha: nuevoTurno.fecha,
      hora: nuevoTurno.hora,
    };

    const turnoViejo = state.misTurnos.find(t => t.id === idSesionVieja);
    const nuevaBolsa = state.bolsaTurnos.map(b => 
      b.id === idSesionNueva ? { ...b, ocupacion: b.ocupacion + 1 } : b
    );

    if (turnoViejo) {
      nuevaBolsa.push({
        id: turnoViejo.id,
        fecha: turnoViejo.fecha,
        hora: turnoViejo.hora,
        ocupacion: 7,
        capacidad: 8
      });
    }

    return {
      misTurnos: [...turnosSinElViejo, turnoAdquirido].sort((a,b) => a.fecha.localeCompare(b.fecha)),
      bolsaTurnos: nuevaBolsa
    };
  }),
  cancelarConAnticipacion: (idSesion) => set((state) => ({
    misTurnos: state.misTurnos.filter(t => t.id !== idSesion),
    creditosRecuperacion: state.creditosRecuperacion + 1
  })),

  // Admin Asistencias
  camillasActuales: INITIAL_CAMILLAS,
  marcarPresenteAdmin: (camillaId) => set((state) => ({
    camillasActuales: state.camillasActuales.map(camilla => 
      camilla.id === camillaId ? { ...camilla, estado: 'presente' } : camilla
    )
  })),

  // Alta Alumno
  grillaMaestra: INITIAL_GRILLA,

  // Súper Admin Pagos
  alumnosMembresia: INITIAL_ALUMNOS,
  ingresosMesActual: 145000, // Total cobrado simulado
  
  registrarPago: (alumnoId) => set((state) => {
    const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    // Simulamos +1 mes para el vencimiento
    const v = new Date();
    v.setMonth(v.getMonth() + 1);
    const nuevoVencimiento = v.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return {
      alumnosMembresia: state.alumnosMembresia.map(a => {
        if (a.id === alumnoId) {
          return {
            ...a,
            estado_pago: 'pagado',
            ultimo_pago: hoy,
            vencimiento: nuevoVencimiento,
            clases_restantes: a.plan // Se resetean las clases al plan elegido
          };
        }
        return a;
      }),
      // Sumar ingresos simulados
      ingresosMesActual: state.ingresosMesActual + (state.alumnosMembresia.find(a => a.id === alumnoId)?.plan === 8 ? 15000 : 20000)
    };
  })
}));
