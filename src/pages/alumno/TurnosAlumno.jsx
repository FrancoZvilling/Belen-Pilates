import { useState } from 'react';
import { useMockStore } from '../../store/mockStore';
import TurnoCard from '../../components/specific/TurnoCard';
import Modal from '../../components/common/Modal';
import { useAuthStore } from '../../store/authStore';
import { Calendar, History, CheckCircle, Info, RefreshCw, AlertCircle } from 'lucide-react';

const HISTORIAL_MOCK = [];

export default function TurnosAlumno() {
  const { userData } = useAuthStore(state => state);
  const { 
    bolsaTurnos, 
    intercambiarTurno,
    cancelarConAnticipacion
  } = useMockStore();

  const creditosRecuperacion = userData?.creditos_recuperacion || 0;

  // Ordenamiento Dinámico
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const argDate = new Date(utc + (3600000 * -3)); // UTC-3 (Argentina)
  const currentDayIndex = argDate.getDay(); // 0 (Dom) a 6 (Sab)
  
  const diasSemanales = { 'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6 };

  let misTurnos = userData?.turnos_fijos?.map((turno, i) => {
    const diaTurno = diasSemanales[turno.dia];
    const esHoy = diaTurno === currentDayIndex;
    const esManana = diaTurno === (currentDayIndex + 1) % 7;
    
    // Calcular fechaIsoString para este turno específico (buscando el próximo día que coincida)
    let daysDiff = diaTurno - currentDayIndex;
    if (daysDiff < 0) daysDiff += 7;
    
    const turnoDate = new Date(argDate);
    turnoDate.setDate(turnoDate.getDate() + daysDiff);
    const fechaIsoString = `${turnoDate.getFullYear()}-${String(turnoDate.getMonth()+1).padStart(2,'0')}-${String(turnoDate.getDate()).padStart(2,'0')}`;
    
    const registroHistorial = userData?.historial_asistencias?.find(h => h.fecha === fechaIsoString && h.hora === turno.hora);
    const isPresente = registroHistorial?.estado === 'presente';
    const isAusente = registroHistorial?.estado === 'ausente';

    return {
      id: i,
      fechaOriginal: turno.dia,
      fecha: esHoy ? 'Hoy' : esManana ? 'Mañana' : turno.dia,
      hora: turno.hora,
      tipo: 'Fijo',
      isPresente: isPresente,
      isAusente: isAusente
    };
  }) || [];

  misTurnos.sort((a, b) => {
    let weightA = diasSemanales[a.fechaOriginal];
    let weightB = diasSemanales[b.fechaOriginal];
    
    if (weightA < currentDayIndex) weightA += 7;
    if (weightB < currentDayIndex) weightB += 7;
    
    if (weightA === weightB) {
      return parseInt(a.hora.split(':')[0]) - parseInt(b.hora.split(':')[0]);
    }
    return weightA - weightB;
  });

  const [activeTab, setActiveTab] = useState('proximos'); // 'proximos' o 'historial'
  const [turnoACambiar, setTurnoACambiar] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBolsaLibreOpen, setIsBolsaLibreOpen] = useState(false);

  // Generar historial real desde Firebase
  const historialReal = userData?.historial_asistencias ? [...userData.historial_asistencias].reverse() : [];
  const inasistenciasList = historialReal.filter(h => h.estado === 'ausente');

  // Funciones de Swap y Cancelación idénticas al Dashboard
  const handleCambiarClick = (turno) => {
    setTurnoACambiar(turno);
    setIsModalOpen(true);
  };

  const handleConfirmarSwap = (idNuevoTurno) => {
    if (turnoACambiar) {
      intercambiarTurno(idNuevoTurno, turnoACambiar.id);
      setIsModalOpen(false);
      setTurnoACambiar(null);
    }
  };

  const handleCancelarClick = (turno) => {
    if (window.confirm(`¿Estás seguro de cancelar tu turno del ${turno.fecha}? Se te otorgará 1 crédito de recuperación.`)) {
      cancelarConAnticipacion(turno.id);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24 font-sans">
      
      {/* Header Fijo */}
      <header className="px-5 pt-8 pb-4 bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] sticky top-0 z-10">
        <div className="flex items-center mb-6">
          <div className="bg-primary-asistencia bg-opacity-10 p-3 rounded-full text-primary-asistencia mr-4">
            <Calendar size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-800">Mis Turnos</h1>
            <p className="text-sm font-semibold text-gray-500 mt-1">Gestión de tu agenda</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('proximos')}
            className={`flex-1 flex items-center justify-center py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'proximos' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
          >
            <Calendar size={16} className="mr-2" />
            Próximos
          </button>
          <button 
            onClick={() => setActiveTab('historial')}
            className={`flex-1 flex items-center justify-center py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'historial' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
          >
            <History size={16} className="mr-2 hidden sm:block" />
            Historial
          </button>
          <button 
            onClick={() => setActiveTab('inasistencias')}
            className={`flex-1 flex items-center justify-center py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'inasistencias' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
          >
            <AlertCircle size={16} className="mr-2 hidden sm:block" />
            Inasistencias
          </button>
        </div>
      </header>

      <div className="px-5 mt-6">
        
        {/* TAB: PRÓXIMOS TURNOS */}
        {activeTab === 'proximos' && (
          <div className="space-y-6">
            
            {/* Banner de Créditos */}
            {creditosRecuperacion > 0 && (
              <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl flex flex-col shadow-sm">
                <div className="flex items-start mb-3">
                  <Info className="text-blue-500 mr-3 shrink-0 mt-0.5" size={24} />
                  <div>
                    <h4 className="text-blue-800 font-black">¡Tenés {creditosRecuperacion} crédito(s)!</h4>
                    <p className="text-blue-600 text-sm mt-1">Usalos para anotarte en cualquier clase libre de la semana.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsBolsaLibreOpen(true)}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-sm active:scale-95 transition-transform flex justify-center items-center"
                >
                  <RefreshCw size={18} className="mr-2" />
                  Abrir Bolsa de Turnos
                </button>
              </div>
            )}

            {/* Lista de Turnos */}
            <div>
              {misTurnos.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <CheckCircle className="mx-auto text-gray-300 mb-2" size={40} />
                  <p className="text-gray-500 font-medium">No tenés turnos programados.</p>
                </div>
              ) : (
                misTurnos.map(turno => (
                  <TurnoCard 
                    key={turno.id}
                    turno={turno}
                    onCambiar={handleCambiarClick}
                    onCancelar={handleCancelarClick}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB: HISTORIAL */}
        {activeTab === 'historial' && (
          <div className="space-y-3">
            {historialReal.length > 0 ? (
              historialReal.map((historial, idx) => {
                const [y, m, d] = historial.fecha.split('-');
                const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                const fechaFormateada = `${d} ${meses[parseInt(m)-1]} ${y}`;

                return (
                <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between opacity-80">
                  <div>
                    <h4 className="font-bold text-gray-800">{fechaFormateada}</h4>
                    <span className="text-gray-500 font-medium text-sm">{historial.hora} hs • Fijo</span>
                  </div>
                  <div>
                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${
                      historial.estado === 'presente' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {historial.estado === 'presente' ? 'Asistió' : 'Ausente'}
                    </span>
                  </div>
                </div>
              )})
            ) : (
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center shadow-sm">
                <History className="mx-auto text-gray-300 mb-3" size={32} />
                <p className="font-bold text-gray-600">Sin registro de asistencias</p>
                <p className="text-sm text-gray-400 mt-1">Acá vas a poder ver el historial de las clases a las que asististe o faltaste.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: INASISTENCIAS */}
        {activeTab === 'inasistencias' && (
          <div className="space-y-6">
            {/* Tarjeta Resumen de Créditos */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 p-6 rounded-3xl flex flex-col items-center text-center shadow-sm">
              <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                <span className="text-3xl font-black text-orange-500">{creditosRecuperacion}</span>
              </div>
              <h3 className="text-xl font-black text-orange-800 mb-2">Clases para Recuperar</h3>
              <p className="text-orange-700 text-sm font-medium mb-6">
                Tenés {creditosRecuperacion} inasistencia{creditosRecuperacion !== 1 && 's'} a favor para canjear por clases en otros horarios.
              </p>
              
              <button 
                onClick={() => alert("Próximamente: Estamos construyendo el calendario interactivo para que puedas canjear tus inasistencias en cualquier clase que tenga lugar libre. ¡Estará listo muy pronto!")}
                disabled={creditosRecuperacion === 0}
                className={`w-full py-4 rounded-xl font-black text-lg transition-transform ${
                  creditosRecuperacion > 0 
                    ? 'bg-orange-500 text-white shadow-md active:scale-95' 
                    : 'bg-white text-orange-300 opacity-60 cursor-not-allowed'
                }`}
              >
                Canjear Inasistencia
              </button>
            </div>

            {/* Lista de Inasistencias Pasadas */}
            <div>
              <h4 className="font-bold text-gray-800 mb-4 px-2">Registro de Ausencias</h4>
              <div className="space-y-3">
                {inasistenciasList.length > 0 ? (
                  inasistenciasList.map((inasistencia, idx) => {
                    const [y, m, d] = inasistencia.fecha.split('-');
                    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                    const fechaFormateada = `${d} ${meses[parseInt(m)-1]} ${y}`;

                    return (
                      <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-gray-800">{fechaFormateada}</h4>
                          <span className="text-gray-500 font-medium text-sm">{inasistencia.hora} hs • Fijo</span>
                        </div>
                        <div>
                          <span className="bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                            Ausente
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center shadow-sm">
                    <CheckCircle className="mx-auto text-green-400 mb-3" size={32} />
                    <p className="font-bold text-gray-600">¡Asistencia perfecta!</p>
                    <p className="text-sm text-gray-400 mt-1">No registras inasistencias en tu historial reciente.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: SWAP (CAMBIAR TURNO) */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Cambiar Turno"
      >
        <p className="text-sm text-gray-600 mb-4">
          Estás cambiando tu turno del <span className="font-bold">{turnoACambiar?.fecha}</span>. Elige uno nuevo:
        </p>

        <div className="space-y-3">
          {bolsaTurnos.filter(b => b.ocupacion < b.capacidad).length > 0 ? (
            bolsaTurnos.filter(b => b.ocupacion < b.capacidad).map((turnoBolsa) => {
              const lugaresLibres = turnoBolsa.capacidad - turnoBolsa.ocupacion;
              return (
                <div 
                  key={turnoBolsa.id} 
                  className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-primary-asistencia transition-colors bg-white shadow-sm cursor-pointer"
                  onClick={() => handleConfirmarSwap(turnoBolsa.id)}
                >
                  <div>
                    <h4 className="font-bold text-gray-800">{turnoBolsa.fecha}</h4>
                    <p className="text-sm text-gray-500">{turnoBolsa.hora} hs</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${lugaresLibres === 1 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'}`}>
                      {lugaresLibres} lugar{lugaresLibres > 1 ? 'es' : ''}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
              <Calendar className="mx-auto text-gray-300 mb-2" size={24} />
              <p className="font-bold text-gray-600 text-sm">No hay turnos disponibles</p>
              <p className="text-xs text-gray-400 mt-1">Nadie ha cancelado turnos recientemente. Vuelve a intentar más tarde.</p>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL: ANOTARSE LIBRE (CRÉDITO) */}
      <Modal 
        isOpen={isBolsaLibreOpen} 
        onClose={() => setIsBolsaLibreOpen(false)} 
        title="Bolsa de Turnos"
      >
        <p className="text-sm text-gray-600 mb-4">
          Selecciona una clase libre para utilizar tu crédito de recuperación:
        </p>
        
        <div className="space-y-3">
          {bolsaTurnos.filter(b => b.ocupacion < b.capacidad).length > 0 ? (
            bolsaTurnos.filter(b => b.ocupacion < b.capacidad).map((turnoBolsa) => {
              const lugaresLibres = turnoBolsa.capacidad - turnoBolsa.ocupacion;
              return (
                <div 
                  key={turnoBolsa.id} 
                  className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-blue-500 transition-colors bg-white shadow-sm cursor-pointer"
                  onClick={() => {
                    alert("¡Te has anotado exitosamente en este turno de recuperación!");
                    setIsBolsaLibreOpen(false);
                  }}
                >
                  <div>
                    <h4 className="font-bold text-gray-800">{turnoBolsa.fecha}</h4>
                    <p className="text-sm text-gray-500">{turnoBolsa.hora} hs</p>
                  </div>
                  <span className="text-xs font-black text-blue-600 uppercase tracking-wider">Anotarme</span>
                </div>
              );
            })
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
              <Calendar className="mx-auto text-gray-300 mb-2" size={24} />
              <p className="font-bold text-gray-600 text-sm">Bolsa vacía</p>
              <p className="text-xs text-gray-400 mt-1">Actualmente no hay lugares libres para recuperar. Se paciente y vuelve a revisar.</p>
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
}
