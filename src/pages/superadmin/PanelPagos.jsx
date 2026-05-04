import { useState } from 'react';
import { useMockStore } from '../../store/mockStore';
import { DollarSign, AlertTriangle, XCircle, Search, Filter, CreditCard, CheckCircle } from 'lucide-react';
import Modal from '../../components/common/Modal';

export default function PanelPagos() {
  const { alumnosMembresia, ingresosMesActual, registrarPago } = useMockStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');

  // Estado del Modal de Pago
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
  const [medioPago, setMedioPago] = useState('efectivo');

  // Derived Stats
  const pendientesCount = alumnosMembresia.filter(a => a.estado_pago === 'pendiente').length;
  const vencidosCount = alumnosMembresia.filter(a => a.estado_pago === 'vencido').length;

  // Filtrado de alumnos
  const alumnosFiltrados = alumnosMembresia.filter(a => {
    const matchesSearch = a.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'todos' || a.estado_pago === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handlePagarClick = (alumno) => {
    setAlumnoSeleccionado(alumno);
    setIsPagoModalOpen(true);
  };

  const handleConfirmarPago = () => {
    if (alumnoSeleccionado) {
      registrarPago(alumnoSeleccionado.id);
      setIsPagoModalOpen(false);
      setAlumnoSeleccionado(null);
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
      <header className="px-5 pt-8 pb-6 bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] sticky top-0 z-10 flex items-center">
        <div className="bg-primary-pagos bg-opacity-10 p-3 rounded-full text-primary-pagos mr-4">
          <DollarSign size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-800">Panel de Pagos</h1>
          <p className="text-sm font-semibold text-gray-500 mt-1">Gestión financiera</p>
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
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Cobrado</p>
              <h2 className="text-2xl font-black text-gray-800">${ingresosMesActual.toLocaleString('es-AR')}</h2>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center">
            <div className="bg-yellow-50 p-3 rounded-full text-yellow-600 mr-4">
              <AlertTriangle size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pendientes</p>
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
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Último Pago</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Vencimiento</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alumnosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">
                      No se encontraron alumnos con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  alumnosFiltrados.map((alumno) => (
                    <tr key={alumno.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-bold text-gray-800">{alumno.nombre}</td>
                      <td className="p-4 text-sm text-gray-600 font-semibold">{alumno.plan} clases</td>
                      <td className="p-4 text-sm text-gray-500">{alumno.ultimo_pago}</td>
                      <td className="p-4 text-sm font-semibold text-gray-700">{alumno.vencimiento}</td>
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

      {/* Modal de Registro de Pago */}
      <Modal 
        isOpen={isPagoModalOpen} 
        onClose={() => setIsPagoModalOpen(false)}
        title="Registrar Pago"
      >
        {alumnoSeleccionado && (
          <div className="space-y-6 pt-2">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg">{alumnoSeleccionado.nombre}</h3>
              <p className="text-sm text-gray-500 mt-1">
                Plan seleccionado: <span className="font-bold text-gray-700">{alumnoSeleccionado.plan} clases</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Monto a Cobrar</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3.5 text-gray-400" size={20} />
                <input 
                  type="text" 
                  readOnly
                  value={alumnoSeleccionado.plan === 8 ? '15.000' : '20.000'}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Medio de Pago</label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setMedioPago('efectivo')}
                  className={`py-3 rounded-xl border-2 font-bold text-sm transition-colors ${medioPago === 'efectivo' ? 'border-primary-pagos bg-primary-pagos bg-opacity-10 text-primary-pagos' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  Efectivo
                </button>
                <button 
                  onClick={() => setMedioPago('transferencia')}
                  className={`py-3 rounded-xl border-2 font-bold text-sm transition-colors ${medioPago === 'transferencia' ? 'border-primary-pagos bg-primary-pagos bg-opacity-10 text-primary-pagos' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  Transferencia
                </button>
              </div>
            </div>

            <button 
              onClick={handleConfirmarPago}
              className="w-full mt-4 bg-primary-pagos text-white py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex justify-center items-center"
            >
              <CreditCard size={20} className="mr-2" />
              Confirmar Pago y Resetear Clases
            </button>
          </div>
        )}
      </Modal>

    </div>
  );
}
