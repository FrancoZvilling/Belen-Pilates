import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { db } from '../../config/firebase';
import { registrarAsistenciaAlumno } from '../../services/turnosService';
import Modal from '../common/Modal';
import { CheckCircle, MapPin, Clock, Loader2 } from 'lucide-react';

export default function SmartAttendanceButton() {
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userData, user } = useAuthStore(state => state);
  
  const [timeState, setTimeState] = useState({
    isEnabled: false,
    mainText: 'Buscando clase...',
    subText: 'Verificando tus horarios...',
    claseAsignada: null
  });

  useEffect(() => {
    const checkTime = () => {
      if (!userData || !userData.turnos_fijos) {
        setTimeState({
          isEnabled: false,
          mainText: 'SIN TURNOS',
          subText: 'No tienes turnos fijos asignados',
          claseAsignada: null
        });
        return;
      }

      // 1. Obtener la hora actual exacta de Argentina (UTC-3)
      const d = new Date();
      const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
      const argDate = new Date(utc + (3600000 * -3));

      const dayIndex = argDate.getDay();
      const daysMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const todayCode = daysMap[dayIndex];

      const currentHour = argDate.getHours();
      const currentMinute = argDate.getMinutes();
      const currentTimeDecimal = currentHour + (currentMinute / 60);

      // 2. Buscar si tiene clases hoy
      const clasesHoy = userData.turnos_fijos.filter(t => t.dia === todayCode);

      if (clasesHoy.length === 0) {
        setTimeState({
          isEnabled: false,
          mainText: 'SIN CLASES HOY',
          subText: 'No tienes clases programadas para este día',
          claseAsignada: null
        });
        return;
      }

      // Ordenar clases de hoy por hora para agarrar la próxima válida
      const clasesOrdenadas = [...clasesHoy].sort((a, b) => {
        return parseInt(a.hora.split(':')[0]) - parseInt(b.hora.split(':')[0]);
      });

      // 3. Buscar la clase activa o próxima (la que expira 1 hora después de su inicio)
      let claseActiva = null;
      for (const clase of clasesOrdenadas) {
        const classHourInt = parseInt(clase.hora.split(':')[0]);
        const classMinInt = parseInt(clase.hora.split(':')[1]) || 0;
        const classStartDecimal = classHourInt + (classMinInt / 60);
        
        // Si la hora actual es menor a 1 hora después del inicio, esta es la clase relevante
        if (currentTimeDecimal < classStartDecimal + 1) {
          claseActiva = { clase, classStartDecimal, classHourInt };
          break;
        }
      }

      // Si no encontramos ninguna, es porque ya pasaron todas las de hoy
      if (!claseActiva) {
        setTimeState({
          isEnabled: false,
          mainText: 'CLASES FINALIZADAS',
          subText: 'El horario para dar presente de hoy ha expirado',
          claseAsignada: null
        });
        return;
      }

      // 4. Verificar si ya dio el presente para esta clase hoy
      const fechaIsoString = `${argDate.getFullYear()}-${String(argDate.getMonth()+1).padStart(2,'0')}-${String(argDate.getDate()).padStart(2,'0')}`;
      const historial = userData.historial_asistencias || [];
      const yaDioPresente = historial.some(h => h.fecha === fechaIsoString && h.hora === claseActiva.clase.hora);

      if (yaDioPresente) {
        setTimeState({
          isEnabled: false,
          mainText: 'ASISTENCIA CONFIRMADA',
          subText: `Presente en la clase de las ${claseActiva.clase.hora} hs`,
          claseAsignada: null
        });
        return;
      }

      // 5. Lógica de habilitación: 2 horas antes hasta 1 hora después
      const { clase, classStartDecimal, classHourInt } = claseActiva;
      const horaAperturaFormat = `${String(classHourInt - 2).padStart(2, '0')}:${clase.hora.split(':')[1] || '00'}`;

      if (currentTimeDecimal >= (classStartDecimal - 2) && currentTimeDecimal <= (classStartDecimal + 1)) {
        setTimeState({
          isEnabled: true,
          mainText: 'DAR PRESENTE',
          subText: `Clase de hoy a las ${clase.hora} hs`,
          claseAsignada: clase
        });
      } else if (currentTimeDecimal < (classStartDecimal - 2)) {
        setTimeState({
          isEnabled: false,
          mainText: 'PRÓXIMO TURNO',
          subText: `Se habilitará a partir de las ${horaAperturaFormat} hs`,
          claseAsignada: null
        });
      }
    };

    checkTime();
    // Re-chequear cada minuto
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [userData]);

  const handleDarPresente = async () => {
    if (!timeState.isEnabled || !timeState.claseAsignada || isSubmitting) return;
    
    setIsSubmitting(true);
    
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const argDate = new Date(utc + (3600000 * -3));
    
    // Formato local YYYY-MM-DD
    const fechaIsoString = `${argDate.getFullYear()}-${String(argDate.getMonth()+1).padStart(2,'0')}-${String(argDate.getDate()).padStart(2,'0')}`;
    
    const res = await registrarAsistenciaAlumno(db, user.uid, fechaIsoString, timeState.claseAsignada.hora);
    
    setIsSubmitting(false);
    
    if (res.success) {
      setIsSuccessOpen(true);
    } else {
      alert(res.error || "Hubo un error al registrar la asistencia.");
    }
  };

  return (
    <>
      <button 
        onClick={handleDarPresente}
        disabled={!timeState.isEnabled}
        className={`w-full py-6 rounded-2xl shadow-sm transition-transform flex flex-col items-center justify-center relative overflow-hidden ${
          timeState.isEnabled && !isSubmitting
            ? 'bg-primary-asistencia text-white active:scale-95 cursor-pointer shadow-lg' 
            : 'bg-white border-2 border-dashed border-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        <div className={`absolute top-0 right-0 p-4 opacity-10 ${timeState.isEnabled ? 'text-white opacity-20' : 'text-gray-300'}`}>
          {isSubmitting ? <Loader2 size={64} className="animate-spin" /> : 
           timeState.mainText === 'ASISTENCIA CONFIRMADA' ? <CheckCircle size={64} /> : 
           timeState.isEnabled ? <MapPin size={64} /> : <Clock size={64} />}
        </div>
        <span className={`text-2xl font-black tracking-wide mb-2 relative z-10 ${!timeState.isEnabled && timeState.mainText !== 'ASISTENCIA CONFIRMADA' ? 'text-gray-500' : 'text-gray-800'}`}>
          {isSubmitting ? 'REGISTRANDO...' : timeState.mainText}
        </span>
        <span className="text-sm font-medium relative z-10">
          {timeState.subText}
        </span>
      </button>

      <Modal 
        isOpen={isSuccessOpen} 
        onClose={() => setIsSuccessOpen(false)}
        title=""
      >
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle size={80} className="text-green-500 mb-4 bg-green-50 rounded-full p-2" />
          <h2 className="text-2xl font-black text-gray-800 mb-2">¡Asistencia Confirmada!</h2>
          <p className="text-gray-600 text-lg">Tu presencia fue registrada exitosamente en el sistema.</p>
          <p className="text-primary-asistencia font-bold mt-4">¡Que disfrutes tu clase de Pilates!</p>
          
          <button 
            onClick={() => setIsSuccessOpen(false)}
            className="mt-8 w-full py-4 bg-gray-100 text-gray-800 font-bold rounded-xl active:bg-gray-200 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </Modal>
    </>
  );
}
