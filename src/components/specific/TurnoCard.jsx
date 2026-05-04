import { Calendar, Clock, RefreshCw, XCircle } from 'lucide-react';

export default function TurnoCard({ turno, onCambiar, onCancelar }) {
  // turno: { id, fecha, hora, tipo }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="bg-primary-asistencia bg-opacity-10 p-3 rounded-lg text-primary-asistencia">
            <Calendar size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 capitalize">{turno.fecha}</h3>
            <div className="flex items-center text-gray-500 text-sm mt-0.5">
              <Clock size={14} className="mr-1" />
              <span>{turno.hora} hs</span>
            </div>
          </div>
        </div>
        {turno.tipo && (
          <span className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
            {turno.tipo}
          </span>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button 
          onClick={() => onCambiar(turno)}
          className="flex-1 flex items-center justify-center py-2.5 bg-primary-asistencia text-white font-semibold rounded-lg text-sm transition-transform active:scale-95"
        >
          <RefreshCw size={16} className="mr-2" />
          Cambiar
        </button>
        <button 
          onClick={() => onCancelar(turno)}
          className="px-4 flex items-center justify-center py-2.5 bg-red-50 text-red-600 font-semibold rounded-lg text-sm transition-colors active:bg-red-100"
          aria-label="Cancelar turno"
        >
          <XCircle size={20} />
        </button>
      </div>
    </div>
  );
}
