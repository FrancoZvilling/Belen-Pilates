import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Users, Search, ShieldAlert, MoreVertical, Mail, Phone, UserPlus, Archive, RefreshCcw, Check, LogOut, Bell, XCircle, Trash2, Calendar } from 'lucide-react';
import { db } from '../../config/firebase';
import { doc, setDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { archivarUsuario, reactivarUsuario } from '../../services/authService';
import { borrarNotificacion, borrarTodasLasNotificaciones } from '../../services/notificacionesService';
import Modal from '../../components/common/Modal';

import { useAdminStore } from '../../store/adminStore';
import { useAuthStore } from '../../store/authStore';
import ModificarHorariosModal from '../../components/admin/ModificarHorariosModal';

export default function GestionUsuarios() {
  const location = useLocation();
  const logout = useAuthStore(state => state.logout);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroRol, setFiltroRol] = useState(location.state?.tab || 'alumno'); // 'alumno', 'staff', 'inactivos', 'notificaciones'

  const [isModificarHorariosOpen, setIsModificarHorariosOpen] = useState(false);
  const [alumnoEditandoHorarios, setAlumnoEditandoHorarios] = useState(null);

  useEffect(() => {
    if (location.state?.tab) {
      setFiltroRol(location.state.tab);
    }
  }, [location.state]);
  const [menuAbiertoId, setMenuAbiertoId] = useState(null);
  const [isProfeModalOpen, setIsProfeModalOpen] = useState(false);
  const [isProfeSuccess, setIsProfeSuccess] = useState(false);
  const [isSavingProfe, setIsSavingProfe] = useState(false);
  const [profeForm, setProfeForm] = useState({ nombre: '', email: '', telefono: '' });
  const [notificacionesAdmin, setNotificacionesAdmin] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, 'notificaciones'),
      where('usuarioId', '==', 'admin')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      notifs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setNotificacionesAdmin(notifs);
    });
    return () => unsubscribe();
  }, []);

  const { usuarios, preRegistros, usuariosInactivos, preRegistrosInactivos } = useAdminStore();
  
  const todosLosUsuarios = filtroRol === 'inactivos' 
    ? [
        ...usuariosInactivos.map(u => ({ ...u, isPreRegistro: false })),
        ...preRegistrosInactivos.map(p => ({ ...p, isPreRegistro: true, rol: p.rol || 'alumno' }))
      ]
    : [
        ...usuarios.map(u => ({ ...u, isPreRegistro: false })),
        ...preRegistros.map(p => ({ ...p, isPreRegistro: true, rol: p.rol || 'alumno' }))
      ];

  // Filtrado de usuarios
  const usuariosFiltrados = todosLosUsuarios.filter(u => {
    const matchesSearch = u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesRole = true;
    if (filtroRol === 'alumno') matchesRole = u.rol === 'alumno';
    if (filtroRol === 'staff') matchesRole = ['admin', 'superadmin'].includes(u.rol);

    return matchesSearch && matchesRole;
  }).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const totales = {
    alumnos: usuarios.filter(u => u.rol === 'alumno').length + preRegistros.filter(p => !p.rol || p.rol === 'alumno').length,
    staff: usuarios.filter(u => ['admin', 'superadmin'].includes(u.rol)).length + preRegistros.filter(p => ['admin', 'superadmin'].includes(p.rol)).length,
    inactivos: usuariosInactivos.length + preRegistrosInactivos.length
  };

  const getIniciales = (nombre) => {
    return nombre.substring(0, 2).toUpperCase();
  };

  const isUsuarioNuevo = (usuario) => {
    if (usuario.isPreRegistro) return true;
    if (usuario.fecha_registro) {
      const fechaRegistro = new Date(usuario.fecha_registro);
      const hoy = new Date();
      const diffTime = Math.abs(hoy - fechaRegistro);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }
    return false;
  };

  const handleArchivar = async (usuario) => {
    if (window.confirm(`¿Estás seguro de que querés archivar a ${usuario.nombre}? Dejará de aparecer en las listas activas.`)) {
      setMenuAbiertoId(null);
      const res = await archivarUsuario(db, usuario.id, usuario.isPreRegistro);
      if (!res.success) {
        alert("Error al archivar: " + res.error);
      }
    }
  };

  const handleReactivar = async (usuario) => {
    if (window.confirm(`¿Estás seguro de que querés reactivar a ${usuario.nombre}? Volverá a tener acceso a la aplicación.`)) {
      setMenuAbiertoId(null);
      const res = await reactivarUsuario(db, usuario.id, usuario.isPreRegistro);
      if (!res.success) {
        alert("Error al reactivar: " + res.error);
      }
    }
  };

  const dominiosPermitidos = [
    'gmail.com', 'gmail.com.ar',
    'hotmail.com', 'hotmail.com.ar',
    'outlook.com', 'outlook.com.ar',
    'yahoo.com', 'yahoo.com.ar',
    'live.com', 'live.com.ar'
  ];

  const isEmailValido = (email) => {
    if (!email || !email.includes('@')) return false;
    const dominio = email.split('@')[1];
    return dominiosPermitidos.includes(dominio);
  };

  const handleGuardarProfesor = async () => {
    if (!profeForm.nombre || !profeForm.email) {
      alert('Por favor completá el nombre y el email del profesor.');
      return;
    }
    if (!isEmailValido(profeForm.email)) {
      alert("El correo debe ser obligatoriamente de Gmail, Hotmail, Outlook, Yahoo o Live.");
      return;
    }
    try {
      setIsSavingProfe(true);
      const emailId = profeForm.email.trim().toLowerCase();
      
      // Validar si el email ya existe en el sistema
      const todosLosUsuarios = [
        ...usuarios,
        ...(useAdminStore.getState().usuariosInactivos || []),
        ...preRegistros,
        ...(useAdminStore.getState().preRegistrosInactivos || [])
      ];
      
      const emailYaRegistrado = todosLosUsuarios.some(u => 
        (u.email && u.email.toLowerCase() === emailId) || 
        (u.id && u.id.toLowerCase() === emailId)
      );
      
      if (emailYaRegistrado) {
        alert("Error: Este email ya está registrado para otro alumno o profesor. Por favor usa un email diferente.");
        setIsSavingProfe(false);
        return;
      }

      const preRegistroRef = doc(db, 'pre_registros', emailId);
      await setDoc(preRegistroRef, {
        nombre: profeForm.nombre,
        email: emailId,
        telefono: profeForm.telefono,
        rol: 'admin',
        fecha_registro: new Date().toISOString()
      });
      setIsProfeModalOpen(false);
      setIsProfeSuccess(true);
    } catch (error) {
      console.error('Error al pre-cargar profesor:', error);
      alert('Hubo un error al guardar. Revisá tu conexión.');
    } finally {
      setIsSavingProfe(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24 font-sans">
      
      {/* Header Fijo */}
      <header className="px-5 pt-8 pb-6 bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] sticky top-0 z-20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="bg-primary-pagos bg-opacity-10 p-3 rounded-full text-primary-pagos mr-4">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-800">Usuarios</h1>
              <p className="text-sm font-semibold text-gray-500 mt-1">Directorio del estudio</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={() => setIsProfeModalOpen(true)}
              className="bg-primary-pagos text-white p-3 rounded-full shadow-md active:scale-95 transition-transform"
            >
              <UserPlus size={20} />
            </button>
            <button 
              onClick={logout}
              className="bg-red-50 text-red-500 p-3 rounded-full shadow-sm active:scale-95 transition-transform"
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-pagos"
          />
        </div>

        {/* Tabs de Filtro */}
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setFiltroRol('alumno')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${filtroRol === 'alumno' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
          >
            Alumnos ({totales.alumnos})
          </button>
          <button 
            onClick={() => setFiltroRol('staff')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${filtroRol === 'staff' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
          >
            Staff ({totales.staff})
          </button>
          <button 
            onClick={() => setFiltroRol('inactivos')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${filtroRol === 'inactivos' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
          >
            Inactivos ({totales.inactivos})
          </button>
          <button 
            onClick={() => setFiltroRol('notificaciones')}
            className={`flex-1 flex items-center justify-center py-2 text-sm font-bold rounded-lg transition-colors relative ${filtroRol === 'notificaciones' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
          >
            <Bell size={16} className="mr-1" />
            Notificaciones
            {notificacionesAdmin.length > 0 && (
              <span className="absolute top-1 right-2 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
            )}
          </button>
        </div>
      </header>

      {/* Lista de Notificaciones o Usuarios */}
      <div className="px-5 mt-6 space-y-4">
        {filtroRol === 'notificaciones' ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-gray-800">Avisos del Sistema</h3>
              {notificacionesAdmin.length > 0 && (
                <button 
                  onClick={() => {
                    if(window.confirm('¿Borrar todas las notificaciones?')) {
                      borrarTodasLasNotificaciones(db, 'admin');
                    }
                  }}
                  className="flex items-center text-xs text-red-500 font-bold hover:bg-red-50 px-2 py-1 rounded transition-colors"
                >
                  <Trash2 size={14} className="mr-1" />
                  Borrar todas
                </button>
              )}
            </div>
            
            {notificacionesAdmin.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center shadow-sm">
                <Bell className="mx-auto text-gray-300 mb-3" size={32} />
                <p className="font-bold text-gray-600">No hay notificaciones nuevas</p>
                <p className="text-sm text-gray-400 mt-1">Acá vas a ver avisos de pagos y nuevos alumnos.</p>
              </div>
            ) : (
              notificacionesAdmin.map(notif => (
                <div key={notif.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative group transition-all hover:shadow-md">
                  <button 
                    onClick={() => borrarNotificacion(db, notif.id)}
                    className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition-colors bg-white rounded-full p-1"
                  >
                    <XCircle size={20} />
                  </button>
                  <div className="flex items-start space-x-3 pr-8">
                    <div className="bg-blue-50 text-blue-500 p-2 rounded-full">
                      <Bell size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm mb-1">{notif.titulo}</h4>
                      <p className="text-sm text-gray-600">
                        {(() => {
                          if (notif.mensaje.includes('**')) {
                            return notif.mensaje.split('**').map((parte, i) => 
                              i % 2 === 1 ? <span key={i} className="font-bold text-blue-600">{parte}</span> : parte
                            );
                          }
                          const match = notif.mensaje.match(/^(.*?)( se ha registrado| ha avisado)(.*)$/i);
                          if (match) {
                            return (
                              <>
                                <span className="font-bold text-blue-600">{match[1]}</span>
                                {match[2]}{match[3]}
                              </>
                            );
                          }
                          return notif.mensaje;
                        })()}
                      </p>
                      <span className="text-[10px] text-gray-400 font-medium block mt-2">
                        {new Date(notif.fecha).toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          usuariosFiltrados.map(usuario => {
            const isStaff = ['admin', 'superadmin'].includes(usuario.rol);
            const isInactive = usuario.estado === 'inactivo';

            return (
              <div key={usuario.id} className={`bg-white p-4 rounded-2xl shadow-sm border ${isStaff ? 'border-primary-pagos border-opacity-30' : 'border-gray-100'} relative overflow-hidden transition-all hover:shadow-md`}>
                
                {/* Borde izquierdo decorativo para staff */}
                {isStaff && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-pagos"></div>}

                <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${
                    isStaff ? 'bg-primary-pagos text-white shadow-sm' : 
                    isInactive ? 'bg-gray-100 text-gray-400' : 'bg-primary-asistencia bg-opacity-10 text-primary-asistencia'
                  }`}>
                    {isStaff ? <ShieldAlert size={20} /> : getIniciales(usuario.nombre)}
                  </div>
                  
                  <div>
                    <h3 className={`font-bold text-lg flex items-center gap-2 ${isInactive ? 'text-gray-400' : 'text-gray-800'}`}>
                      {usuario.nombre} {usuario.apellido || ''}
                      {isUsuarioNuevo(usuario) && (
                        <span className="bg-amber-100 text-amber-700 text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-md">
                          NUEVO
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center mt-1 space-x-2">
                      {isStaff ? (
                        <span className="bg-primary-pagos bg-opacity-10 text-primary-pagos text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                          {usuario.rol === 'superadmin' ? 'Propietario' : 'Profesor'}
                        </span>
                      ) : usuario.isPreRegistro ? (
                        <span className="bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                          Invitado
                        </span>
                      ) : (
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isInactive ? 'bg-gray-100 text-gray-500' : 'bg-primary-turnos bg-opacity-10 text-primary-turnos'
                        }`}>
                          Alumno
                        </span>
                      )}
                      
                      {usuario.isPreRegistro && (
                        <span className="text-orange-400 text-[10px] font-bold uppercase tracking-wider">
                          (Pendiente)
                        </span>
                      )}

                      {isInactive && !usuario.isPreRegistro && (
                        <span className="bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                          Inactivo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {usuario.rol !== 'superadmin' && (
                <div className="relative">
                  <button 
                    onClick={() => setMenuAbiertoId(menuAbiertoId === usuario.id ? null : usuario.id)}
                    className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-50 transition-colors"
                  >
                    <MoreVertical size={20} />
                  </button>

                  {/* Dropdown Menu */}
                  {menuAbiertoId === usuario.id && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-10 py-1 overflow-hidden">
                      {isInactive ? (
                        <button 
                          onClick={() => handleReactivar(usuario)}
                          className="w-full text-left px-4 py-3 text-sm font-semibold text-green-600 hover:bg-green-50 flex items-center transition-colors"
                        >
                          <RefreshCcw size={16} className="mr-2" />
                          Reactivar Usuario
                        </button>
                      ) : (
                        <>
                          {usuario.rol === 'alumno' && (
                            <button 
                              onClick={() => {
                                setAlumnoEditandoHorarios(usuario);
                                setIsModificarHorariosOpen(true);
                                setMenuAbiertoId(null);
                              }}
                              className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center transition-colors border-b border-gray-50"
                            >
                              <Calendar size={16} className="mr-2 text-primary-turnos" />
                              Modificar horarios
                            </button>
                          )}
                          <button 
                            onClick={() => handleArchivar(usuario)}
                            className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center transition-colors"
                          >
                            <Archive size={16} className="mr-2" />
                            Archivar Usuario
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                )}
              </div>

              {/* Detalles de Contacto (Plegables visualmente) */}
              <div className="mt-4 pt-3 border-t border-gray-50 grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center text-gray-500 text-xs font-medium">
                  <Mail size={14} className="mr-2 opacity-70" />
                  {usuario.email}
                </div>
                <div className="flex items-center text-gray-500 text-xs font-medium">
                  <Phone size={14} className="mr-2 opacity-70" />
                  {usuario.telefono}
                </div>
              </div>
            </div>
          );
        })
        )}

        {usuariosFiltrados.length === 0 && filtroRol !== 'notificaciones' && (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center shadow-sm mt-4">
            <Users className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="font-bold text-gray-700 text-lg mb-1">Sin usuarios</p>
            <p className="text-sm text-gray-500">No se encontraron usuarios o el directorio está vacío.</p>
          </div>
        )}
      </div>

      {/* Modal: Nuevo Profesor */}
      <Modal
        isOpen={isProfeModalOpen}
        onClose={() => setIsProfeModalOpen(false)}
        title="Nuevo Profesor"
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre Completo</label>
            <input
              type="text"
              value={profeForm.nombre}
              onChange={(e) => setProfeForm({ ...profeForm, nombre: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-pagos focus:bg-white transition-colors"
              placeholder="Ej. María López"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email</label>
            <input
              type="email"
              value={profeForm.email}
              onChange={(e) => {
                let val = e.target.value;
                val = val.split(' ')[0].replace(/\s/g, '').toLowerCase();
                setProfeForm({ ...profeForm, email: val });
              }}
              className={`w-full bg-gray-50 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-pagos focus:bg-white transition-colors ${profeForm.email && !isEmailValido(profeForm.email) ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-200'}`}
              placeholder="Ej. maria@gmail.com"
            />
            {profeForm.email && !isEmailValido(profeForm.email) && (
              <p className="text-red-500 text-xs mt-1.5 font-semibold flex items-center">
                <AlertCircle size={14} className="mr-1 inline" />
                Solo Gmail, Hotmail, Outlook, Yahoo o Live.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Teléfono</label>
            <input
              type="tel"
              value={profeForm.telefono}
              onChange={(e) => setProfeForm({ ...profeForm, telefono: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-pagos focus:bg-white transition-colors"
              placeholder="Opcional"
            />
          </div>
          <button
            onClick={handleGuardarProfesor}
            disabled={isSavingProfe}
            className="w-full bg-primary-pagos text-white font-bold py-4 rounded-xl shadow-md active:scale-95 transition-transform flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {isSavingProfe ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <><UserPlus size={20} className="mr-2" /> Pre-cargar Profesor</>
            )}
          </button>
        </div>
      </Modal>

      {/* Modal: Éxito */}
      <Modal
        isOpen={isProfeSuccess}
        onClose={() => setIsProfeSuccess(false)}
        title=""
      >
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Check size={80} className="text-green-500 mb-4 bg-green-50 p-4 rounded-full" />
          <h2 className="text-2xl font-black text-gray-800 mb-2">Pre-carga Exitosa</h2>
          <p className="text-gray-600 text-sm px-4">
            El perfil de <strong>{profeForm.nombre}</strong> se pre-cargó como Profesor. Ya puede crear su cuenta en la aplicación con su email.
          </p>
          <button
            onClick={() => {
              setIsProfeSuccess(false);
              setProfeForm({ nombre: '', email: '', telefono: '' });
            }}
            className="mt-8 w-full py-4 bg-gray-100 text-gray-800 font-bold rounded-xl active:bg-gray-200 transition-colors"
          >
            Aceptar
          </button>
        </div>
      </Modal>

      {/* Modal: Modificar Horarios */}
      <ModificarHorariosModal
        isOpen={isModificarHorariosOpen}
        onClose={() => setIsModificarHorariosOpen(false)}
        alumno={alumnoEditandoHorarios}
      />

    </div>
  );
}
