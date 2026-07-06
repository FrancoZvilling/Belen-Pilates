import { useState, useEffect } from 'react';
import { useMockStore } from '../../store/mockStore';
import { useAdminStore } from '../../store/adminStore';
import { db } from '../../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Modal from '../common/Modal';

export default function ModificarHorariosModal({ isOpen, onClose, alumno }) {
  const grillaBase = useMockStore(state => state.grillaMaestra);
  const { usuarios, preRegistros } = useAdminStore();
  
  const [seleccionados, setSeleccionados] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Determinar max selecciones
  const plan = alumno?.plan || 8;
  const maxSelecciones = plan === 4 ? 1 : (plan === 8 ? 2 : 3);

  // Inicializar las selecciones
  useEffect(() => {
    if (isOpen && alumno) {
      const turnosActuales = alumno.turnos_fijos || alumno.turnosFijos || [];
      const initSeleccion = turnosActuales.map(t => ({
        id: `${t.dia}-${t.hora}`,
        dia: t.dia,
        hora: t.hora
      }));
      setSeleccionados(initSeleccion);
    }
  }, [isOpen, alumno]);

  if (!alumno) return null;

  const grillaMaestra = grillaBase.map(dia => ({
    ...dia,
    horarios: dia.horarios.map(h => {
      const todosLosUsuarios = [...usuarios, ...preRegistros];
      const ocupados = todosLosUsuarios.reduce((acc, user) => {
        if (user.id === alumno.id || user.email === alumno.email) return acc;
        const turnos = user.turnos_fijos || user.turnosFijos || [];
        const tieneTurno = turnos.some(t => t.dia === dia.dia && t.hora === h.hora);
        return acc + (tieneTurno ? 1 : 0);
      }, 0);
      return {
        ...h,
        lugares_disponibles: Math.max(0, 8 - ocupados)
      };
    })
  }));

  const handleCeldaClick = (dia, hora, lugares) => {
    if (lugares === 0) return;

    const idSeleccion = `${dia}-${hora}`;
    const yaSeleccionado = seleccionados.some(s => s.id === idSeleccion);

    if (yaSeleccionado) {
      setSeleccionados(seleccionados.filter(s => s.id !== idSeleccion));
    } else {
      const mismoDiaIndex = seleccionados.findIndex(s => s.dia === dia);
      if (mismoDiaIndex !== -1) {
        const nuevosSeleccionados = [...seleccionados];
        nuevosSeleccionados[mismoDiaIndex] = { id: idSeleccion, dia, hora };
        setSeleccionados(nuevosSeleccionados);
        return;
      }

      if (seleccionados.length < maxSelecciones) {
        setSeleccionados([...seleccionados, { id: idSeleccion, dia, hora }]);
      } else {
        alert(`El plan de este alumno (${plan} clases) solo permite ${maxSelecciones} turnos fijos por semana.`);
      }
    }
  };

  const isCeldaSeleccionada = (dia, hora) => {
    return seleccionados.some(s => s.id === `${dia}-${hora}`);
  };

  const agruparPorBloque = (horarios) => {
    const manana = horarios.filter(h => parseInt(h.hora) < 13);
    const siesta = horarios.filter(h => parseInt(h.hora) >= 13 && parseInt(h.hora) < 18);
    const tarde = horarios.filter(h => parseInt(h.hora) >= 18);
    return { manana, siesta, tarde };
  };

  const handleGuardar = async () => {
    if (seleccionados.length === 0) {
      alert("Debes seleccionar al menos un horario fijo.");
      return;
    }
    
    try {
      setIsSaving(true);
      const coleccion = alumno.isPreRegistro ? 'pre_registros' : 'usuarios';
      const userRef = doc(db, coleccion, alumno.id || alumno.email);
      
      const nuevosTurnosFijos = seleccionados.map(s => ({ dia: s.dia, hora: s.hora }));
      
      await updateDoc(userRef, {
        turnos_fijos: nuevosTurnosFijos
      });
      
      alert('Horarios actualizados exitosamente.');
      onClose();
    } catch (error) {
      console.error("Error al actualizar horarios: ", error);
      alert("Hubo un error al guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Modificar Horarios: ${alumno.nombre}`}
    >
      <div className="py-2 space-y-6">
        
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-500">
            Plan actual: <span className="font-bold text-gray-800">{plan} Clases ({maxSelecciones}x semana)</span>
          </p>
          <span className="text-xs font-bold px-3 py-1 bg-gray-100 text-gray-600 rounded-full">
            {seleccionados.length} / {maxSelecciones} asignados
          </span>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                {grillaMaestra.map(dia => (
                  <th key={dia.dia} className="p-3 bg-gray-50 border-b border-gray-200 text-sm font-bold text-gray-600 uppercase text-center w-1/5">{dia.dia}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {grillaMaestra.map(dia => {
                  const bloques = agruparPorBloque(dia.horarios);
                  return (
                    <td key={dia.dia} className="p-2 align-top border-r border-gray-100 last:border-r-0">
                      {['manana', 'siesta', 'tarde'].map(bloque => (
                        <div key={bloque} className="mb-4 last:mb-0">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-2">{bloque}</span>
                          <div className="space-y-2">
                            {bloques[bloque].map(h => {
                              const isLleno = h.lugares_disponibles === 0;
                              const isSel = isCeldaSeleccionada(dia.dia, h.hora);
                              return (
                                <button
                                  key={h.hora}
                                  onClick={() => handleCeldaClick(dia.dia, h.hora, h.lugares_disponibles)}
                                  disabled={isLleno && !isSel}
                                  className={`w-full p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                                    isSel 
                                      ? 'bg-primary-turnos border-primary-turnos text-white shadow-md' 
                                      : isLleno 
                                        ? 'bg-gray-100 border-gray-100 opacity-60 cursor-not-allowed'
                                        : 'bg-white border-gray-200 hover:border-primary-turnos hover:shadow-sm text-gray-700'
                                  }`}
                                >
                                  <span className="font-bold text-sm">{h.hora}</span>
                                  <span className={`text-[10px] mt-0.5 ${isSel ? 'text-blue-100' : isLleno ? 'text-gray-400 font-bold' : 'text-gray-500'}`}>
                                    {isLleno ? 'Lleno' : `${h.lugares_disponibles} lugares`}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {grillaMaestra.map(dia => (
            <div key={dia.dia} className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-800">{dia.dia}</h3>
              </div>
              <div className="p-4 grid grid-cols-3 gap-2">
                {dia.horarios.map(h => {
                  const isLleno = h.lugares_disponibles === 0;
                  const isSel = isCeldaSeleccionada(dia.dia, h.hora);
                  return (
                    <button
                      key={h.hora}
                      onClick={() => handleCeldaClick(dia.dia, h.hora, h.lugares_disponibles)}
                      disabled={isLleno && !isSel}
                      className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                        isSel 
                          ? 'bg-primary-turnos border-primary-turnos text-white shadow-md' 
                          : isLleno 
                            ? 'bg-gray-100 border-gray-100 opacity-60 cursor-not-allowed'
                            : 'bg-white border-gray-200 hover:border-primary-turnos text-gray-700'
                      }`}
                    >
                      <span className="font-bold text-sm">{h.hora}</span>
                      <span className={`text-[10px] mt-0.5 ${isSel ? 'text-blue-100' : isLleno ? 'text-gray-400 font-bold' : 'text-gray-500'}`}>
                        {isLleno ? 'Lleno' : `${h.lugares_disponibles} disp.`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-primary-turnos hover:bg-opacity-90 transition-colors"
          >
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

      </div>
    </Modal>
  );
}
