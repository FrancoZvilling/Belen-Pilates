import { useState } from 'react';
import { useMockStore } from '../../store/mockStore';
import TurnoCard from '../../components/specific/TurnoCard';
import Modal from '../../components/common/Modal';
import { Calendar, History, CheckCircle, Info, RefreshCw } from 'lucide-react';

const HISTORIAL_MOCK = [
  { id: 'h1', fecha: 'Jueves 07', hora: '16:00', estado: 'Asistió', tipo: 'Fijo' },
  { id: 'h2', fecha: 'Martes 05', hora: '18:00', estado: 'Asistió', tipo: 'Fijo' },
  { id: 'h3', fecha: 'Jueves 30', hora: '16:00', estado: 'Ausente', tipo: 'Fijo' },
  { id: 'h4', fecha: 'Viernes 24', hora: '10:00', estado: 'Asistió', tipo: 'Recupero' },
];

export default function TurnosAlumno() {
  const { 
    misTurnos, 
    bolsaTurnos, 
    creditosRecuperacion,
    intercambiarTurno,
    cancelarConAnticipacion
  } = useMockStore();

  const [activeTab, setActiveTab] = useState('proximos'); // 'proximos' o 'historial'
  const [turnoACambiar, setTurnoACambiar] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBolsaLibreOpen, setIsBolsaLibreOpen] = useState(false);

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
            <History size={16} className="mr-2" />
            Historial
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
            {HISTORIAL_MOCK.map(historial => (
              <div key={historial.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between opacity-80">
                <div>
                  <h4 className="font-bold text-gray-800">{historial.fecha}</h4>
                  <span className="text-gray-500 font-medium text-sm">{historial.hora} hs • {historial.tipo}</span>
                </div>
                <div>
                  <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${
                    historial.estado === 'Asistió' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {historial.estado}
                  </span>
                </div>
              </div>
            ))}
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
          {bolsaTurnos.filter(b => b.ocupacion < b.capacidad).map((turnoBolsa) => {
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
          })}
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
          {bolsaTurnos.filter(b => b.ocupacion < b.capacidad).map((turnoBolsa) => {
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
          })}
        </div>
      </Modal>

    </div>
  );
}
