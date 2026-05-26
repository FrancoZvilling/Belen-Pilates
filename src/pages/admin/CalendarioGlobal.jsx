import { useState } from 'react';
import { Calendar as CalendarIcon, Users, Clock, ChevronRight, ChevronLeft, UserCheck } from 'lucide-react';
import Modal from '../../components/common/Modal';

import { useAdminStore } from '../../store/adminStore';
import { useMockStore } from '../../store/mockStore';

const getWeekDays = (weekOffset = 0) => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const curr = new Date(utc + (3600000 * -3)); // UTC-3 (Argentina)
  
  // Si hoy es Sábado (6) o Domingo (0), adelantamos el calendario para mostrar la semana que viene
  if (curr.getDay() === 6) curr.setDate(curr.getDate() + 2);
  if (curr.getDay() === 0) curr.setDate(curr.getDate() + 1);

  // Aplicar el offset de semanas
  curr.setDate(curr.getDate() + (weekOffset * 7));

  // Ajustar al lunes de la semana actual calculada
  const dayOfWeek = curr.getDay() === 0 ? 7 : curr.getDay(); // 1=Lunes, 7=Domingo
  const first = curr.getDate() - dayOfWeek + 1;
  
  const days = [];
  const mapIds = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
  const mapNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const mapCompletos = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // Generamos de Lunes (1) a Viernes (5)
  for (let i = 1; i <= 5; i++) {
    const dayDate = new Date(curr);
    dayDate.setDate(first + i - 1);
    
    const isoDate = `${dayDate.getFullYear()}-${String(dayDate.getMonth()+1).padStart(2,'0')}-${String(dayDate.getDate()).padStart(2,'0')}`;
    
    days.push({
      id: mapIds[i],
      nombre: mapNombres[i],
      nombreLargo: mapCompletos[i],
      fecha: dayDate.getDate().toString(),
      completo: `${mapCompletos[i]} ${dayDate.getDate()} de ${meses[dayDate.getMonth()]}`,
      isoDate: isoDate
    });
  }
  return days;
};

export default function CalendarioGlobal() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [claseSeleccionada, setClaseSeleccionada] = useState(null);
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const argDate = new Date(utc + (3600000 * -3)); // UTC-3
    const dayCode = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'][argDate.getDay()];
    return ['lun', 'mar', 'mie', 'jue', 'vie'].includes(dayCode) ? dayCode : 'lun';
  });

  const DIAS_SEMANA = getWeekDays(weekOffset);

  const { usuarios, preRegistros } = useAdminStore();

  const todosLosUsuarios = [...usuarios, ...preRegistros];
  const diaInfo = DIAS_SEMANA.find(d => d.id === diaSeleccionado);
  
  // Generar clases dinámicamente basadas en los turnos de los alumnos
  const clasesDelDia = [];
  
  // Encontrar todos los horarios únicos en los que hay algún alumno anotado hoy
  const horariosDelDia = new Set();
  todosLosUsuarios.forEach(u => {
    u.turnos_fijos?.forEach(t => {
      if (t.dia === diaInfo.nombreLargo) {
        horariosDelDia.add(t.hora);
      }
    });
  });

  // Convertir a array y ordenar cronológicamente
  const horariosOrdenados = Array.from(horariosDelDia).sort((a, b) => {
    return parseInt(a.split(':')[0]) - parseInt(b.split(':')[0]);
  });

  horariosOrdenados.forEach(hora => {
    const usuariosEnClase = todosLosUsuarios.filter(u => 
      u.turnos_fijos?.some(t => t.dia === diaInfo.nombreLargo && t.hora === hora)
    );

    clasesDelDia.push({
      id: `${diaSeleccionado}-${hora}`,
      hora: hora,
      tipo: 'Clase de Pilates',
      ocupacion: usuariosEnClase.length,
      capacidad: 8,
      usuarios: usuariosEnClase
    });
  });

  return (
    <>
      <div className="bg-gray-50 min-h-screen pb-24 font-sans">
      
      {/* Header Fijo */}
      <header className="px-5 pt-8 pb-4 bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] sticky top-0 z-20">
        <div className="flex items-center mb-6">
          <div className="bg-primary-turnos bg-opacity-10 p-3 rounded-full text-primary-turnos mr-4">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-800">Calendario Global</h1>
            <p className="text-sm font-semibold text-gray-500 mt-1">Agenda del Estudio</p>
          </div>
        </div>

        {/* Controles de Semana */}
        <div className="flex items-center justify-between mb-4 px-1">
          <button 
            onClick={() => setWeekOffset(prev => prev - 1)}
            className="p-1.5 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100 transition-colors active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-bold text-gray-600">
            {weekOffset === 0 ? 'Esta Semana' : weekOffset === 1 ? 'Semana Próxima' : weekOffset === -1 ? 'Semana Pasada' : weekOffset > 1 ? `En ${weekOffset} Semanas` : `Hace ${Math.abs(weekOffset)} Semanas`}
          </span>
          <button 
            onClick={() => setWeekOffset(prev => prev + 1)}
            className="p-1.5 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100 transition-colors active:scale-95"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Selector de Días Horizontal */}
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide justify-between">
          {DIAS_SEMANA.map((dia) => {
            const isSelected = dia.id === diaSeleccionado;
            return (
              <button
                key={dia.id}
                onClick={() => setDiaSeleccionado(dia.id)}
                className={`flex flex-col items-center justify-center flex-1 min-w-[3.5rem] py-3 rounded-2xl transition-all active:scale-95 ${
                  isSelected 
                    ? 'bg-primary-turnos text-white shadow-md' 
                    : 'bg-white border border-gray-200 text-gray-500 hover:border-primary-turnos'
                }`}
              >
                <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${isSelected ? 'text-blue-100' : ''}`}>
                  {dia.nombre}
                </span>
                <span className={`text-xl font-black ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                  {dia.fecha}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Contenido del Día */}
      <div className="px-5 mt-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">{diaInfo.completo}</h2>
        
        <div className="space-y-4">
          {clasesDelDia.map((clase) => {
            const isLleno = clase.ocupacion === clase.capacidad;
            const porcentaje = (clase.ocupacion / clase.capacidad) * 100;
            
            return (
              <div 
                key={clase.id} 
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden"
              >
                {/* Indicador lateral de color */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isLleno ? 'bg-red-400' : 'bg-primary-turnos'}`}></div>

                <div className="flex justify-between items-start mb-4 pl-2">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <Clock size={16} className="text-primary-turnos" />
                      <h3 className="text-xl font-black text-gray-800">{clase.hora} hs</h3>
                    </div>
                    <span className="text-sm font-semibold text-gray-500">{clase.tipo}</span>
                  </div>
                  
                  {isLleno ? (
                    <span className="bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full">
                      Completo
                    </span>
                  ) : (
                    <span className="bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full">
                      Disponible
                    </span>
                  )}
                </div>

                {/* Barra de Ocupación */}
                <div className="pl-2">
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center text-gray-600 text-sm font-medium">
                      <Users size={14} className="mr-1.5" />
                      Alumnos
                    </div>
                    <span className="text-sm font-bold text-gray-800">
                      {clase.ocupacion} <span className="text-gray-400">/ {clase.capacidad}</span>
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-1000 ${
                        isLleno ? 'bg-red-400' : 'bg-primary-turnos'
                      }`}
                      style={{ width: `${porcentaje}%` }}
                    ></div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-50 pl-2">
                  <button 
                    onClick={() => setClaseSeleccionada(clase)}
                    className="flex items-center justify-between w-full text-sm font-bold text-primary-turnos group"
                  >
                    Ver lista de asistencia
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}

          {clasesDelDia.length === 0 && (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center shadow-sm">
              <CalendarIcon className="mx-auto text-gray-300 mb-3" size={40} />
              <p className="font-bold text-gray-700 text-lg mb-1">Sin clases programadas</p>
              <p className="text-sm text-gray-500">Todavía no hay clases cargadas en la grilla para este día.</p>
            </div>
          )}
        </div>
      </div>

    </div>

      {/* Modal de Lista de Asistencia */}
      <Modal 
        isOpen={!!claseSeleccionada} 
        onClose={() => setClaseSeleccionada(null)}
        title={claseSeleccionada ? `Asistencia - ${claseSeleccionada.hora} hs` : ''}
      >
        {claseSeleccionada && (
          <div className="space-y-3">
            <div className="bg-gray-50 p-3 rounded-xl mb-4 flex justify-between items-center">
              <span className="text-sm font-bold text-gray-600">Total inscriptos</span>
              <span className="text-sm font-black text-primary-turnos">{claseSeleccionada.ocupacion} / {claseSeleccionada.capacidad}</span>
            </div>

            {claseSeleccionada.usuarios?.length > 0 ? (
              claseSeleccionada.usuarios.map(usuario => {
                const historial = usuario.historial_asistencias || [];
                const registro = historial.find(h => h.fecha === diaInfo.isoDate && h.hora === claseSeleccionada.hora);
                
                return (
                <div key={usuario.id || usuario.nombre} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-turnos bg-opacity-10 text-primary-turnos rounded-full flex items-center justify-center font-black">
                      {usuario.nombre.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">{usuario.nombre}</h4>
                      {usuario.isPreRegistro && (
                        <p className="text-[10px] text-orange-500 font-bold">Invitado (Sin registro)</p>
                      )}
                    </div>
                  </div>
                  
                  {registro?.estado === 'presente' ? (
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex items-center shadow-sm">
                      <UserCheck size={12} className="mr-1" />
                      Presente
                    </span>
                  ) : registro?.estado === 'ausente' ? (
                    <span className="bg-orange-100 text-orange-600 text-xs font-bold px-3 py-1 rounded-full flex items-center shadow-sm">
                      <Clock size={12} className="mr-1" />
                      Ausente
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full flex items-center">
                      <Clock size={12} className="mr-1" />
                      Pendiente
                    </span>
                  )}
                </div>
              )})
            ) : (
              <div className="text-center py-6 text-gray-500">
                <UserCheck size={32} className="mx-auto text-gray-300 mb-2" />
                <p>No hay alumnos anotados.</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
