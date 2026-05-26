import { useState } from 'react';
import { useMockStore } from '../../store/mockStore';
import SmartAttendanceButton from '../../components/specific/SmartAttendanceButton';
import ReportAbsenceButton from '../../components/specific/ReportAbsenceButton';
import Modal from '../../components/common/Modal';
import { Bell, Calendar, CreditCard, ChevronRight, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function DashboardAlumno() {
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);
  const { userData } = useAuthStore(state => state);
  const { 
    mesActual,
    infoPago
  } = useMockStore();

  const userNombre = userData?.nombre?.split(' ')[0] || 'Usuario';
  const clasesRestantes = userData?.clases_restantes ?? 0;
  const clasesMaximas = userData?.plan ?? 8;
  
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const argDate = new Date(utc + (3600000 * -3)); // UTC-3 (Argentina)
  const currentDayIndex = argDate.getDay(); // 0 (Dom) a 6 (Sab)
  
  const diasSemanales = { 'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6 };

  let misTurnos = userData?.turnos_fijos?.map((turno, i) => {
    const diaTurno = diasSemanales[turno.dia];
    const esHoy = diaTurno === currentDayIndex;
    const esManana = diaTurno === (currentDayIndex + 1) % 7;
    
    let daysDiff = diaTurno - currentDayIndex;
    if (daysDiff < 0) daysDiff += 7;
    
    const turnoDate = new Date(argDate);
    turnoDate.setDate(turnoDate.getDate() + daysDiff);
    const fechaIsoString = `${turnoDate.getFullYear()}-${String(turnoDate.getMonth()+1).padStart(2,'0')}-${String(turnoDate.getDate()).padStart(2,'0')}`;
    
    const registroHistorial = userData?.historial_asistencias?.find(h => h.fecha === fechaIsoString && h.hora === turno.hora);
    
    return {
      id: i,
      fechaOriginal: turno.dia,
      fecha: esHoy ? 'Hoy' : esManana ? 'Mañana' : turno.dia,
      hora: turno.hora,
      isPresente: registroHistorial?.estado === 'presente',
      isAusente: registroHistorial?.estado === 'ausente'
    };
  }) || [];

  misTurnos.sort((a, b) => {
    let weightA = diasSemanales[a.fechaOriginal];
    let weightB = diasSemanales[b.fechaOriginal];
    
    // Si el día ya pasó en esta semana, lo mandamos a la semana que viene sumando 7
    if (weightA < currentDayIndex) weightA += 7;
    if (weightB < currentDayIndex) weightB += 7;
    
    // Si caen el mismo día, desempatamos por la hora
    if (weightA === weightB) {
      return parseInt(a.hora.split(':')[0]) - parseInt(b.hora.split(':')[0]);
    }
    return weightA - weightB;
  });

  const [isBolsaModalOpen, setIsBolsaModalOpen] = useState(false);

  // Calcula el porcentaje para la barra circular o lineal
  const porcentaje = ((clasesMaximas - clasesRestantes) / clasesMaximas) * 100;

  return (
    <div className="bg-gray-50 min-h-screen pb-24 font-sans">
      
      {/* 1. Header (Bienvenida) */}
      <header className="px-5 pt-8 pb-4 flex justify-between items-center bg-white sticky top-0 z-10">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">
          Hola, {userNombre} <span className="inline-block animate-wave">👋</span>
        </h1>
        <div className="flex items-center space-x-2">
          <button className="relative p-2 bg-gray-100 rounded-full text-gray-600 active:scale-95 transition-transform">
            <Bell size={24} />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <button 
            onClick={logout}
            className="p-2 bg-red-50 rounded-full text-red-500 active:scale-95 transition-transform"
          >
            <LogOut size={24} />
          </button>
        </div>
      </header>

      <div className="px-5 space-y-6 mt-4">
        
        {/* 2. Tarjeta Principal (Estado del Mes) */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <span className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Mes actual: {mesActual}</span>
          
          {/* Progress Indicator */}
          <div className="relative w-40 h-40 flex items-center justify-center mb-4">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle 
                cx="50" cy="50" r="40" 
                fill="transparent" 
                stroke="#F3F4F6" 
                strokeWidth="12" 
              />
              <circle 
                cx="50" cy="50" r="40" 
                fill="transparent" 
                stroke="#FF7F50" 
                strokeWidth="12" 
                strokeDasharray="251.2" 
                strokeDashoffset={251.2 - (251.2 * porcentaje) / 100}
                className="transition-all duration-1000 ease-out"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-black text-gray-800">{clasesRestantes}</span>
              <span className="text-sm font-bold text-gray-400 mt-1">de {clasesMaximas}</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-700">clases disponibles</h2>
        </section>

        {/* 3. Botón Smart de Asistencia */}
        <section>
          <SmartAttendanceButton />
          <ReportAbsenceButton />
        </section>

        {/* 4. Sección Mis Próximos Turnos (Color: primary-turnos) */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
              <Calendar className="mr-2 text-primary-turnos" size={20} />
              Mis Próximos Turnos
            </h3>
          </div>
          
          <div className="space-y-3">
            {misTurnos.length > 0 ? (
              misTurnos.map(turno => (
                <div key={turno.id} className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-l-primary-turnos flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg">{turno.fecha}</h4>
                    <span className="text-gray-500 font-medium text-sm">{turno.hora} hs <span className="text-xs text-gray-400 font-normal ml-1">(Turno Fijo)</span></span>
                  </div>
                  {turno.isPresente ? (
                    <span className="bg-green-50 text-green-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center border border-green-100">
                      <CheckCircle size={14} className="mr-1" />
                      Presente
                    </span>
                  ) : turno.isAusente ? (
                    <span className="bg-orange-50 text-orange-600 font-bold px-3 py-2 rounded-xl text-xs flex items-center border border-orange-100">
                      <AlertCircle size={14} className="mr-1" />
                      Ausente
                    </span>
                  ) : (
                    <button 
                      onClick={() => setIsBolsaModalOpen(true)}
                      className="bg-primary-turnos bg-opacity-10 text-blue-600 font-bold px-4 py-2 rounded-xl text-sm active:scale-95 transition-transform"
                    >
                      Cambiar
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center mt-2">
                <Calendar className="mx-auto text-gray-300 mb-3" size={32} />
                <p className="font-bold text-gray-600">No tenés turnos asignados</p>
                <p className="text-sm text-gray-400 mt-1">Contactá a la administración para coordinar tus horarios fijos del mes.</p>
              </div>
            )}
          </div>
        </section>

        {/* 5. Sección Mi Próximo Pago (Color: primary-pagos) */}
        <section 
          onClick={() => navigate('/alumno/pagos')}
          className="cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="bg-primary-pagos bg-opacity-10 rounded-2xl p-5 border border-primary-pagos border-opacity-30 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white p-3 rounded-full text-primary-pagos shadow-sm">
                <CreditCard size={24} />
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${infoPago.estado === 'pagado' ? 'text-green-700' : 'text-orange-700'}`}>
                  {infoPago.estado === 'pagado' ? 'Mes Pagado' : 'Mi Próximo Pago'}
                </p>
                <h4 className="font-black text-gray-800 text-lg">{infoPago.monto}</h4>
                <p className="text-sm text-gray-600 font-medium font-sans">
                  {infoPago.estado === 'pagado' ? 'Próx. Venc:' : 'Vence:'} {infoPago.vencimiento}
                </p>
              </div>
            </div>
            <button className="text-primary-pagos p-2 transition-transform">
              <ChevronRight size={24} />
            </button>
          </div>
        </section>

      </div>

      {/* Modal Bolsa de Turnos Vacío */}
      <Modal 
        isOpen={isBolsaModalOpen} 
        onClose={() => setIsBolsaModalOpen(false)}
        title="Bolsa de Turnos"
      >
        <div className="py-10 text-center">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">Próximamente</h3>
          <p className="text-gray-500">Aquí podrás ver y seleccionar los turnos disponibles para intercambiar.</p>
          <button 
            onClick={() => setIsBolsaModalOpen(false)}
            className="mt-6 font-bold text-primary-turnos"
          >
            Volver
          </button>
        </div>
      </Modal>

      <style>{`
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          75% { transform: rotate(15deg); }
        }
        .animate-wave {
          animation: wave 1.5s ease-in-out infinite;
          transform-origin: 70% 70%;
        }
      `}</style>
    </div>
  );
}
