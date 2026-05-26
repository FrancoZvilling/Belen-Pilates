import { useState, useEffect } from 'react';
import { useMockStore } from '../../store/mockStore';
import { CreditCard, CheckCircle, AlertCircle, Building, Copy, ChevronDown, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PagosAlumno() {
  const navigate = useNavigate();
  const { infoPago } = useMockStore();
  const [visibleHistory, setVisibleHistory] = useState(6);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    alert('¡Copiado al portapapeles!');
  };

  const handleLoadMore = () => {
    setVisibleHistory(infoPago.historial.length);
  };

  const isPagado = infoPago.estado === 'pagado';

  return (
    <div className="bg-gray-50 min-h-screen pb-24 font-sans">
      
      {/* Header Fijo */}
      <header className="px-5 pt-8 pb-4 bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] sticky top-0 z-10 flex items-center">
        <button 
          onClick={() => navigate('/alumno/dashboard')}
          className="mr-3 p-2 bg-gray-100 rounded-full text-gray-600 active:scale-95 transition-transform"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="bg-primary-pagos bg-opacity-10 p-2.5 rounded-full text-primary-pagos mr-3">
          <CreditCard size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-800">Mis Pagos</h1>
        </div>
      </header>

      <div className="px-5 mt-6 space-y-6">
        
        {/* Tarjeta Principal de Estado */}
        <section>
          <div className={`rounded-3xl p-6 shadow-sm border ${isPagado ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                {isPagado ? (
                  <CheckCircle className="text-green-600" size={24} />
                ) : (
                  <AlertCircle className="text-orange-500" size={24} />
                )}
                <h2 className={`font-black text-xl ${isPagado ? 'text-green-800' : 'text-orange-800'}`}>
                  {isPagado ? '¡Mes Pagado!' : 'Pago Pendiente'}
                </h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isPagado ? 'bg-green-200 text-green-800' : 'bg-orange-200 text-orange-800'}`}>
                {isPagado ? 'Al día' : 'Vencido'}
              </span>
            </div>

            <p className={`text-sm mb-4 ${isPagado ? 'text-green-700' : 'text-orange-700'}`}>
              {isPagado 
                ? 'El mes en curso ya está saldado. Podés disfrutar de tus clases con tranquilidad.' 
                : 'Tu plan actual registra un saldo pendiente. Recordá abonarlo antes de tu próxima clase.'}
            </p>

            <div className="bg-white bg-opacity-60 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  {isPagado ? 'Próximo Vencimiento' : 'Vencimiento'}
                </p>
                <p className="font-bold text-gray-800">{infoPago.vencimiento}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Monto</p>
                <p className="font-black text-xl text-gray-800">{infoPago.monto}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Datos de Transferencia */}
        <section>
          <h3 className="text-lg font-bold text-gray-800 mb-3 px-1">Datos para Transferencia</h3>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="bg-gray-100 p-2 rounded-full text-gray-600">
                <Building size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Banco</p>
                <p className="font-bold text-gray-800">Banco Santander Río</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-xl flex justify-between items-center border border-gray-100">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Alias</p>
                <p className="font-bold text-gray-700">BELEN.PILATES.OK</p>
              </div>
              <button onClick={() => handleCopy('BELEN.PILATES.OK')} className="p-2 text-primary-pagos hover:bg-primary-pagos hover:bg-opacity-10 rounded-lg transition-colors">
                <Copy size={18} />
              </button>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl flex justify-between items-center border border-gray-100">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">CBU</p>
                <p className="font-bold text-gray-700">0720000788000012345678</p>
              </div>
              <button onClick={() => handleCopy('0720000788000012345678')} className="p-2 text-primary-pagos hover:bg-primary-pagos hover:bg-opacity-10 rounded-lg transition-colors">
                <Copy size={18} />
              </button>
            </div>
          </div>
        </section>

        {/* Historial de Pagos */}
        <section>
          <h3 className="text-lg font-bold text-gray-800 mb-3 px-1">Historial de Pagos</h3>
          <div className="space-y-3">
            {infoPago.historial && infoPago.historial.length > 0 ? (
              infoPago.historial.slice(0, visibleHistory).map((pago) => (
                <div key={pago.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-800">{pago.mes}</h4>
                    <p className="text-xs font-semibold text-gray-500 mt-0.5">{pago.fecha}</p>
                  </div>
                  <div className="text-right">
                    <span className="bg-green-50 text-green-700 px-2 py-1 rounded-lg text-xs font-bold mr-3 uppercase">
                      Pagado
                    </span>
                    <span className="font-black text-gray-800">{pago.monto}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm">
                <CreditCard className="mx-auto text-gray-300 mb-3" size={32} />
                <p className="font-bold text-gray-600">No hay pagos registrados</p>
                <p className="text-sm text-gray-400 mt-1">Acá aparecerá tu historial de abonos a medida que pagues tus cuotas.</p>
              </div>
            )}
          </div>

          {infoPago.historial && visibleHistory < infoPago.historial.length && (
            <button 
              onClick={handleLoadMore}
              className="w-full mt-4 py-3 flex items-center justify-center text-sm font-bold text-primary-pagos bg-primary-pagos bg-opacity-10 rounded-xl active:scale-95 transition-transform"
            >
              Cargar más (6 meses anteriores)
              <ChevronDown size={16} className="ml-2" />
            </button>
          )}
        </section>

      </div>
    </div>
  );
}
