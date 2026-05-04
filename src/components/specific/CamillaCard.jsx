import { CheckCircle2, User } from 'lucide-react';

export default function CamillaCard({ camilla, onMarcarPresente }) {
  const { estado, alumno } = camilla;

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
          <div className="flex items-center space-x-2 mb-1">
            <User size={16} className="text-gray-400" />
            <h3 className="font-bold text-gray-800 text-sm truncate leading-tight">{alumno}</h3>
          </div>
          <span className="text-xs font-semibold text-primary-turnos uppercase tracking-wider">Pendiente</span>
        </div>

        <button 
          onClick={() => onMarcarPresente(camilla.id)}
          className="w-full mt-2 bg-primary-turnos text-white text-xs font-bold py-2 rounded-xl active:scale-95 transition-transform"
        >
          Marcar Presente
        </button>
      </div>
    );
  }

  if (estado === 'presente') {
    return (
      <div className="bg-primary-asistencia bg-opacity-10 border-2 border-primary-asistencia rounded-2xl p-4 flex flex-col justify-between h-32 relative">
        <div className="absolute top-2 right-2 text-primary-asistencia">
          <CheckCircle2 size={24} fill="currentColor" className="text-white" />
        </div>

        <div className="mt-1">
          <h3 className="font-bold text-gray-800 text-sm truncate leading-tight pr-6">{alumno}</h3>
          <span className="text-xs font-bold text-primary-asistencia uppercase tracking-wider mt-1 block">Presente</span>
        </div>
      </div>
    );
  }

  return null;
}
