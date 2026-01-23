
import React, { useState } from 'react';
import * as storage from '../services/storageService';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = storage.login(username, password);
    if (user) {
      onLogin(user);
    } else {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-2xl animate-fadeIn relative overflow-hidden">
        {/* Adorno sutil de fondo */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/5 rounded-full"></div>
        
        <div className="flex flex-col items-center mb-10 relative z-10 text-center">
          <div className="mb-4">
            <span className="text-orange-500 font-serif text-5xl font-bold">N</span>
            <span className="text-zinc-900 font-serif text-5xl font-bold">T</span>
          </div>
          <h1 className="text-xl font-serif font-bold text-slate-900 leading-tight uppercase tracking-tight">
            ESTUDIO <br/>
            <span className="text-2xl text-orange-600">NEIRA TRUJILLO</span> <br/>
            ABOGADOS SRL
          </h1>
          <p className="text-[9px] tracking-[0.4em] text-slate-400 uppercase font-black mt-2">
            SEDE JULIACA
          </p>
          <div className="w-16 h-1 bg-orange-500 my-6 rounded-full opacity-50"></div>
          <h2 className="text-[10px] tracking-[0.2em] text-slate-500 uppercase font-bold leading-relaxed max-w-[200px]">
            SISTEMA DE SEGUIMIENTO Y GESTIÓN DE CASOS
          </h2>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 relative z-10">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Usuario Autorizado</label>
            <input 
              type="text" 
              required
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm transition-all placeholder-slate-300"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nombre de usuario"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Clave de Seguridad</label>
            <input 
              type="password" 
              required
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm transition-all placeholder-slate-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-black uppercase text-center border border-red-100">
              {error}
            </div>
          )}
          <button type="submit" className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:bg-orange-600 transition-all transform active:scale-95 shadow-orange-900/10">
            Ingresar al Expediente
          </button>
        </form>
        
        <p className="mt-10 text-center text-[9px] text-slate-300 font-bold uppercase tracking-[0.3em]">
          NT ABOGADOS &copy; 2024
        </p>
      </div>
    </div>
  );
};

export default Login;
