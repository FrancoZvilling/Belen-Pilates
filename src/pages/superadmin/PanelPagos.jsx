import { useState, useMemo } from 'react';
import { useAdminStore } from '../../store/adminStore';
import { useAuthStore } from '../../store/authStore';
import { db } from '../../config/firebase';
import { registrarPagoAlumno, actualizarPrecios } from '../../services/turnosService';
import { DollarSign, AlertTriangle, XCircle, Search, Filter, CreditCard, CheckCircle, LogOut, Settings, Users } from 'lucide-react';
import Modal from '../../components/common/Modal';

export default function PanelPagos() {
  const logout = useAuthStore(state => state.logout);
  const { usuarios, pagosHistorial, precios } = useAdminStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal de Pago
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);

  // Modal de Configuracion
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [nuevoPrecio8, setNuevoPrecio8] = useState(precios?.plan_8_clases || 0);
  const [nuevoPrecio12, setNuevoPrecio12] = useState(precios?.plan_12_clases || 0);

  // Calcular fechas para filtros de mes
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const todayDate = new Date(utc + (3600000 * -3));
  todayDate.setHours(0, 0, 0, 0);

  const mesActualNumber = todayDate.getMonth();
  const anioActualNumber = todayDate.getFullYear();

  // Stats y Mapeo Dinamico
  const alumnosProcesados = useMemo(() => {
    return usuarios.filter(u => u.rol === 'alumno').map(u => {
      let estado = 'vencido';
      let diasRestantes = 0;
      
      if (u.vencimiento_pago) {
        // Asume formato "YYYY-MM-DD"
        const venc = new Date(u.vencimiento_pago + 'T12:00:00Z');
        const diffTime = venc.getTime() - todayDate.getTime();
        diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diasRestantes > 5) estado = 'pagado';
        else if (diasRestantes >= 0) estado = 'pendiente';
      }

      return {
        ...u,
        estado_pago: estado,
        diasRestantes
      };
    });
  }, [usuarios, todayDate]);

  const pendientesCount = alumnosProcesados.filter(a => a.estado_pago === 'pendiente').length;
  const vencidosCount = alumnosProcesados.filter(a => a.estado_pago === 'vencido').length;

  const totalCobrado = useMemo(() => {
    return pagosHistorial.reduce((acc, pago) => {
      const pagoDate = new Date(pago.fecha_pago);
      if (pagoDate.getMonth() === mesActualNumber && pagoDate.getFullYear() === anioActualNumber) {
        return acc + (pago.monto || 0);
      }
      return acc;
    }, 0);
  }, [pagosHistorial, mesActualNumber, anioActualNumber]);

  // Filtrado final
  const alumnosFiltrados = alumnosProcesados.filter(a => {
    const matchesSearch = a.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'todos' || a.estado_pago === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handlePagarClick = (alumno) => {
    setAlumnoSeleccionado(alumno);
    setIsPagoModalOpen(true);
  };

  const handleConfirmarPago = async () => {
    if (alumnoSeleccionado) {
      setIsProcessing(true);
      const montoAcobrar = (alumnoSeleccionado.plan === 12) ? precios.plan_12_clases : precios.plan_8_clases;
      const res = await registrarPagoAlumno(db, alumnoSeleccionado.id, montoAcobrar, "SuperAdmin");
      setIsProcessing(false);
      if (res.success) {
        setIsPagoModalOpen(false);
        setAlumnoSeleccionado(null);
      } else {
        alert("Error al registrar pago: " + res.error);
      }
    }
  };

  const handleGuardarConfig = async () => {
    setIsProcessing(true);
    const res = await actualizarPrecios(db, {
      plan_8_clases: parseInt(nuevoPrecio8),
      plan_12_clases: parseInt(nuevoPrecio12)
    });
    setIsProcessing(false);
    if (res.success) {
      setIsConfigModalOpen(false);
    } else {
      alert("Error al guardar precios: " + res.error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pagado': return 'bg-green-100 text-green-700';
      case 'pendiente': return 'bg-yellow-100 text-yellow-700';
      case 'vencido': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24 font-sans">
      
      {/* Header */}
      <header className="px-5 pt-8 pb-6 bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-primary-pagos bg-opacity-10 p-3 rounded-full text-primary-pagos mr-4">
            <DollarSign size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-800">Panel de Pagos</h1>
            <p className="text-sm font-semibold text-gray-500 mt-1">Gestión financiera</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => {
              setNuevoPrecio8(precios?.plan_8_clases || 0);
              setNuevoPrecio12(precios?.plan_12_clases || 0);
              setIsConfigModalOpen(true);
            }}
            className="p-2 bg-gray-100 rounded-full text-gray-600 active:scale-95 transition-transform"
          >
            <Settings size={24} />
          </button>
        </div>
      </header>

      <div className="px-5 mt-6 space-y-6">
        
        {/* Dashboard Resumen */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center">
            <div className="bg-green-50 p-3 rounded-full text-green-600 mr-4">
              <DollarSign size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Mes Actual</p>
              <h2 className="text-2xl font-black text-gray-800">${totalCobrado.toLocaleString('es-AR')}</h2>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center">
            <div className="bg-yellow-50 p-3 rounded-full text-yellow-600 mr-4">
              <AlertTriangle size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pendientes (Próximos a vencer)</p>
              <h2 className="text-2xl font-black text-gray-800">{pendientesCount} alumnos</h2>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center">
            <div className="bg-red-50 p-3 rounded-full text-red-600 mr-4">
              <XCircle size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vencidos</p>
              <h2 className="text-2xl font-black text-gray-800">{vencidosCount} alumnos</h2>
            </div>
          </div>
        </section>

        {/* Buscador y Filtros */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar alumno..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-pagos"
            />
          </div>
          <div className="relative md:w-64">
            <Filter className="absolute left-3 top-3 text-gray-400" size={20} />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-pagos appearance-none font-semibold text-gray-700"
            >
              <option value="todos">Todos los estados</option>
              <option value="pagado">Pagado</option>
              <option value="pendiente">Pendiente</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>
        </section>

        {/* Tabla de Gestión */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Alumno</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Vencimiento</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alumnosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center">
                      <Users className="mx-auto text-gray-300 mb-3" size={40} />
                      <p className="font-bold text-gray-600">No hay alumnos registrados</p>
                      <p className="text-sm text-gray-400 mt-1">Todavía no hay alumnos cargados en el sistema o no coinciden con la búsqueda.</p>
                    </td>
                  </tr>
                ) : (
                  alumnosFiltrados.map((alumno) => (
                    <tr key={alumno.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-bold text-gray-800">{alumno.nombre}</td>
                      <td className="p-4 text-sm text-gray-600 font-semibold">{alumno.plan || 8} clases</td>
                      <td className="p-4 text-sm font-semibold text-gray-700">{alumno.vencimiento_pago || 'No registrado'}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(alumno.estado_pago)}`}>
                          {alumno.estado_pago}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {(alumno.estado_pago === 'pendiente' || alumno.estado_pago === 'vencido') ? (
                          <button 
                            onClick={() => handlePagarClick(alumno)}
                            className="bg-primary-pagos text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform"
                          >
                            Registrar Pago
                          </button>
                        ) : (
                          <span className="text-gray-400 font-semibold text-xs flex items-center justify-end">
                            <CheckCircle size={14} className="mr-1" /> Al día
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>

      {/* Modal de Pago */}
      <Modal 
        isOpen={isPagoModalOpen} 
        onClose={() => setIsPagoModalOpen(false)}
        title="Registrar Pago"
      >
        {alumnoSeleccionado && (
          <div className="py-2 space-y-5">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">Alumno</p>
              <p className="font-bold text-lg text-gray-800">{alumnoSeleccionado.nombre}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500 mb-1">Plan</p>
                <p className="font-bold text-gray-800">{alumnoSeleccionado.plan || 8} Clases</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">Monto a cobrar</p>
                <p className="font-black text-2xl text-primary-pagos">
                  ${(alumnoSeleccionado.plan === 12 ? precios?.plan_12_clases : precios?.plan_8_clases)?.toLocaleString('es-AR')}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start">
              <CheckCircle className="text-blue-500 mt-0.5 mr-3 flex-shrink-0" size={20} />
              <p className="text-sm text-blue-800 font-medium">
                Al confirmar, el sistema sumará <span className="font-bold">30 días</span> al vencimiento del alumno y reiniciará sus clases disponibles.
              </p>
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                onClick={() => setIsPagoModalOpen(false)}
                className="flex-1 py-3 text-gray-600 font-bold rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmarPago}
                className="flex-1 py-3 bg-primary-pagos text-white font-bold rounded-xl hover:bg-opacity-90 transition-colors"
                disabled={isProcessing}
              >
                {isProcessing ? 'Procesando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Configuración */}
      <Modal 
        isOpen={isConfigModalOpen} 
        onClose={() => setIsConfigModalOpen(false)}
        title="Configuración de Precios"
      >
        <div className="py-2 space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Precio Plan 8 Clases (2x sem)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                value={nuevoPrecio8}
                onChange={(e) => setNuevoPrecio8(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-pagos outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Precio Plan 12 Clases (3x sem)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                value={nuevoPrecio12}
                onChange={(e) => setNuevoPrecio12(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-pagos outline-none"
              />
            </div>
          </div>
          <div className="pt-4">
            <button 
              onClick={handleGuardarConfig}
              className="w-full py-3 bg-primary-pagos text-white font-bold rounded-xl hover:bg-opacity-90 transition-colors"
              disabled={isProcessing}
            >
              {isProcessing ? 'Guardando...' : 'Guardar Precios'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
