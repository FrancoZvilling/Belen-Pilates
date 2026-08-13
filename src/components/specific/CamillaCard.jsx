import { CheckCircle2, User, Pencil } from 'lucide-react';

export default function CamillaCard({ camilla, onMarcarPresente, asistenciaHabilitada, onVerNota }) {
  const { estado, alumno, nota } = camilla;

  if (estado === 'libre') {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center h-32 opacity-70">
        <span className="text-gray-400 font-bold text-sm text-center">Camilla<br/>Libre</span>
      </div>
    );
  }

  if (estado === 'reservada') {
    return (
      <div className="bg-white border-2 border-primary-turnos rounded-2xl p-4 flex flex-col justify-between h-32 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-8 h-8 bg-primary-turnos bg-opacity-10 rounded-bl-2xl"></div>
        
        <div>
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center space-x-2">
              <User size={16} className="text-gray-400 flex-shrink-0" />
              <h3 className="font-bold text-gray-800 text-sm truncate leading-tight pr-1">{alumno}</h3>
            </div>
            {nota && (
              <button 
                onClick={() => onVerNota(nota)}
                className="text-yellow-500 bg-yellow-50 p-1 rounded-full hover:bg-yellow-100 transition-colors flex-shrink-0 relative z-10"
                title="Ver nota"
              >
                <Pencil size={14} />
                <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              </button>
            )}
          </div>
          <span className="text-xs font-semibold text-primary-turnos uppercase tracking-wider">Pendiente</span>
        </div>

        <button 
          onClick={() => onMarcarPresente(camilla.usuarioId)}
          disabled={!asistenciaHabilitada}
          className={`w-full mt-2 text-xs font-bold py-2 rounded-xl transition-transform ${
            asistenciaHabilitada 
              ? 'bg-primary-turnos text-white active:scale-95' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Marcar Presente
        </button>
      </div>
    );
  }

  if (estado === 'presente') {
    return (
      <div className="bg-primary-asistencia bg-opacity-10 border-2 border-primary-asistencia rounded-2xl p-4 flex flex-col justify-between h-32 relative">
        <div className="absolute top-2 right-2 text-primary-asistencia flex items-center space-x-2">
          {nota && (
            <button 
              onClick={() => onVerNota(nota)}
              className="text-yellow-500 bg-white p-1 rounded-full shadow-sm hover:bg-yellow-50 transition-colors relative z-10"
              title="Ver nota"
            >
              <Pencil size={14} />
              <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            </button>
          )}
          <CheckCircle2 size={24} fill="currentColor" className="text-white" />
        </div>

        <div className="mt-1">
          <h3 className="font-bold text-gray-800 text-sm truncate leading-tight pr-12">{alumno}</h3>
          <span className="text-xs font-bold text-primary-asistencia uppercase tracking-wider mt-1 block">Presente</span>
        </div>
      </div>
    );
  }

  if (estado === 'ausente') {
    return (
      <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 flex flex-col justify-between h-32 relative">
        <div className="absolute top-2 right-2 flex items-center space-x-2">
          {nota && (
            <button 
              onClick={() => onVerNota(nota)}
              className="text-yellow-500 bg-white p-1 rounded-full shadow-sm hover:bg-yellow-50 transition-colors relative z-10"
              title="Ver nota"
            >
              <Pencil size={14} />
              <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            </button>
          )}
          <div className="text-orange-400">
            <User size={20} />
          </div>
        </div>

        <div className="mt-1">
          <h3 className="font-bold text-gray-500 text-sm truncate leading-tight pr-12">{alumno}</h3>
          <span className="text-xs font-bold text-orange-500 uppercase tracking-wider mt-1 block">Ausente</span>
        </div>
      </div>
    );
  }

  if (estado === 'ausente_pago') {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex flex-col justify-between h-32 relative">
        <div className="absolute top-2 right-2 flex items-center space-x-2">
          {nota && (
            <button 
              onClick={() => onVerNota(nota)}
              className="text-yellow-500 bg-white p-1 rounded-full shadow-sm hover:bg-yellow-50 transition-colors relative z-10"
              title="Ver nota"
            >
              <Pencil size={14} />
              <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            </button>
          )}
          <div className="text-red-400">
            <User size={20} />
          </div>
        </div>

        <div className="mt-1">
          <h3 className="font-bold text-red-500 text-sm truncate leading-tight pr-12">{alumno}</h3>
          <span className="text-xs font-bold text-red-600 uppercase tracking-wider mt-1 block leading-tight">Ausente<br/>(Falta Pago)</span>
        </div>
      </div>
    );
  }

  return null;
}
