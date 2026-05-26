import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { db } from '../../config/firebase';
import { registrarInasistenciaAlumno } from '../../services/turnosService';
import Modal from '../common/Modal';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function ReportAbsenceButton() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userData, user } = useAuthStore(state => state);

  // Calcular la próxima clase a la que se puede avisar inasistencia
  const getProximaClase = () => {
    if (!userData || !userData.turnos_fijos || userData.turnos_fijos.length === 0) return null;

    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const argDate = new Date(utc + (3600000 * -3));

    const daysMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const historial = userData.historial_asistencias || [];

    // Recorrer los próximos 14 días buscando la primera clase sin registro
    for (let offset = 0; offset < 14; offset++) {
      const checkDate = new Date(argDate);
      checkDate.setDate(checkDate.getDate() + offset);
      const dayName = daysMap[checkDate.getDay()];
      const fechaIso = `${checkDate.getFullYear()}-${String(checkDate.getMonth()+1).padStart(2,'0')}-${String(checkDate.getDate()).padStart(2,'0')}`;

      // Buscar si hay turnos fijos para este día
      const turnosDelDia = userData.turnos_fijos
        .filter(t => t.dia === dayName)
        .sort((a, b) => parseInt(a.hora.split(':')[0]) - parseInt(b.hora.split(':')[0]));

      for (const turno of turnosDelDia) {
        // Si estamos en el día de hoy, solo considerar clases que aún no empezaron
        if (offset === 0) {
          const classHour = parseInt(turno.hora.split(':')[0]);
          const classMin = parseInt(turno.hora.split(':')[1]) || 0;
          const classDecimal = classHour + (classMin / 60);
          const currentDecimal = argDate.getHours() + (argDate.getMinutes() / 60);
          // Si la clase ya empezó (o ya pasó la ventana), saltearla
          if (currentDecimal >= classDecimal) continue;
        }

        // Verificar que no haya un registro previo (presente o ausente) para esta clase
        const yaRegistrado = historial.some(h => h.fecha === fechaIso && h.hora === turno.hora);
        if (!yaRegistrado) {
          return {
            dia: dayName,
            hora: turno.hora,
            fechaIso: fechaIso,
            fechaDisplay: offset === 0 ? 'Hoy' : offset === 1 ? 'Mañana' : dayName
          };
        }
      }
    }

    return null;
  };

  const proximaClase = getProximaClase();

  const handleConfirmar = async () => {
    if (!proximaClase || isSubmitting) return;
    
    setIsSubmitting(true);
    const res = await registrarInasistenciaAlumno(db, user.uid, proximaClase.fechaIso, proximaClase.hora);
    setIsSubmitting(false);

    if (res.success) {
      setIsConfirmOpen(false);
      alert("¡Inasistencia registrada! Se te sumó 1 crédito de recuperación.");
    } else {
      alert(res.error || "Hubo un error al registrar la inasistencia.");
    }
  };

  if (!proximaClase) return null;

  return (
    <>
      <button 
        onClick={() => setIsConfirmOpen(true)}
        className="w-full py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-600 font-semibold text-sm flex items-center justify-center active:scale-[0.98] transition-transform mt-3"
      >
        <AlertCircle size={16} className="mr-2 text-orange-400" />
        Avisar Inasistencia ({proximaClase.fechaDisplay} {proximaClase.hora} hs)
      </button>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Avisar Inasistencia"
      >
        <div className="py-4 text-center">
          <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={36} className="text-orange-500" />
          </div>
          <h3 className="text-lg font-black text-gray-800 mb-2">
            ¿Confirmás tu inasistencia?
          </h3>
          <p className="text-gray-600 text-sm mb-1">
            Clase del <span className="font-bold">{proximaClase.fechaDisplay}</span> a las <span className="font-bold">{proximaClase.hora} hs</span>
          </p>
          <p className="text-gray-400 text-xs mb-6">
            Se te sumará 1 crédito de recuperación para canjear en otro horario.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={handleConfirmar}
              disabled={isSubmitting}
              className="w-full py-4 bg-orange-500 text-white font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center shadow-sm"
            >
              {isSubmitting ? (
                <><Loader2 size={18} className="mr-2 animate-spin" /> Registrando...</>
              ) : (
                'Sí, no voy a asistir'
              )}
            </button>
            <button
              onClick={() => setIsConfirmOpen(false)}
              className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
