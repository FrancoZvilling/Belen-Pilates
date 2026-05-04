import { useState } from 'react';
import { useMockStore } from '../../store/mockStore';
import { UserPlus, Calendar, Check, AlertCircle } from 'lucide-react';
import Modal from '../../components/common/Modal';

export default function AltaAlumno() {
  const grillaMaestra = useMockStore(state => state.grillaMaestra);

  const [formData, setFormData] = useState({ nombre: '', email: '', telefono: '' });
  const [plan, setPlan] = useState(8); // 8 o 12
  const maxSelecciones = plan === 8 ? 2 : 3;
  const [seleccionados, setSeleccionados] = useState([]);
  
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlanChange = (nuevoPlan) => {
    setPlan(nuevoPlan);
    // Si cambia el plan y se pasa del limite, resetear selecciones
    const nuevoMax = nuevoPlan === 8 ? 2 : 3;
    if (seleccionados.length > nuevoMax) {
      setSeleccionados([]);
    }
  };

  const handleCeldaClick = (dia, hora, lugares) => {
    if (lugares === 0) return; // No se puede seleccionar si está lleno

    const idSeleccion = `${dia}-${hora}`;
    const yaSeleccionado = seleccionados.some(s => s.id === idSeleccion);

    if (yaSeleccionado) {
      setSeleccionados(seleccionados.filter(s => s.id !== idSeleccion));
    } else {
      if (seleccionados.length < maxSelecciones) {
        setSeleccionados([...seleccionados, { id: idSeleccion, dia, hora }]);
      } else {
        alert(`Has alcanzado el límite de ${maxSelecciones} turnos fijos por semana para el plan de ${plan} clases.`);
      }
    }
  };

  const isCeldaSeleccionada = (dia, hora) => {
    return seleccionados.some(s => s.id === `${dia}-${hora}`);
  };

  const agruparPorBloque = (horarios) => {
    const manana = horarios.filter(h => parseInt(h.hora) < 13);
    const siesta = horarios.filter(h => parseInt(h.hora) >= 13 && parseInt(h.hora) < 17);
    const tarde = horarios.filter(h => parseInt(h.hora) >= 17);
    return { manana, siesta, tarde };
  };

  const handleGuardar = () => {
    if (!formData.nombre || !formData.email) {
      alert("Por favor completa el nombre y el email.");
      return;
    }
    if (seleccionados.length === 0) {
      alert("Por favor asigna al menos un horario fijo.");
      return;
    }
    setIsSuccessModalOpen(true);
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-32 font-sans">
      <header className="px-5 pt-8 pb-6 bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] sticky top-0 z-10 flex items-center">
        <div className="bg-primary-turnos bg-opacity-10 p-3 rounded-full text-primary-turnos mr-4">
          <UserPlus size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-800">Alta de Alumno</h1>
          <p className="text-sm font-semibold text-gray-500 mt-1">Registrar y asignar plan fijo</p>
        </div>
      </header>

      <div className="px-5 mt-6 space-y-8">
        
        {/* Sección 1: Datos y Plan */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Datos Personales</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre Completo</label>
              <input 
                type="text" name="nombre" value={formData.nombre} onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-turnos focus:bg-white transition-colors"
                placeholder="Ej. Laura Gómez"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email</label>
              <input 
                type="email" name="email" value={formData.email} onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-turnos focus:bg-white transition-colors"
                placeholder="Ej. laura@gmail.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Teléfono</label>
              <input 
                type="tel" name="telefono" value={formData.telefono} onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-turnos focus:bg-white transition-colors"
                placeholder="Opcional"
              />
            </div>
          </div>

          <h2 className="text-lg font-bold text-gray-800 mt-8 mb-4">Plan Mensual</h2>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handlePlanChange(8)}
              className={`p-4 rounded-xl border-2 transition-all ${
                plan === 8 ? 'border-primary-turnos bg-primary-turnos bg-opacity-10' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className={`block text-2xl font-black ${plan === 8 ? 'text-primary-turnos' : 'text-gray-600'}`}>8</span>
              <span className={`text-sm font-bold ${plan === 8 ? 'text-primary-turnos' : 'text-gray-400'}`}>Clases / mes</span>
              <span className="block text-xs text-gray-500 mt-1">(2 veces por semana)</span>
            </button>
            <button 
              onClick={() => handlePlanChange(12)}
              className={`p-4 rounded-xl border-2 transition-all ${
                plan === 12 ? 'border-primary-turnos bg-primary-turnos bg-opacity-10' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className={`block text-2xl font-black ${plan === 12 ? 'text-primary-turnos' : 'text-gray-600'}`}>12</span>
              <span className={`text-sm font-bold ${plan === 12 ? 'text-primary-turnos' : 'text-gray-400'}`}>Clases / mes</span>
              <span className="block text-xs text-gray-500 mt-1">(3 veces por semana)</span>
            </button>
          </div>
        </section>

        {/* Sección 2: Grilla Maestra */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Asignar Horarios Fijos</h2>
            <span className="text-xs font-bold px-3 py-1 bg-gray-100 text-gray-600 rounded-full">
              {seleccionados.length} / {maxSelecciones} asignados
            </span>
          </div>

          <div className="hidden md:block overflow-x-auto">
            {/* Desktop View: Tabla completa */}
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

          <div className="md:hidden space-y-4">
            {/* Mobile View: Lista por días */}
            {grillaMaestra.map(dia => {
              const bloques = agruparPorBloque(dia.horarios);
              return (
                <div key={dia.dia} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">{dia.dia}</h3>
                  </div>
                  <div className="p-4 grid grid-cols-3 gap-2">
                    {/* Renderizamos todos los botones del día juntos en mobile, pero podríamos agruparlos */}
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
              );
            })}
          </div>
        </section>

      </div>

      {/* Footer Fijo de Acción */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] pb-safe">
        <button 
          onClick={handleGuardar}
          className="w-full bg-primary-turnos text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center"
        >
          <Calendar size={20} className="mr-2" />
          Guardar y Generar Turnos
        </button>
      </div>

      <Modal 
        isOpen={isSuccessModalOpen} 
        onClose={() => setIsSuccessModalOpen(false)}
        title=""
      >
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Check size={80} className="text-green-500 mb-4 bg-green-50 p-4 rounded-full" />
          <h2 className="text-2xl font-black text-gray-800 mb-2">Alumno Registrado</h2>
          <p className="text-gray-600 text-sm px-4">
            El perfil de <strong>{formData.nombre}</strong> se creó correctamente y se le asignaron {seleccionados.length} turnos semanales fijos.
          </p>
          
          <button 
            onClick={() => {
              setIsSuccessModalOpen(false);
              setFormData({ nombre: '', email: '', telefono: '' });
              setSeleccionados([]);
            }}
            className="mt-8 w-full py-4 bg-gray-100 text-gray-800 font-bold rounded-xl active:bg-gray-200 transition-colors"
          >
            Aceptar y Limpiar Formulario
          </button>
        </div>
      </Modal>
    </div>
  );
}
