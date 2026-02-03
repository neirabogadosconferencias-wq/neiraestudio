
import React, { useState } from 'react';
import * as api from '../services/apiService';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const LOGO_IMAGE = '/images/logo.png';

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
    <div className="min-h-screen bg-zinc-200 lg:bg-zinc-950 flex items-center justify-center p-4 sm:p-6 overflow-y-auto py-8">
      <div className="w-full max-w-5xl animate-fadeIn my-auto">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-[2rem] lg:rounded-[2.5rem] border border-zinc-200 lg:border-white/10 bg-white lg:bg-gradient-to-br lg:from-zinc-950 lg:via-slate-950 lg:to-black shadow-xl lg:shadow-2xl min-h-0">
          {/* Glow solo en desktop */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl hidden lg:block" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl hidden lg:block" />

          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-0">
            {/* Panel marca — fondo blanco: en mobile arriba, en desktop izquierda */}
            <div className="relative p-8 sm:p-10 lg:p-12 bg-white text-zinc-800 order-1 lg:order-1 min-w-0 min-h-0 overflow-y-auto">
              <div className="flex flex-col items-center justify-center">
                <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500 font-black mb-3 sm:mb-4">Sistema Jurídico</p>
                <div className="h-24 sm:h-28 lg:h-32 w-auto max-w-[260px] sm:max-w-[300px] lg:max-w-[320px] flex items-center justify-center">
                  {!logoError ? (
                    <img
                      src={LOGO_IMAGE}
                      alt="Neira Trujillo Abogados"
                      className="h-24 sm:h-28 lg:h-32 w-auto max-h-28 sm:max-h-32 lg:max-h-36 object-contain"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                      <span className="font-serif font-black text-2xl text-orange-500">NT</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Solo en desktop: descripción y cards */}
              <div className="hidden lg:block mt-8 space-y-4">
                <p className="text-sm text-zinc-600 font-medium leading-relaxed">
                  Gestión de expedientes, actuaciones, alertas y notas con control por roles.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { title: 'Expedientes', desc: 'Histórico y búsqueda avanzada' },
                    { title: 'Tareas/Alertas', desc: 'Plazos y vencimientos' },
                    { title: 'Calendario', desc: 'Vista de eventos por día' },
                    { title: 'Excel', desc: 'Exportación profesional' },
                  ].map((f) => (
                    <div key={f.title} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-xs font-black uppercase tracking-widest text-zinc-800">{f.title}</p>
                      <p className="mt-1 text-[11px] text-zinc-600 font-bold">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="hidden lg:block mt-10 text-[9px] text-zinc-400 font-black uppercase tracking-[0.35em]">
                SEDE JULIACA · NT &copy; 2026
              </p>
            </div>

            {/* Panel login — en mobile fondo claro, en desktop oscuro */}
            <div className="bg-zinc-50 lg:bg-zinc-950/55 backdrop-blur-xl border-t border-zinc-200 lg:border-t-0 lg:border-l lg:border-white/10 p-6 sm:p-8 lg:p-12 text-zinc-800 lg:text-white order-2 min-w-0 min-h-0 flex flex-col justify-center overflow-y-auto">
              <div className="max-w-md mx-auto w-full">
                <div className="mb-6 lg:mb-8">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500 lg:text-white/60 font-black">Acceso</p>
                  <h2 className="text-2xl sm:text-3xl font-serif font-black text-zinc-900 lg:text-white mt-2">Iniciar sesión</h2>
                  <p className="text-sm text-zinc-600 lg:text-white/70 mt-2 font-medium">
                    Ingresa con tu usuario autorizado para acceder al sistema.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-600 lg:text-white/60 uppercase mb-2 tracking-widest">
                      Usuario
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 lg:text-white/50">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m11-10a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        required
                        autoComplete="username"
                        autoFocus
                        className="w-full bg-white lg:bg-white/5 border border-zinc-200 lg:border-white/10 rounded-2xl pl-11 pr-4 py-3.5 sm:py-4 outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-bold text-sm transition-all placeholder-zinc-400 lg:placeholder-white/40 text-zinc-900 lg:text-white"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Ej: admin"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-zinc-600 lg:text-white/60 uppercase mb-2 tracking-widest">
                      Contraseña
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 lg:text-white/50">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5 9 6.343 9 8s1.343 3 3 3z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2" />
                        </svg>
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        className="w-full bg-white lg:bg-white/5 border border-zinc-200 lg:border-white/10 rounded-2xl pl-11 pr-14 py-3.5 sm:py-4 outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-bold text-sm transition-all placeholder-zinc-400 lg:placeholder-white/40 text-zinc-900 lg:text-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 lg:text-white/70 hover:bg-zinc-100 lg:hover:bg-white/10 transition-all"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        disabled={loading}
                      >
                        {showPassword ? 'Ocultar' : 'Ver'}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div
                      className="bg-red-50 lg:bg-red-500/10 text-red-700 lg:text-red-200 p-4 rounded-2xl text-[11px] font-bold border border-red-200 lg:border-red-500/20"
                      role="alert"
                      aria-live="polite"
                    >
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !username.trim() || !password}
                    className="w-full bg-orange-500 text-white py-3.5 sm:py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl hover:bg-orange-600 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                        Ingresando...
                      </>
                    ) : (
                      'Ingresar'
                    )}
                  </button>

                  <div className="pt-2" />
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
