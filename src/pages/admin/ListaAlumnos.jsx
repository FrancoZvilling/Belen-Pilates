import { useState } from 'react';
import { Users, Search, Calendar } from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import ModificarHorariosModal from '../../components/admin/ModificarHorariosModal';

export default function ListaAlumnos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModificarHorariosOpen, setIsModificarHorariosOpen] = useState(false);
  const [alumnoEditandoHorarios, setAlumnoEditandoHorarios] = useState(null);

  const { usuarios, preRegistros } = useAdminStore();
  
  // Combinar usuarios y pre-registros, filtrando solo los que tienen rol 'alumno'
  const todosLosUsuarios = [
    ...usuarios.map(u => ({ ...u, isPreRegistro: false })),
    ...preRegistros.map(p => ({ ...p, isPreRegistro: true, rol: p.rol || 'alumno' }))
  ];

  const alumnos = todosLosUsuarios.filter(u => u.rol === 'alumno');

  // Filtrado de usuarios por búsqueda
  const usuariosFiltrados = alumnos.filter(u => {
    return u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
           (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));
  }).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const getIniciales = (nombre) => {
    return nombre ? nombre.substring(0, 2).toUpperCase() : 'US';
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      
      {/* Header Fijo */}
      <div className="bg-white px-5 pt-8 pb-4 sticky top-0 z-20 shadow-sm border-b border-gray-100">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
          <Users className="text-primary-turnos w-8 h-8" />
          Alumnos
        </h1>
        <p className="text-gray-500 text-sm mt-1 font-medium">
          Lista completa de alumnos de la academia.
        </p>

        {/* Buscador */}
        <div className="mt-5 relative">
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-100 border-none rounded-xl text-gray-800 focus:ring-2 focus:ring-primary-turnos transition-all text-sm font-medium placeholder:text-gray-400"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        </div>
      </div>

      {/* Lista de Alumnos */}
      <div className="px-5 py-6">
        <div className="space-y-4">
          {usuariosFiltrados.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No se encontraron alumnos.</p>
            </div>
          ) : (
            usuariosFiltrados.map((usuario) => (
              <div 
                key={usuario.id} 
                className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4 transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-600 font-bold text-xl shadow-inner shrink-0">
                    {getIniciales(usuario.nombre)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-lg truncate flex items-center gap-2">
                      {usuario.nombre} {usuario.apellido || ''}
                      {isUsuarioNuevo(usuario) && (
                        <span className="bg-amber-100 text-amber-700 text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-md">
                          NUEVO
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 truncate mt-0.5 font-medium">{usuario.email}</p>
                    <p className="text-xs text-gray-400 font-medium mt-1">Tel: {usuario.telefono || 'No registrado'}</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      setAlumnoEditandoHorarios(usuario);
                      setIsModificarHorariosOpen(true);
                    }}
                    className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 border border-gray-200"
                  >
                    <Calendar size={16} />
                    Modificar Horarios
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isModificarHorariosOpen && alumnoEditandoHorarios && (
        <ModificarHorariosModal
          isOpen={isModificarHorariosOpen}
          onClose={() => {
            setIsModificarHorariosOpen(false);
            setAlumnoEditandoHorarios(null);
          }}
          alumno={alumnoEditandoHorarios}
        />
      )}
    </div>
  );
}
