import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useAdminStore } from '../../store/adminStore';
import CamillaCard from '../../components/specific/CamillaCard';
import { ChevronLeft, ChevronRight, CalendarDays, Info } from 'lucide-react';

export default function AsistenciasDiarias() {
  const logout = useAuthStore(state => state.logout);
  const { usuarios, preRegistros } = useAdminStore();

  const todosLosUsuarios = [...usuarios, ...preRegistros];

  // Calcular la hora actual de Argentina
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const argDate = new Date(utc + (3600000 * -3));

  const dayIndex = argDate.getDay();
  const diasMapLargo = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const todayStringLargo = diasMapLargo[dayIndex];
  
  const fechaIsoString = `${argDate.getFullYear()}-${String(argDate.getMonth()+1).padStart(2,'0')}-${String(argDate.getDate()).padStart(2,'0')}`;
  
  const currentHourDecimal = argDate.getHours() + (argDate.getMinutes() / 60);

  // Extraer clases del día reales
  const clasesDelDia = useMemo(() => {
    const horarios = new Set();
    todosLosUsuarios.forEach(u => {
      u.turnos_fijos?.forEach(t => {
        if (t.dia === todayStringLargo) {
          horarios.add(t.hora);
        }
      });
    });
    
    return Array.from(horarios).sort((a, b) => {
      return parseInt(a.split(':')[0]) - parseInt(b.split(':')[0]);
    });
  }, [todosLosUsuarios, todayStringLargo]);

  const [classIndex, setClassIndex] = useState(0);

  // Efecto para auto-seleccionar la clase más próxima en el montaje inicial
  useEffect(() => {
    if (clasesDelDia.length > 0) {
      let foundIndex = -1;
      for (let i = 0; i < clasesDelDia.length; i++) {
        const classHourInt = parseInt(clasesDelDia[i].split(':')[0]);
        if (currentHourDecimal < classHourInt + 1) {
          foundIndex = i;
          break;
        }
      }
      
      if (foundIndex !== -1) {
        setClassIndex(foundIndex);
      } else {
        setClassIndex(clasesDelDia.length - 1);
      }
    }
  }, [clasesDelDia.length, currentHourDecimal]);

  // Datos de la clase actual
  const horaSeleccionada = clasesDelDia[classIndex];
  const usuariosEnClase = useMemo(() => {
    if (!horaSeleccionada) return [];
    return todosLosUsuarios.filter(u => 
      u.turnos_fijos?.some(t => t.dia === todayStringLargo && t.hora === horaSeleccionada)
    );
  }, [horaSeleccionada, todosLosUsuarios, todayStringLargo]);

  // Estado local para mockear el botón de presente
  const [asistenciasTemp, setAsistenciasTemp] = useState({});

  useEffect(() => {
    setAsistenciasTemp({});
  }, [classIndex]);

  const marcarPresenteLocal = (idCamilla) => {
    setAsistenciasTemp(prev => {
      const actual = prev[idCamilla] || 'reservada';
      return { ...prev, [idCamilla]: actual === 'reservada' ? 'presente' : 'reservada' };
    });
  };

  // Distribuir en las 8 camillas
  const camillasActuales = Array.from({ length: 8 }, (_, i) => {
    const usuario = usuariosEnClase[i];
    const id = `c${i+1}`;
    if (usuario) {
      const historial = usuario.historial_asistencias || [];
      const registro = historial.find(h => h.fecha === fechaIsoString && h.hora === horaSeleccionada);
      
      let estadoDB = 'reservada';
      if (registro?.estado === 'presente') estadoDB = 'presente';
      else if (registro?.estado === 'ausente') estadoDB = 'ausente';
      
      // Estado local de admin prevalece sobre el de la BD
      const finalEstado = asistenciasTemp[id] ? asistenciasTemp[id] : estadoDB;

      return {
        id: id,
        estado: finalEstado,
        alumno: usuario.nombre
      };
    } else {
      return {
        id: id,
        estado: 'libre',
        alumno: null
      };
    }
  });

  const formatearFecha = () => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${todayStringLargo} ${argDate.getDate()} de ${meses[argDate.getMonth()]}`;
  };

  const handleNext = () => {
    if (classIndex < clasesDelDia.length - 1) setClassIndex(classIndex + 1);
  };
  
  const handlePrev = () => {
    if (classIndex > 0) setClassIndex(classIndex - 1);
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24 font-sans">
      
      {/* Header and Controls */}
      <header className="px-5 pt-8 pb-6 bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={handlePrev}
            disabled={classIndex === 0}
            className={`p-2 rounded-full transition-transform ${classIndex === 0 ? 'bg-gray-50 text-gray-300' : 'bg-gray-100 text-gray-600 active:scale-95'}`}
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="text-center">
            <h1 className="text-2xl font-black text-gray-800">Clase: {horaSeleccionada ? `${horaSeleccionada} hs` : 'Sin clases'}</h1>
            <p className="text-sm font-semibold text-primary-turnos mt-1 flex items-center justify-center">
              <CalendarDays size={14} className="mr-1" />
              {formatearFecha()}
            </p>
          </div>

          <button 
            onClick={handleNext}
            disabled={classIndex === clasesDelDia.length - 1}
            className={`p-2 rounded-full transition-transform ${classIndex === clasesDelDia.length - 1 ? 'bg-gray-50 text-gray-300' : 'bg-gray-100 text-gray-600 active:scale-95'}`}
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </header>

      {/* Stats Summary */}
      <div className="px-5 py-4">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-center flex-1">
            <span className="block text-2xl font-black text-primary-asistencia">
              {camillasActuales.filter(c => c.estado === 'presente').length}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Presentes</span>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="text-center flex-1">
            <span className="block text-2xl font-black text-primary-turnos">
              {camillasActuales.filter(c => c.estado === 'reservada').length}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Pendientes</span>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="text-center flex-1">
            <span className="block text-2xl font-black text-gray-400">
              {camillasActuales.filter(c => c.estado === 'libre').length}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Libres</span>
          </div>
        </div>
      </div>

      {/* Grid de Camillas */}
      <div className="px-5 mt-2">
        <h2 className="text-lg font-bold text-gray-800 mb-4 px-1">Distribución de Camillas</h2>
        
        {!horaSeleccionada ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center shadow-sm">
            <Info className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="font-bold text-gray-700 text-lg mb-1">Día sin clases</p>
            <p className="text-sm text-gray-500">No hay grilla configurada para el día de hoy.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {camillasActuales.map(camilla => (
              <CamillaCard 
                key={camilla.id} 
                camilla={camilla} 
                onMarcarPresente={marcarPresenteLocal}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
