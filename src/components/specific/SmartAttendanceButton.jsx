import { useState } from 'react';
import { useMockStore } from '../../store/mockStore';
import Modal from '../common/Modal';
import { CheckCircle, MapPin } from 'lucide-react';

export default function SmartAttendanceButton() {
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const marcarAsistencia = useMockStore(state => state.marcarAsistencia);

  const handleDarPresente = () => {
    marcarAsistencia();
    setIsSuccessOpen(true);
  };

  return (
    <>
      <button 
        onClick={handleDarPresente}
        className="w-full bg-primary-asistencia text-white py-6 rounded-2xl shadow-lg active:scale-95 transition-transform flex flex-col items-center justify-center relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <MapPin size={64} />
        </div>
        <span className="text-3xl font-black tracking-wide mb-2 relative z-10">DAR PRESENTE</span>
        <span className="text-sm font-medium opacity-90 relative z-10">Clase de hoy 16:00 hs</span>
      </button>

      <Modal 
        isOpen={isSuccessOpen} 
        onClose={() => setIsSuccessOpen(false)}
        title=""
      >
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle size={80} className="text-green-500 mb-4" />
          <h2 className="text-2xl font-black text-gray-800 mb-2">¡Listo!</h2>
          <p className="text-gray-600 text-lg">Asistencia registrada exitosamente.</p>
          <p className="text-primary-asistencia font-bold mt-4">¡Que disfrutes tu clase!</p>
          
          <button 
            onClick={() => setIsSuccessOpen(false)}
            className="mt-8 w-full py-4 bg-gray-100 text-gray-800 font-bold rounded-xl active:bg-gray-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </Modal>
    </>
  );
}
