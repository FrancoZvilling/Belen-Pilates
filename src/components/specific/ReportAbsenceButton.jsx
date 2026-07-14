import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { db } from '../../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { registrarInasistenciaAlumno } from '../../services/turnosService';
import Modal from '../common/Modal';
import { AlertCircle, Loader2 } from 'lucide-react';
import { generarAgendaUsuario } from '../../utils/calendarUtils';

export default function ReportAbsenceButton() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userData, user } = useAuthStore(state => state);

  const [feriadosGlobales, setFeriadosGlobales] = useState([]);

  useEffect(() => {
    const fetchFeriados = async () => {
      try {
        const snapFeriados = await getDocs(collection(db, 'feriados'));
        setFeriadosGlobales(snapFeriados.docs.map(d => d.id));
      } catch (e) {
        console.error("Error fetching feriados", e);
      }
    };
    fetchFeriados();
  }, []);

  // Calcular la próxima clase a la que se puede avisar inasistencia
  const getProximaClase = () => {
    if (!userData) return null;

    // Generar la agenda cronológica real del usuario (incluye fijos y extras)
    const agenda = generarAgendaUsuario(userData, 14, feriadosGlobales);
    if (!agenda || agenda.length === 0) return null;

    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const argDate = new Date(utc + (3600000 * -3));
    const currentDecimal = argDate.getHours() + (argDate.getMinutes() / 60);

    for (const turno of agenda) {
      // Ignorar clases canceladas, pasadas/registradas o feriados
      if (turno.isCancelado || turno.isPresente || turno.isAusente || turno.estadoEspecial === 'feriado') continue;

      const [y, m, day] = turno.fechaIsoString.split('-');
      const checkDate = new Date(y, m - 1, day);
      const isToday = checkDate.getDate() === argDate.getDate() && checkDate.getMonth() === argDate.getMonth();
      
      if (isToday) {
        const classHour = parseInt(turno.hora.split(':')[0]);
        const classMin = parseInt(turno.hora.split(':')[1]) || 0;
        const classDecimal = classHour + (classMin / 60);
        // Si la clase ya empezó o pasó, saltarla
        if (currentDecimal >= classDecimal) continue;
      }

      const dateStr = `${day}/${m}`;
      const prefix = turno.fecha.split(' ')[0]; // "Hoy", "Mañana", o el día de la semana

      return {
        dia: turno.fechaOriginal || prefix,
        hora: turno.hora,
        fechaIso: turno.fechaIsoString,
        fechaDisplay: (prefix === 'Hoy' || prefix === 'Mañana') ? `${prefix} ${dateStr}` : turno.fecha
      };
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
