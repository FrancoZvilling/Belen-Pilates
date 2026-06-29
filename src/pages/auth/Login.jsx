import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Mail, Lock, Eye, EyeOff, User, AlertCircle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithEmail, registerWithEmail, sendPasswordReset } = useAuthStore();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Password Reset State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);
  const [resetError, setResetError] = useState(null);

  // Form State
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetError("Por favor ingresa tu correo.");
      return;
    }
    try {
      setResetLoading(true);
      setResetError(null);
      setResetMessage(null);
      await sendPasswordReset(resetEmail);
      setResetMessage("Te hemos enviado un correo para restablecer tu contraseña. Revisa tu bandeja de entrada o SPAM.");
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setResetError("No hay ninguna cuenta registrada con este correo.");
      } else if (err.code === 'auth/invalid-email') {
        setResetError("El formato del correo es inválido.");
      } else {
        setResetError("Ocurrió un error al intentar enviar el correo.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await login();
      navigate('/');
    } catch (err) {
      if (err.code === 'custom/not-invited') {
        setError("Todavía no te han cargado al sistema, por favor comunicate con algún profesor.");
      } else {
        setError("No se pudo iniciar sesión con Google. Intenta de nuevo.");
      }
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }
    if (isRegistering && !nombre) {
      setError("Por favor ingresa tu nombre.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (isRegistering) {
        await registerWithEmail(email, password, nombre);
      } else {
        await loginWithEmail(email, password, rememberMe);
      }
      
      navigate('/');
    } catch (err) {
      console.error(err);
      if (err.code === 'custom/not-invited') {
        setError("Todavía no te han cargado al sistema, por favor comunicate con algún profesor.");
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Correo o contraseña incorrectos.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("Este correo ya está registrado.");
      } else {
        setError("Ocurrió un error. Verifica tus datos y vuelve a intentar.");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-5 font-sans py-10">
      
      {/* Branding */}
      <div className="text-center mb-8">
        <div className="w-56 h-56 mx-auto mb-4">
          <img 
            src="/logo.webp" 
            alt="Loto Pilates Logo" 
            className="w-full h-full object-contain drop-shadow-xl"
          />
        </div>
        <h1 className="text-5xl font-black tracking-tight font-serif text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400">
          Loto Pilates
        </h1>
      </div>

      {/* Auth Container */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-2xl font-black text-gray-800 mb-6 text-center">
          {isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm font-semibold flex items-center mb-6">
            <AlertCircle size={18} className="mr-2 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {isRegistering && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Nombre Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={18} className="text-gray-400" />
                </div>
                <input 
                  type="text" 
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary-turnos focus:border-transparent transition-all text-gray-700 font-medium"
                  placeholder="Ej: Laura Gómez"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Correo Electrónico</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail size={18} className="text-gray-400" />
              </div>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary-turnos focus:border-transparent transition-all text-gray-700 font-medium"
                placeholder="tu@correo.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-400" />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary-turnos focus:border-transparent transition-all text-gray-700 font-medium"
                placeholder="Mínimo 6 caracteres"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {!isRegistering && (
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-primary-turnos checked:border-primary-turnos transition-all"
                  />
                  <div className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none">
                    <svg className="w-3 h-3" viewBox="0 0 14 10" fill="none">
                      <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-800 transition-colors">Recordarme</span>
              </label>
              
              <button type="button" onClick={() => setShowResetModal(true)} className="text-sm font-bold text-primary-turnos hover:text-blue-600 transition-colors">
                ¿Olvidaste tu clave?
              </button>
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 bg-gray-800 hover:bg-gray-900 text-white font-bold py-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center shadow-md"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              isRegistering ? 'Crear Cuenta' : 'Ingresar a mi perfil'
            )}
          </button>
        </form>

      </div>

      {/* Toggle Register/Login */}
      <div className="text-center mt-6">
        <p className="text-gray-500 font-medium">
          {isRegistering ? '¿Ya tenés una cuenta?' : '¿No tenés cuenta?'}
          <button 
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
            }}
            className="ml-2 font-bold text-primary-turnos hover:text-blue-600 transition-colors"
          >
            {isRegistering ? 'Iniciar Sesión' : 'Crear una'}
          </button>
        </p>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
            <button 
              onClick={() => {
                setShowResetModal(false);
                setResetMessage(null);
                setResetError(null);
                setResetEmail('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:bg-gray-100 p-2 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h3 className="text-xl font-black text-gray-800 mb-2">Recuperar Contraseña</h3>
            <p className="text-sm text-gray-500 mb-6">Ingresa tu correo electrónico y te enviaremos un enlace para que puedas elegir una nueva contraseña.</p>

            {resetError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl flex items-start space-x-2 text-sm font-medium border border-red-100">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <span>{resetError}</span>
              </div>
            )}
            
            {resetMessage ? (
              <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-xl flex flex-col items-center justify-center text-center space-y-2 border border-green-100">
                <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-sm">{resetMessage}</span>
                <button 
                  onClick={() => setShowResetModal(false)}
                  className="mt-2 text-green-700 font-bold underline text-sm"
                >
                  Volver al Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword}>
                <div className="mb-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail size={18} className="text-gray-400" />
                    </div>
                    <input 
                      type="email" 
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary-turnos focus:border-transparent transition-all text-gray-700 font-medium"
                      placeholder="tu@correo.com"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-primary-turnos hover:bg-blue-600 text-white font-bold py-3 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center shadow-md"
                >
                  {resetLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Enviar Enlace'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
