import { useMockStore } from '../../store/mockStore';
import CamillaCard from '../../components/specific/CamillaCard';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

export default function AsistenciasDiarias() {
  const { camillasActuales, marcarPresenteAdmin } = useMockStore();

  return (
    <div className="bg-gray-50 min-h-screen pb-24 font-sans">
      
      {/* Header and Controls */}
      <header className="px-5 pt-8 pb-6 bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <button className="p-2 bg-gray-50 rounded-full text-gray-600 active:scale-95 transition-transform">
            <ChevronLeft size={24} />
          </button>
          
          <div className="text-center">
            <h1 className="text-2xl font-black text-gray-800">Clase: 16:00 hs</h1>
            <p className="text-sm font-semibold text-primary-turnos mt-1 flex items-center justify-center">
              <CalendarDays size={14} className="mr-1" />
              Jueves 14 de Mayo
            </p>
          </div>

          <button className="p-2 bg-gray-50 rounded-full text-gray-600 active:scale-95 transition-transform">
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
        
        <div className="grid grid-cols-2 gap-4">
          {camillasActuales.map(camilla => (
            <CamillaCard 
              key={camilla.id} 
              camilla={camilla} 
              onMarcarPresente={marcarPresenteAdmin}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
