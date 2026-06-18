import { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Verificar si es un dispositivo móvil
    const userAgent = window.navigator.userAgent.toLowerCase();
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|windows phone/i;
    const isMobileDevice = mobileRegex.test(userAgent);
    setIsMobile(isMobileDevice);

    // Verificar si ya está instalada (standalone)
    const checkStandalone = () => {
      return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone;
    };
    
    if (checkStandalone()) {
      setIsStandalone(true);
      return; 
    }

    const hasDismissed = localStorage.getItem('pwa_prompt_dismissed');
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isMobileDevice && !hasDismissed) {
      // Mostrar siempre el banner después de 1 segundo para dar tiempo a renderizar el login
      setTimeout(() => setShowPrompt(true), 1000);
    }

    // Guardar el evento si el navegador nos permite forzar la instalación
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else {
      // Si el navegador no dio el prompt automático, le damos instrucciones a mano para Android
      alert("Para instalar la app: Tocá los 3 puntitos (Menú) arriba a la derecha en Chrome y elegí 'Instalar aplicación' o 'Agregar a la pantalla principal'.");
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', new Date().getTime().toString());
  };

  if (!isMobile || isStandalone || isAuthenticated || !showPrompt) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 bg-white p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] z-50 border border-gray-100 flex flex-col slide-up-anim">
      <button 
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-400 p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <X size={16} />
      </button>

      <div className="flex items-center mb-4">
        <div className="bg-blue-100 p-3 rounded-xl text-blue-600 mr-4 shadow-sm">
          <Download size={24} />
        </div>
        <div>
          <h3 className="font-bold text-gray-800 text-base leading-tight mb-1">Instalá la App Oficial</h3>
          <p className="text-xs text-gray-500">Más rápida, no gasta memoria y es más cómoda.</p>
        </div>
      </div>

      {isIOS ? (
        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 border border-gray-100 leading-relaxed">
          Para instalar, tocá el botón Compartir <Share size={14} className="inline mx-1 text-blue-500" /> en la barra inferior de Safari y elegí <strong>"Agregar a Inicio"</strong> <PlusSquare size={14} className="inline mx-1 text-gray-800" />.
        </div>
      ) : (
        <button 
          onClick={handleInstallClick}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm shadow-md shadow-blue-200 active:scale-95 transition-transform flex items-center justify-center space-x-2"
        >
          <span>Instalar Ahora</span>
        </button>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .slide-up-anim {
          animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
