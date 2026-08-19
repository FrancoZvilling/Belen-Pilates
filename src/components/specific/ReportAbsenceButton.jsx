import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { db } from '../../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { registrarInasistenciaAlumno } from '../../services/turnosService';
import Modal from '../common/Modal';
import { AlertCircle, Loader2, Calendar, Clock, XCircle } from 'lucide-react';
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

  // Calcular estado de pago
  const isVencido = (() => {
    if (!userData?.vencimiento_pago) return true;
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const todayDate = new Date(utc + (3600000 * -3));
    todayDate.setHours(0, 0, 0, 0);

    const venc = new Date(userData.vencimiento_pago + 'T12:00:00Z');
    const diffTime = venc.getTime() - todayDate.getTime();
    const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diasRestantes < 0;
  })();

  // Si no tiene clases restantes Y está vencido, no mostrar el botón
  if (userData?.clases_restantes <= 0 && isVencido) {
    return null;
  }

  // Obtener todas las clases futuras cancelables
  const getClasesFuturas = () => {
    if (!userData) return [];

    // Generar la agenda cronológica real del usuario (incluye fijos y extras)
    const agenda = generarAgendaUsuario(userData, 14, feriadosGlobales, true);
    if (!agenda || agenda.length === 0) return [];

    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const now = new Date(utc + (3600000 * -3)); // Arg time

    return agenda.map(turno => {
      // Ignorar clases canceladas, registradas o feriados
      if (turno.isCancelado || turno.isPresente || turno.isAusente || turno.estadoEspecial === 'feriado') return null;

      const [y, m, day] = turno.fechaIsoString.split('-');
      const dateStr = `${day}/${m}`;
      const prefix = turno.fecha.split(' ')[0]; // "Hoy", "Mañana", o el día de la semana
      
      const fechaDisplay = (prefix === 'Hoy' || prefix === 'Mañana') ? `${prefix} ${dateStr}` : turno.fecha;

      const classDate = new Date(`${turno.fechaIsoString}T${turno.hora}:00-03:00`);
      
      // Calcular diferencia en horas
      const diffMs = classDate - now;
      const diffHours = diffMs / (1000 * 60 * 60);
      
      // Si la clase ya pasó (o está a punto de empezar en negativo), la ignoramos
      if (diffHours < 0) return null;

      const isCancelable = diffHours >= 2;

      return {
        ...turno,
        fechaDisplay,
        isCancelable
      };
    }).filter(Boolean); // Filtrar los nulls
  };

  const clasesFuturas = getClasesFuturas();

  const handleConfirmar = async (clase) => {
    if (isSubmitting) return;
    
    const mensajeConfirm = `¿Confirmás tu inasistencia para la clase del ${clase.fechaDisplay}?`;
    if (!window.confirm(mensajeConfirm)) return;

    setIsSubmitting(true);
    const res = await registrarInasistenciaAlumno(db, user.uid, clase.fechaIsoString, clase.hora);
    setIsSubmitting(false);

    if (res.success) {
      alert("¡Inasistencia registrada correctamente!");
      if (clasesFuturas.length === 1) {
        setIsConfirmOpen(false); // Si era la última clase, cerramos el modal
      }
    } else {
      alert(res.error || "Hubo un error al registrar la inasistencia.");
    }
  };

  if (clasesFuturas.length === 0) return null;

  return (
    <>
      <button 
        onClick={() => setIsConfirmOpen(true)}
        className="w-full py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-600 font-semibold text-sm flex items-center justify-center active:scale-[0.98] transition-transform mt-3 hover:bg-gray-200"
      >
        <AlertCircle size={16} className="mr-2 text-orange-400" />
        Avisar Inasistencia
      </button>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Avisar Inasistencia"
      >
        <div className="py-2">
          <p className="text-gray-500 text-sm mb-4 text-center font-medium">
            Seleccioná la clase a la que no vas a poder asistir. Solo podés avisar hasta 2 horas antes del inicio.
          </p>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto px-1 pb-2">
            {clasesFuturas.map((clase) => (
              <div 
                key={clase.id} 
                className={`bg-white rounded-xl border p-4 transition-all ${clase.isCancelable ? 'border-gray-200 shadow-sm' : 'border-gray-100 bg-gray-50 opacity-75'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${clase.isCancelable ? 'bg-orange-50 text-orange-500' : 'bg-gray-100 text-gray-400'}`}>
                      <Calendar size={20} />
                    </div>
                    <div>
                      <h3 className={`font-bold capitalize ${clase.isCancelable ? 'text-gray-800' : 'text-gray-500'}`}>
                        {clase.fechaDisplay}
                      </h3>
                      <div className="flex items-center text-gray-500 text-sm mt-0.5">
                        <Clock size={14} className="mr-1" />
                        <span>{clase.hora} hs</span>
                      </div>
                    </div>
                  </div>
                </div>

                {clase.isCancelable ? (
                  <button
                    onClick={() => handleConfirmar(clase)}
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-gray-100 hover:bg-orange-50 hover:text-orange-600 text-gray-600 font-bold rounded-lg transition-colors flex items-center justify-center text-sm border border-gray-200 hover:border-orange-200"
                  >
                    {isSubmitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <XCircle size={16} className="mr-2" />
                        Avisar que no voy
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full py-2.5 bg-gray-100 text-gray-400 font-semibold rounded-lg text-xs text-center border border-gray-100 flex items-center justify-center">
                    <AlertCircle size={14} className="mr-1.5" />
                    Límite de aviso vencido (2 hs antes)
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsConfirmOpen(false)}
              className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl transition-colors hover:bg-gray-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
