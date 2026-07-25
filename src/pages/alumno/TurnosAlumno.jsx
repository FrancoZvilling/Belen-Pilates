import { useState, useEffect } from 'react';
import TurnoCard from '../../components/specific/TurnoCard';
import Modal from '../../components/common/Modal';
import { useAuthStore } from '../../store/authStore';
import { Calendar, History, CheckCircle, Info, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Folder } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { generarBolsaDeTurnos, generarAgendaUsuario } from '../../utils/calendarUtils';
import { intercambiarTurno, cancelarClaseAnticipada } from '../../services/turnosService';

export default function TurnosAlumno() {
  const { userData, user } = useAuthStore(state => state);
  
  const [feriadosGlobales, setFeriadosGlobales] = useState([]);

  useEffect(() => {
    const fetchFeriados = async () => {
      try {
        const snapFeriados = await getDocs(collection(db, 'feriados'));
        setFeriadosGlobales(snapFeriados.docs.map(d => d.id));
      } catch (e) {
        console.error("Error fetching feriados:", e);
      }
    };
    fetchFeriados();
  }, []);

  const misTurnosBrutos = userData ? generarAgendaUsuario(userData, 14, feriadosGlobales) : [];
  const misTurnos = misTurnosBrutos.filter(t => !(t.estadoEspecial === 'ausente_pago' && t.tipo === 'Fijo'));

  const [activeTab, setActiveTab] = useState('proximos');
  const [turnoACambiar, setTurnoACambiar] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [bolsaTurnos, setBolsaTurnos] = useState([]);
  const [isLoadingBolsa, setIsLoadingBolsa] = useState(false);

  // Generar historial real desde Firebase
  const historialReal = userData?.historial_asistencias ? [...userData.historial_asistencias].reverse() : [];
  const inasistenciasList = historialReal.filter(h => h.estado === 'ausente');

  const agruparPorMes = (lista) => {
    const agrupado = {};
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    lista.forEach(item => {
      const [y, m] = item.fecha.split('-');
      const key = `${meses[parseInt(m)-1]} ${y}`;
      if (!agrupado[key]) agrupado[key] = [];
      agrupado[key].push(item);
    });
    return agrupado;
  };

  const historialAgrupado = agruparPorMes(historialReal);
  const inasistenciasAgrupadas = agruparPorMes(inasistenciasList);

  const [openFolders, setOpenFolders] = useState({});

  const toggleFolder = (folderKey) => {
    setOpenFolders(prev => ({
      ...prev,
      [folderKey]: !prev[folderKey]
    }));
  };

  // Cargar Bolsa solo cuando se abre un modal
  useEffect(() => {
    if (isModalOpen) {
      const cargarBolsa = async () => {
        setIsLoadingBolsa(true);
        try {
          const [snapUsuarios, snapPre] = await Promise.all([
            getDocs(collection(db, 'usuarios')),
            getDocs(collection(db, 'pre_registros'))
          ]);
          
          const users = snapUsuarios.docs.map(d => ({id: d.id, ...d.data()})).filter(u => u.estado !== 'inactivo');
          const preRegs = snapPre.docs.map(d => ({id: d.id, ...d.data()}));
          
          const todosActivos = [...users, ...preRegs];
          setBolsaTurnos(generarBolsaDeTurnos(todosActivos, 7, user.uid, feriadosGlobales));
        } catch (error) {
          console.error("Error calculando bolsa:", error);
        } finally {
          setIsLoadingBolsa(false);
        }
      };
      cargarBolsa();
    }
  }, [isModalOpen]);

  const handleCambiarClick = (turno) => {
    if (turno.isCancelado) return alert("Este turno ya fue cancelado.");
    if (turno.isPresente || turno.isAusente) return alert("Este turno ya pasó y está registrado en tu historial.");
    setTurnoACambiar(turno);
    setIsModalOpen(true);
  };

  const handleConfirmarSwap = async (turnoBolsa) => {
    if (turnoACambiar) {
      const mensaje = `¿Estás seguro que querés cambiar tu turno del ${turnoACambiar.fecha} a las ${turnoACambiar.hora} hs por el nuevo turno del ${turnoBolsa.fecha} a las ${turnoBolsa.hora} hs?`;
      if (!window.confirm(mensaje)) return;

      const res = await intercambiarTurno(db, user.uid, turnoBolsa.id, turnoACambiar.id);
      if (res.success) {
        alert("¡Turno cambiado con éxito!");
        setIsModalOpen(false);
        setTurnoACambiar(null);
      } else {
        alert("Error al cambiar turno: " + res.error);
      }
    }
  };

  const handleCancelarClick = async (turno) => {
    if (turno.isCancelado) return alert("Ya cancelaste este turno.");
    
    const mensajeConfirm = `¿Estás seguro de cancelar tu turno del ${turno.fecha}? Recordá que ya no utilizamos sistema de créditos, por lo que este turno se perderá.`;

    if (window.confirm(mensajeConfirm)) {
      const res = await cancelarClaseAnticipada(db, user.uid, turno.id);
      if (res.success) {
        alert("Turno cancelado exitosamente.");
      } else {
        alert("Error al cancelar: " + res.error);
      }
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
            {Object.keys(historialAgrupado).length > 0 ? (
              Object.keys(historialAgrupado).map((mesKey) => (
                <div key={mesKey} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button 
                    onClick={() => toggleFolder(`historial-${mesKey}`)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Folder className="text-primary-turnos opacity-80" size={20} />
                      <span className="font-bold text-gray-800">{mesKey}</span>
                      <span className="text-xs bg-white px-2 py-0.5 rounded-full text-gray-500 font-bold border border-gray-200">
                        {historialAgrupado[mesKey].length} clases
                      </span>
                    </div>
                    {openFolders[`historial-${mesKey}`] ? (
                      <ChevronUp className="text-gray-400" size={20} />
                    ) : (
                      <ChevronDown className="text-gray-400" size={20} />
                    )}
                  </button>
                  
                  {openFolders[`historial-${mesKey}`] && (
                    <div className="p-3 space-y-2 border-t border-gray-100">
                      {historialAgrupado[mesKey].map((historial, idx) => {
                        const [y, m, d] = historial.fecha.split('-');
                        const fechaFormateada = `${d}/${m}/${y}`;
                        
                        return (
                          <div key={idx} className="bg-white p-3 rounded-xl border border-gray-50 flex items-center justify-between opacity-90">
                            <div>
                              <h4 className="font-bold text-gray-700">{fechaFormateada}</h4>
                              <span className="text-gray-400 font-medium text-xs">{historial.hora} hs</span>
                            </div>
                            <div>
                              <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-md ${
                                historial.estado === 'presente' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                              }`}>
                                {historial.estado === 'presente' ? 'Asistió' : 'Ausente'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
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
            {/* Lista de Inasistencias Pasadas */}
            <div>
              <h4 className="font-bold text-gray-800 mb-4 px-2">Registro de Ausencias</h4>
              <div className="space-y-3">
                {Object.keys(inasistenciasAgrupadas).length > 0 ? (
                  Object.keys(inasistenciasAgrupadas).map((mesKey) => (
                    <div key={mesKey} className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                      <button 
                        onClick={() => toggleFolder(`inasistencias-${mesKey}`)}
                        className="w-full flex items-center justify-between p-4 bg-orange-50/30 hover:bg-orange-50/60 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Folder className="text-orange-500 opacity-80" size={20} />
                          <span className="font-bold text-gray-800">{mesKey}</span>
                          <span className="text-xs bg-white px-2 py-0.5 rounded-full text-orange-600 font-bold border border-orange-200">
                            {inasistenciasAgrupadas[mesKey].length} faltas
                          </span>
                        </div>
                        {openFolders[`inasistencias-${mesKey}`] ? (
                          <ChevronUp className="text-orange-400" size={20} />
                        ) : (
                          <ChevronDown className="text-orange-400" size={20} />
                        )}
                      </button>
                      
                      {openFolders[`inasistencias-${mesKey}`] && (
                        <div className="p-3 space-y-2 border-t border-orange-100">
                          {inasistenciasAgrupadas[mesKey].map((inasistencia, idx) => {
                            const [y, m, d] = inasistencia.fecha.split('-');
                            const fechaFormateada = `${d}/${m}/${y}`;
                            
                            return (
                              <div key={idx} className="bg-white p-3 rounded-xl border border-gray-50 flex items-center justify-between">
                                <div>
                                  <h4 className="font-bold text-gray-800">{fechaFormateada}</h4>
                                  <span className="text-gray-500 font-medium text-xs">{inasistencia.hora} hs</span>
                                </div>
                                <div>
                                  <span className="bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md">
                                    Ausente
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center shadow-sm">
                    <CheckCircle className="mx-auto text-green-400 mb-3" size={32} />
                    <p className="font-bold text-gray-600">¡Excelente asistencia!</p>
                    <p className="text-sm text-gray-400 mt-1">Aún no registrás faltas. Seguí así.</p>
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
          {isLoadingBolsa ? (
            <div className="text-center py-6">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-primary-asistencia rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-500 font-medium">Buscando turnos disponibles...</p>
            </div>
          ) : bolsaTurnos.filter(b => b.ocupacion < b.capacidad).length > 0 ? (
            bolsaTurnos.filter(b => b.ocupacion < b.capacidad).map((turnoBolsa) => {
              const lugaresLibres = turnoBolsa.capacidad - turnoBolsa.ocupacion;
              return (
                <div 
                  key={turnoBolsa.id} 
                  className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-primary-asistencia transition-colors bg-white shadow-sm cursor-pointer"
                  onClick={() => handleConfirmarSwap(turnoBolsa)}
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

    </div>
  );
}
