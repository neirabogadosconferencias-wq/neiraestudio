
import React, { useState } from 'react';
import * as api from '../services/apiService';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const LOGO_IMAGE = '/images/logovertical.png';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await api.apiLogin(username.trim(), password);
      onLogin(user);
    } catch (err: any) {
      console.error('Error en login:', err);
      setError(err.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 font-sans selection:bg-orange-500/30 overflow-hidden bg-black text-white">

      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Deep atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-black to-zinc-900"></div>

        {/* Technical Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}></div>

        {/* Vignette to focus center */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] opacity-60"></div>

        {/* Aurora Effects */}
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-orange-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow delay-1000"></div>

        {/* Subtle Noise Texture */}
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}></div>
      </div>

      <div className="w-full max-w-sm sm:max-w-md md:max-w-4xl animate-fadeIn relative z-10 px-4">
        {/* Glassmorphic Card container with enhanced borders */}
        <div className="relative group bg-zinc-900/60 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] border border-white/5 flex flex-col md:flex-row overflow-hidden min-h-[550px]">

          {/* Subtle moving border gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-[2s] pointer-events-none"></div>

          {/* Left Panel: Visual/Logo */}
          <div className="relative w-full md:w-5/12 p-10 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5 group relative">
            {/* Inner Glow in Panel */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

            {/* Tech UI: Corner Frames ("Cuadros") */}
            <div className="absolute top-6 left-6 w-6 h-6 border-l border-t border-white/20 rounded-tl-sm opacity-50"></div>
            <div className="absolute top-6 right-6 w-6 h-6 border-r border-t border-white/20 rounded-tr-sm opacity-50"></div>
            <div className="absolute bottom-6 left-6 w-6 h-6 border-l border-b border-white/20 rounded-bl-sm opacity-50"></div>
            <div className="absolute bottom-6 right-6 w-6 h-6 border-r border-b border-white/20 rounded-br-sm opacity-50"></div>

            {/* Tech UI: System Data Header */}
            <div className="absolute top-8 inset-x-0 flex justify-between px-10">
              <span className="font-mono text-[9px] text-zinc-600 tracking-widest uppercase">ID: 9X-2026</span>
              <span className="font-mono text-[9px] text-zinc-600 tracking-widest uppercase flex items-center gap-2">
                SECURE <span className="w-1 h-1 bg-zinc-600 rounded-full"></span> ENCRYPTED
              </span>
            </div>

            {/* Logo Badge - Enhanced for Dark Mode */}
            <div className="relative transform transition-transform duration-500 hover:scale-105 mb-8">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative bg-white p-6 rounded-xl shadow-2xl border border-white/10">
                <div className="absolute top-2 left-2 w-1.5 h-1.5 border-l border-t border-zinc-300"></div>
                <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-r border-b border-zinc-300"></div>
                {!logoError ? (
                  <img
                    src={LOGO_IMAGE}
                    alt="Neira Trujillo Abogados"
                    className="h-28 w-auto object-contain"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="h-24 w-24 flex items-center justify-center rounded bg-zinc-100 text-zinc-900 font-serif font-black text-4xl">
                    NT
                  </div>
                )}
              </div>
            </div>

            {/* Corporate System Info - Modern Tech Badge */}
            <div className="text-center mt-6 relative z-10 group cursor-default">
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-700/50 backdrop-blur-md shadow-lg transition-all duration-300 hover:border-orange-500/30 hover:shadow-orange-900/20">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <div className="flex flex-col items-start">
                  <p className="font-sans text-[10px] text-zinc-400 font-bold uppercase tracking-[0.15em] leading-none mb-0.5">
                    Sistema de Gestión
                  </p>
                  <p className="font-mono text-[9px] text-zinc-500 font-normal tracking-wider leading-none">
                    JURÍDICA V2.0
                  </p>
                </div>
              </div>
            </div>

            {/* Tech Footer Info */}
            <div className="absolute bottom-8 w-full text-center">
              <p className="text-[8px] text-zinc-700 font-mono tracking-[0.3em] uppercase opacity-70">
                V2.5.0 <span className="mx-2 text-orange-500/50">///</span> AUTH_MODULE
              </p>
            </div>
          </div>

          {/* Right Panel: Login Form */}
          <div className="w-full md:w-7/12 p-8 sm:p-12 flex flex-col justify-center bg-zinc-900/40 relative">
            {/* Background gradient for form area to lift it from black */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

            <div className="max-w-xs mx-auto w-full relative z-10">
              <div className="mb-10 text-center md:text-left">
                <h2 className="text-2xl font-serif text-white tracking-wide mb-2">Bienvenido</h2>
                <p className="text-zinc-400 text-sm font-medium">Inicie sesión en su cuenta</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider ml-1">Usuario</label>
                  <div className="relative group">
                    <input
                      type="text"
                      className="w-full py-4 pl-4 pr-4 bg-zinc-800/80 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:bg-zinc-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all placeholder-zinc-500"
                      placeholder="Ingrese su usuario"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={loading}
                      autoFocus
                    />
                    {/* Icon optional or removed for minimalism */}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider ml-1">Contraseña</label>
                  <div className="relative group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="w-full py-4 pl-4 pr-12 bg-zinc-800/80 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:bg-zinc-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all placeholder-zinc-500"
                      placeholder="Ingrese su contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-white focus:outline-none transition-colors"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-xs font-medium flex items-center animate-shake">
                    <svg className="w-4 h-4 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !username.trim() || !password}
                  className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold py-4 rounded-xl shadow-[0_10px_20px_-10px_rgba(234,88,12,0.5)] transition-all transform hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center tracking-wider text-xs uppercase"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Entrar'
                  )}
                </button>
              </form>

              <div className="mt-12 text-center opacity-40 hover:opacity-100 transition-opacity">
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em]">
                  &copy; 2026 Neira Trujillo
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
        .animate-pulse-slow { animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
    </div>
  );
};

export default Login;
