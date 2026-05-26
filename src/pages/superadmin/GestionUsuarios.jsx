import { useState } from 'react';
import { Users, Search, ShieldAlert, MoreVertical, Mail, Phone, UserPlus, Archive, RefreshCcw } from 'lucide-react';
import { db } from '../../config/firebase';
import { archivarUsuario, reactivarUsuario } from '../../services/authService';

import { useAdminStore } from '../../store/adminStore';

export default function GestionUsuarios() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos'); // 'todos', 'alumno', 'staff', 'inactivos'
  const [menuAbiertoId, setMenuAbiertoId] = useState(null);

  const { usuarios, preRegistros, usuariosInactivos, preRegistrosInactivos } = useAdminStore();
  
  const todosLosUsuarios = filtroRol === 'inactivos' 
    ? [
        ...usuariosInactivos.map(u => ({ ...u, isPreRegistro: false })),
        ...preRegistrosInactivos.map(p => ({ ...p, isPreRegistro: true, rol: 'alumno' }))
      ]
    : [
        ...usuarios.map(u => ({ ...u, isPreRegistro: false })),
        ...preRegistros.map(p => ({ ...p, isPreRegistro: true, rol: 'alumno' }))
      ];

  // Filtrado de usuarios
  const usuariosFiltrados = todosLosUsuarios.filter(u => {
    const matchesSearch = u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesRole = true;
    if (filtroRol === 'alumno') matchesRole = u.rol === 'alumno';
    if (filtroRol === 'staff') matchesRole = ['admin', 'superadmin'].includes(u.rol);

    return matchesSearch && matchesRole;
  });

  const totales = {
    alumnos: usuarios.filter(u => u.rol === 'alumno').length + preRegistros.length,
    staff: usuarios.filter(u => ['admin', 'superadmin'].includes(u.rol)).length,
    inactivos: usuariosInactivos.length + preRegistrosInactivos.length
  };

  const getIniciales = (nombre) => {
    return nombre.substring(0, 2).toUpperCase();
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
          <button className="bg-primary-pagos text-white p-3 rounded-full shadow-md active:scale-95 transition-transform">
            <UserPlus size={20} />
          </button>
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
            onClick={() => setFiltroRol('todos')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${filtroRol === 'todos' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
          >
            Todos
          </button>
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
        </div>
      </header>

      {/* Lista de Usuarios */}
      <div className="px-5 mt-6 space-y-4">
        {usuariosFiltrados.map(usuario => {
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
                  
                  {/* Info */}
                  <div>
                    <h3 className={`font-bold text-lg ${isInactive ? 'text-gray-400' : 'text-gray-800'}`}>
                      {usuario.nombre}
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
                          Reactivar Alumno
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleArchivar(usuario)}
                          className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center transition-colors"
                        >
                          <Archive size={16} className="mr-2" />
                          Archivar Alumno
                        </button>
                      )}
                    </div>
                  )}
                </div>
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
        })}

        {usuariosFiltrados.length === 0 && (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center shadow-sm mt-4">
            <Users className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="font-bold text-gray-700 text-lg mb-1">Sin usuarios</p>
            <p className="text-sm text-gray-500">No se encontraron usuarios o el directorio está vacío.</p>
          </div>
        )}
      </div>

    </div>
  );
}
