
import React from 'react';
import { ViewState } from '../types';
import * as storage from '../services/storageService';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onViewChange, onLogout }) => {
  const currentUser = storage.getCurrentUser();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-72 bg-black text-white flex flex-col hidden md:flex">
        <div className="p-8 border-b border-slate-800">
          <div className="flex flex-col items-center text-center">
             <h1 className="text-sm font-serif font-bold leading-tight tracking-widest text-white uppercase">
               ESTUDIO <br/>
               <span className="text-orange-500 text-lg">NEIRA TRUJILLO</span> <br/>
               ABOGADOS SRL
             </h1>
             <p className="text-[8px] tracking-[0.4em] text-slate-500 uppercase font-black mt-2">SEDE JULIACA</p>
          </div>
        </div>
        <nav className="flex-1 mt-8 px-4 space-y-2">
          <button 
            onClick={() => onViewChange('dashboard')}
            className={`w-full flex items-center px-5 py-4 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest ${currentView === 'dashboard' ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20' : 'hover:bg-zinc-900 text-slate-400'}`}
          >
            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            Dashboard
          </button>
          <button 
            onClick={() => onViewChange('cases')}
            className={`w-full flex items-center px-5 py-4 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest ${currentView === 'cases' || currentView === 'case-detail' ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20' : 'hover:bg-zinc-900 text-slate-400'}`}
          >
            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            Expedientes
          </button>
          <button 
            onClick={() => onViewChange('new-case')}
            className={`w-full flex items-center px-5 py-4 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest ${currentView === 'new-case' ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20' : 'hover:bg-zinc-900 text-slate-400'}`}
          >
            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
            Nueva Carátula
          </button>
          {currentUser?.isAdmin && (
            <button 
              onClick={() => onViewChange('users')}
              className={`w-full flex items-center px-5 py-4 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest ${currentView === 'users' ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20' : 'hover:bg-zinc-900 text-slate-400'}`}
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              Usuarios
            </button>
          )}
        </nav>
        <div className="p-6 border-t border-slate-800 bg-zinc-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white font-black text-xs uppercase shadow-lg shadow-orange-900/20">
                {currentUser?.username?.substring(0,2)}
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-200 truncate">{currentUser?.username}</p>
                <p className="text-[8px] text-orange-500 font-black uppercase tracking-tighter">{currentUser?.isAdmin ? 'ADMINISTRADOR' : 'SOCIO ESTUDIO'}</p>
              </div>
            </div>
            <button onClick={onLogout} title="Cerrar Sesión" className="text-slate-500 hover:text-red-500 ml-2 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
        <header className="md:hidden bg-black text-white p-4 flex justify-between items-center shadow-lg">
          <span className="text-xs font-serif font-bold tracking-widest text-orange-500 uppercase">NEIRA TRUJILLO</span>
          <button onClick={onLogout} className="p-2 text-white font-black text-[9px] uppercase border border-slate-700 rounded-lg">CERRAR</button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
