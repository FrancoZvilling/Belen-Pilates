import { useState, useMemo, useEffect } from 'react';
import { useMockStore } from '../../store/mockStore';
import SmartAttendanceButton from '../../components/specific/SmartAttendanceButton';
import ReportAbsenceButton from '../../components/specific/ReportAbsenceButton';
import Modal from '../../components/common/Modal';
import { Bell, Calendar, CreditCard, ChevronRight, LogOut, CheckCircle, AlertCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { generarAgendaUsuario } from '../../utils/calendarUtils';
import { db } from '../../config/firebase';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { marcarNotificacionesLeidas, borrarNotificacion, borrarTodasLasNotificaciones } from '../../services/notificacionesService';

export default function DashboardAlumno() {
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);
  const { userData, user } = useAuthStore(state => state);
  const { mesActual } = useMockStore();

  const userNombre = userData?.nombre?.split(' ')[0] || 'Usuario';
  const clasesRestantes = userData?.clases_restantes ?? 0;
  const clasesMaximas = userData?.plan ?? 8;
  
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

  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'notificaciones'),
      where('usuarioId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      notifs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setNotificaciones(notifs.slice(0, 10)); // Mostrar solo las 10 más recientes
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const unreadCount = notificaciones.filter(n => !n.leida).length;

  const handleOpenNotifs = () => {
    setIsNotifPanelOpen(true);
    if (unreadCount > 0) {
      marcarNotificacionesLeidas(db, user.uid);
    }
  };

  // Calcula el estado de pago del alumno
  const estadoDePago = useMemo(() => {
    let estado = 'vencido';
    let diasRestantes = 0;
    
    if (userData?.vencimiento_pago) {
      const d = new Date();
      const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
      const todayDate = new Date(utc + (3600000 * -3));
      todayDate.setHours(0, 0, 0, 0);

      const venc = new Date(userData.vencimiento_pago + 'T12:00:00Z');
      const diffTime = venc.getTime() - todayDate.getTime();
      diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diasRestantes > 5) estado = 'pagado';
      else if (diasRestantes >= 0) estado = 'pendiente';
    }

    return { estado, diasRestantes, vencimiento: userData?.vencimiento_pago || 'No registrado' };
  }, [userData]);

  // Calcula el porcentaje para la barra circular o lineal
  const porcentaje = ((clasesMaximas - clasesRestantes) / clasesMaximas) * 100;

  return (
    <div className="bg-gray-50 min-h-screen pb-24 font-sans">
      
      {/* 1. Header (Bienvenida) */}
      <header className="px-5 pt-8 pb-4 flex justify-between items-center bg-white sticky top-0 z-10 shadow-sm">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">
          Hola, {userNombre} <span className="inline-block animate-wave">👋</span>
        </h1>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleOpenNotifs}
            className="relative p-2 bg-gray-100 rounded-full text-gray-600 active:scale-95 transition-transform"
          >
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
              </span>
            )}
          </button>
          <button 
            onClick={logout}
            className="p-2 bg-red-50 rounded-full text-red-500 active:scale-95 transition-transform"
          >
            <LogOut size={24} />
          </button>
        </div>
      </header>

      {/* Cartel de Alerta Vencido */}
      {estadoDePago.estado === 'vencido' && (
        <div className="px-5 mt-4">
          <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start shadow-sm">
            <XCircle className="text-red-500 mr-3 flex-shrink-0 mt-0.5" size={24} />
            <div>
              <h3 className="font-bold text-red-800">Mensualidad Vencida</h3>
              <p className="text-sm text-red-700 mt-1">Por favor, regularizá el pago de tu plan para evitar demoras en el sistema.</p>
            </div>
          </div>
        </div>
      )}

      {/* Cartel de Alerta Pendiente */}
      {estadoDePago.estado === 'pendiente' && (
        <div className="px-5 mt-4">
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl flex items-start shadow-sm">
            <AlertTriangle className="text-yellow-600 mr-3 flex-shrink-0 mt-0.5" size={24} />
            <div>
              <h3 className="font-bold text-yellow-800">Vencimiento Próximo</h3>
              <p className="text-sm text-yellow-700 mt-1">Tu plan vence en {estadoDePago.diasRestantes} días. Recordá abonar a tiempo.</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 space-y-6 mt-4">
        
        {/* 2. Tarjeta Principal (Estado del Mes) */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <span className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Mes actual: {mesActual}</span>
          
          {/* Progress Indicator */}
          <div className="relative w-40 h-40 flex items-center justify-center mb-4">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-100"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-primary transition-all duration-1000 ease-out"
                strokeWidth="3"
                strokeDasharray={`${porcentaje}, 100`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-gray-800 tracking-tighter">{clasesRestantes}</span>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">clases<br/>restantes</span>
            </div>
          </div>

          <p className="text-gray-500 font-medium text-sm px-4">
            Te quedan <strong className="text-gray-800">{clasesRestantes}</strong> de <strong className="text-gray-800">{clasesMaximas}</strong> clases de tu plan mensual.
          </p>
        </section>

        {/* 3. Acciones Rápidas Inteligentes */}
        <section className="space-y-3">
          <SmartAttendanceButton uid={user?.uid} />
          <ReportAbsenceButton uid={user?.uid} />
        </section>

        {/* 4. Próximos Turnos */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-black text-gray-800">Mis Próximos Turnos</h2>
            <button 
              onClick={() => navigate('/alumno/turnos')}
              className="text-sm font-bold text-primary hover:text-opacity-80 flex items-center transition-colors"
            >
              Ver todos <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
          
          <div className="space-y-3">
            {misTurnos.length > 0 ? (
              misTurnos.slice(0, 3).map((turno) => (
                <div 
                  key={turno.id} 
                  className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between ${
                    turno.tipo === 'Fijo' ? 'border-l-4 border-l-primary-turnos' : 'border-l-4 border-l-blue-400'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="bg-primary-turnos bg-opacity-10 p-3 rounded-full text-primary-turnos mr-4">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                        {turno.fecha}
                      </p>
                      <h4 className="font-black text-gray-800 text-lg">{turno.hora} hs</h4>
                    </div>
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
                  ) : turno.estadoEspecial === 'feriado' ? (
                    <span className="bg-red-50 text-red-700 font-bold px-3 py-2 rounded-xl text-[10px] text-center max-w-[120px] flex items-center justify-center border border-red-200 leading-tight">
                      Clase Suspendida por Feriado
                    </span>
                  ) : (
                    <button 
                      onClick={() => navigate('/alumno/turnos')}
                      className="bg-primary-turnos bg-opacity-10 text-blue-600 font-bold px-4 py-2 rounded-xl text-sm active:scale-95 transition-transform"
                    >
                      Ver
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
          <div className={`bg-opacity-10 rounded-2xl p-5 border flex items-center justify-between ${
            estadoDePago.estado === 'pagado' ? 'bg-green-500 border-green-200 text-green-700' :
            estadoDePago.estado === 'pendiente' ? 'bg-yellow-500 border-yellow-300 text-yellow-700' :
            'bg-red-500 border-red-200 text-red-700'
          }`}>
            <div className="flex items-center space-x-4">
              <div className="bg-white p-3 rounded-full shadow-sm" style={{ color: 'inherit' }}>
                <CreditCard size={24} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'inherit' }}>
                  {estadoDePago.estado === 'pagado' ? 'Mes al día' : 'Mensualidad'}
                </p>
                <h4 className="font-black text-gray-800 text-lg uppercase tracking-tight">
                  {estadoDePago.estado}
                </h4>
                <p className="text-sm text-gray-600 font-medium font-sans">
                  {estadoDePago.estado === 'vencido' ? 'Venció el' : 'Vence el'}: {estadoDePago.vencimiento}
                </p>
              </div>
            </div>
            <button style={{ color: 'inherit' }} className="p-2 transition-transform">
              <ChevronRight size={24} />
            </button>
          </div>
        </section>

      </div>

      {/* Modal Notificaciones */}
      <Modal 
        isOpen={isNotifPanelOpen} 
        onClose={() => setIsNotifPanelOpen(false)}
        title={
          <div className="flex justify-between items-center w-full pr-4">
            <span>Notificaciones</span>
            {notificaciones.length > 0 && (
              <button 
                onClick={() => {
                  if (window.confirm('¿Seguro que querés borrar todas las notificaciones?')) {
                    borrarTodasLasNotificaciones(db, user.uid);
                  }
                }}
                className="text-xs text-red-500 font-bold hover:bg-red-50 px-2 py-1 rounded transition-colors"
              >
                Borrar todas
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 relative">
          {notificaciones.length > 0 ? (
            notificaciones.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-4 rounded-xl border relative group ${notif.leida ? 'bg-gray-50 border-gray-100' : 'bg-white border-primary-turnos/30 shadow-sm'}`}
              >
                <button 
                  onClick={() => borrarNotificacion(db, notif.id)}
                  className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition-colors bg-white rounded-full"
                >
                  <XCircle size={18} />
                </button>
                <div className="flex justify-between items-start mb-1 pr-6">
                  <h4 className={`font-bold text-sm ${notif.leida ? 'text-gray-700' : 'text-primary-turnos'}`}>
                    {notif.titulo}
                  </h4>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {new Date(notif.fecha).toLocaleDateString('es-AR')}
                  </span>
                </div>
                <p className={`text-sm ${notif.leida ? 'text-gray-500' : 'text-gray-800'} pr-2`}>
                  {notif.mensaje}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Bell className="mx-auto text-gray-300 mb-3" size={32} />
              <p className="text-gray-500 text-sm">No tienes notificaciones nuevas.</p>
            </div>
          )}
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
