import { useState } from 'react';
import { Calendar as CalendarIcon, Users, Clock, ChevronRight } from 'lucide-react';

// Hardcoded mock data for the demo
const DIAS_SEMANA = [
  { id: 'lun', nombre: 'Lun', fecha: '11', completo: 'Lunes 11 de Mayo' },
  { id: 'mar', nombre: 'Mar', fecha: '12', completo: 'Martes 12 de Mayo' },
  { id: 'mie', nombre: 'Mié', fecha: '13', completo: 'Miércoles 13 de Mayo' },
  { id: 'jue', nombre: 'Jue', fecha: '14', completo: 'Jueves 14 de Mayo' },
  { id: 'vie', nombre: 'Vie', fecha: '15', completo: 'Viernes 15 de Mayo' },
];

const CLASES_MOCK = {
  'lun': [
    { id: 1, hora: '08:00', tipo: 'Pilates Reformer', ocupacion: 8, capacidad: 8, profe: 'Belén' },
    { id: 2, hora: '09:00', tipo: 'Pilates Reformer', ocupacion: 6, capacidad: 8, profe: 'Belén' },
    { id: 3, hora: '14:00', tipo: 'Pilates Reformer', ocupacion: 4, capacidad: 8, profe: 'Laura' },
    { id: 4, hora: '18:00', tipo: 'Pilates Reformer', ocupacion: 8, capacidad: 8, profe: 'Belén' },
  ],
  'mar': [
    { id: 5, hora: '09:00', tipo: 'Pilates Reformer', ocupacion: 5, capacidad: 8, profe: 'Belén' },
    { id: 6, hora: '10:00', tipo: 'Pilates Reformer', ocupacion: 8, capacidad: 8, profe: 'Belén' },
    { id: 7, hora: '15:00', tipo: 'Pilates Reformer', ocupacion: 2, capacidad: 8, profe: 'Laura' },
    { id: 8, hora: '19:00', tipo: 'Pilates Reformer', ocupacion: 7, capacidad: 8, profe: 'Belén' },
    { id: 9, hora: '20:00', tipo: 'Pilates Reformer', ocupacion: 8, capacidad: 8, profe: 'Belén' },
  ],
  'mie': [
    { id: 10, hora: '08:00', tipo: 'Pilates Reformer', ocupacion: 8, capacidad: 8, profe: 'Belén' },
    { id: 11, hora: '14:00', tipo: 'Pilates Reformer', ocupacion: 3, capacidad: 8, profe: 'Laura' },
    { id: 12, hora: '18:00', tipo: 'Pilates Reformer', ocupacion: 6, capacidad: 8, profe: 'Belén' },
  ],
  'jue': [
    { id: 13, hora: '09:00', tipo: 'Pilates Reformer', ocupacion: 8, capacidad: 8, profe: 'Belén' },
    { id: 14, hora: '16:00', tipo: 'Pilates Reformer', ocupacion: 5, capacidad: 8, profe: 'Belén' },
    { id: 15, hora: '19:00', tipo: 'Pilates Reformer', ocupacion: 8, capacidad: 8, profe: 'Belén' },
  ],
  'vie': [
    { id: 16, hora: '08:00', tipo: 'Pilates Reformer', ocupacion: 4, capacidad: 8, profe: 'Belén' },
    { id: 17, hora: '10:00', tipo: 'Pilates Reformer', ocupacion: 8, capacidad: 8, profe: 'Laura' },
    { id: 18, hora: '18:00', tipo: 'Pilates Reformer', ocupacion: 7, capacidad: 8, profe: 'Belén' },
  ],
};

export default function CalendarioGlobal() {
  const [diaSeleccionado, setDiaSeleccionado] = useState('mar');

  const clasesDelDia = CLASES_MOCK[diaSeleccionado] || [];
  const diaInfo = DIAS_SEMANA.find(d => d.id === diaSeleccionado);

  return (
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

        {/* Selector de Días Horizontal */}
        <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
          {DIAS_SEMANA.map((dia) => {
            const isSelected = dia.id === diaSeleccionado;
            return (
              <button
                key={dia.id}
                onClick={() => setDiaSeleccionado(dia.id)}
                className={`flex flex-col items-center justify-center min-w-[4rem] py-3 rounded-2xl transition-all active:scale-95 ${
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
                    <span className="text-sm font-semibold text-gray-500">{clase.tipo} • Profe: {clase.profe}</span>
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
                  <button className="flex items-center justify-between w-full text-sm font-bold text-primary-turnos group">
                    Ver lista de asistencia
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}

          {clasesDelDia.length === 0 && (
            <div className="text-center py-10 bg-white rounded-2xl shadow-sm border border-gray-100">
              <p className="text-gray-500 font-medium">No hay clases programadas para este día.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
