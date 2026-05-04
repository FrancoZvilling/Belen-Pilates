import { useState } from 'react';
import { Users, Search, ShieldAlert, MoreVertical, Mail, Phone, UserPlus } from 'lucide-react';

// Hardcoded mock data for the demo
const MOCK_USUARIOS = [
  { id: 1, nombre: 'Ana López', email: 'ana@ejemplo.com', telefono: '11-1234-5678', rol: 'alumno', estado: 'activo' },
  { id: 2, nombre: 'Carlos Ruiz', email: 'carlos@ejemplo.com', telefono: '11-2345-6789', rol: 'alumno', estado: 'activo' },
  { id: 3, nombre: 'Belén (Propietaria)', email: 'belen@pilates.com', telefono: '11-3456-7890', rol: 'superadmin', estado: 'activo' },
  { id: 4, nombre: 'Laura Giménez', email: 'laura.profe@ejemplo.com', telefono: '11-4567-8901', rol: 'admin', estado: 'activo' },
  { id: 5, nombre: 'María Gómez', email: 'maria@ejemplo.com', telefono: '11-5678-9012', rol: 'alumno', estado: 'inactivo' },
  { id: 6, nombre: 'Pedro Martínez', email: 'pedro@ejemplo.com', telefono: '11-6789-0123', rol: 'alumno', estado: 'activo' },
  { id: 7, nombre: 'Lucía Fernández', email: 'lucia@ejemplo.com', telefono: '11-7890-1234', rol: 'alumno', estado: 'activo' },
];

export default function GestionUsuarios() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos'); // 'todos', 'alumno', 'staff'

  // Filtrado de usuarios
  const usuariosFiltrados = MOCK_USUARIOS.filter(u => {
    const matchesSearch = u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesRole = true;
    if (filtroRol === 'alumno') matchesRole = u.rol === 'alumno';
    if (filtroRol === 'staff') matchesRole = ['admin', 'superadmin'].includes(u.rol);

    return matchesSearch && matchesRole;
  });

  const totales = {
    alumnos: MOCK_USUARIOS.filter(u => u.rol === 'alumno').length,
    staff: MOCK_USUARIOS.filter(u => ['admin', 'superadmin'].includes(u.rol)).length,
    inactivos: MOCK_USUARIOS.filter(u => u.estado === 'inactivo').length
  };

  const getIniciales = (nombre) => {
    return nombre.substring(0, 2).toUpperCase();
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
                      ) : (
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isInactive ? 'bg-gray-100 text-gray-500' : 'bg-primary-turnos bg-opacity-10 text-primary-turnos'
                        }`}>
                          Alumno
                        </span>
                      )}
                      
                      {isInactive && (
                        <span className="bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                          Inactivo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button className="text-gray-400 hover:text-gray-600 p-2">
                  <MoreVertical size={20} />
                </button>
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
          <div className="text-center py-10 bg-white rounded-2xl shadow-sm border border-gray-100">
            <Search className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-500 font-medium">No se encontraron usuarios que coincidan con la búsqueda.</p>
          </div>
        )}
      </div>

    </div>
  );
}
