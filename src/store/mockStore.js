import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Mock Data
const INITIAL_TURNOS = [];

const INITIAL_BOLSA = [];

const INITIAL_CAMILLAS = Array.from({ length: 8 }, (_, i) => ({
  id: `c${i+1}`,
  estado: 'libre',
  alumno: null
}));

const HORARIOS_POR_DIA = {
  'Lunes':     ['08:00','09:00','10:00','11:00','15:00','16:00','17:00','18:00','19:00','20:00'],
  'Martes':    ['08:00','09:00','10:00','11:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'],
  'Miércoles': ['08:00','09:00','10:00','11:00','15:00','16:00','17:00','18:00','19:00','20:00'],
  'Jueves':    ['08:00','09:00','10:00','11:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'],
  'Viernes':   ['08:00','09:00','10:00','11:00','15:00','18:00','19:00','20:00'],
};
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

const INITIAL_GRILLA = DIAS.map(dia => ({
  dia,
  horarios: HORARIOS_POR_DIA[dia].map(hora => ({
    hora,
    lugares_disponibles: 8
  }))
}));

// Mock Data para Panel de Pagos
const INITIAL_ALUMNOS = [];

// Mock Historial de Pagos del Alumno (últimos meses)
const INITIAL_HISTORIAL_PAGOS = [];

export const useMockStore = create(
  persist(
    (set) => ({
  // Alumno
  userNombre: 'Usuario',
  misTurnos: INITIAL_TURNOS,
  clasesRestantes: 0,
  clasesMaximas: 0,
  mesActual: new Date().toLocaleString('es-AR', { month: 'long' }),
  infoPago: {
    estado: 'pendiente', // 'pagado' | 'pendiente'
    vencimiento: '-',
    monto: '-',
    historial: INITIAL_HISTORIAL_PAGOS
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
    const mesActualNombre = new Date().toLocaleString('es-AR', { month: 'long' });
    // Simulamos +1 mes para el vencimiento
    const v = new Date();
    v.setMonth(v.getMonth() + 1);
    const nuevoVencimientoDate = v.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const nuevoVencimientoTexto = `10 de ${v.toLocaleString('es-AR', { month: 'long' })} ${v.getFullYear()}`;
    const montoPlan = state.alumnosMembresia.find(a => a.id === alumnoId)?.plan === 8 ? 15000 : 20000;

    // Simulamos que cualquier pago registrado actualiza la vista del alumno logueado 
    // para que la demostración al cliente sea más fluida.
    let nuevaInfoPago = {
      ...state.infoPago,
      estado: 'pagado',
      vencimiento: nuevoVencimientoTexto,
      historial: [
        { 
          id: `p_new_${Date.now()}`, 
          fecha: `${new Date().getDate()} de ${mesActualNombre} ${new Date().getFullYear()}`, 
          monto: `$${montoPlan.toLocaleString('es-AR')}`,
          mes: mesActualNombre.charAt(0).toUpperCase() + mesActualNombre.slice(1)
        },
        ...state.infoPago.historial
      ]
    };

    return {
      infoPago: nuevaInfoPago,
      alumnosMembresia: state.alumnosMembresia.map(a => {
        if (a.id === alumnoId) {
          return {
            ...a,
            estado_pago: 'pagado',
            ultimo_pago: hoy,
            vencimiento: nuevoVencimientoDate,
            clases_restantes: a.plan // Se resetean las clases al plan elegido
          };
        }
        return a;
      }),
      // Sumar ingresos simulados
      ingresosMesActual: state.ingresosMesActual + montoPlan
    };
  }),
  }),
  {
    name: 'belen-pilates-mock-storage-v3', // bumped to force reload with new schedules
  }
));
