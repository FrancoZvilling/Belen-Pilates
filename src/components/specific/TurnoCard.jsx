import { Calendar, Clock, RefreshCw, XCircle, CheckCircle, AlertCircle } from 'lucide-react';

export default function TurnoCard({ turno, onCambiar, onCancelar }) {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const now = new Date(utc + (3600000 * -3)); // Arg time

  let isCancelable = true;
  if (turno.fechaIsoString && turno.hora) {
    const classDate = new Date(`${turno.fechaIsoString}T${turno.hora}:00-03:00`);
    const diffMs = classDate - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 2) {
      isCancelable = false;
    }
  }

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

      {turno.estadoEspecial === 'feriado' ? (
        <div className="mt-4 flex items-center justify-center py-2.5 bg-red-50 text-red-700 font-bold rounded-lg text-sm border border-red-200">
          <Calendar size={16} className="mr-2" />
          Clase Suspendida por Feriado
        </div>
      ) : turno.isCancelado ? (
        <div className="mt-4 flex items-center justify-center py-2.5 bg-gray-100 text-gray-500 font-bold rounded-lg text-sm border border-gray-200">
          <XCircle size={16} className="mr-2" />
          Cancelado
        </div>
      ) : turno.isPresente ? (
        <div className="mt-4 flex items-center justify-center py-2.5 bg-green-50 text-green-700 font-bold rounded-lg text-sm border border-green-100">
          <CheckCircle size={16} className="mr-2" />
          Presente Confirmado
        </div>
      ) : turno.isAusente ? (
        <div className="mt-4 flex items-center justify-center py-2.5 bg-orange-50 text-orange-600 font-bold rounded-lg text-sm border border-orange-100">
          <AlertCircle size={16} className="mr-2" />
          Ausente
        </div>
      ) : !turno.esIntercambiable ? (
        <div className="mt-4 flex items-center justify-center py-2.5 bg-blue-50 text-blue-700 font-bold rounded-lg text-sm border border-blue-100">
          Turno Extra / Recupero (Fijo)
        </div>
      ) : isCancelable ? (
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
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center py-2.5 bg-gray-50 text-gray-500 font-medium rounded-lg text-xs border border-gray-200 text-center px-2">
          <span>Muy cerca del horario para cancelar</span>
          <span className="text-[10px] text-gray-400 mt-0.5">(Límite: 2hs antes)</span>
        </div>
      )}
    </div>
  );
}
