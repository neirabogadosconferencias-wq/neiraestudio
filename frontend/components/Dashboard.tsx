
import React from 'react';
import { LawCase, CaseStatus, CasePriority, ViewState } from '../types';
import * as storage from '../services/storageService';

interface DashboardProps {
  cases: LawCase[];
  onViewChange: (view: ViewState) => void;
  onSelectCase: (lawCase: LawCase) => void;
  onUpdateCase: (updatedCase: LawCase) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ cases, onViewChange, onSelectCase, onUpdateCase }) => {
  const now = new Date();
  const currentUser = storage.getCurrentUser();

  const calculateUrgency = (fechaVencimiento: string) => {
    const target = new Date(fechaVencimiento);
    const diffMs = target.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 0) return { label: 'Vencido', text: 'text-red-600' };
    if (diffHours < 24) return { label: 'Hoy', text: 'text-red-500 font-black' };
    if (diffHours < 72) return { label: 'Urgente', text: 'text-orange-500' };
    return { label: 'Pendiente', text: 'text-slate-500' };
  };

  const handleToggleAlerta = (e: React.MouseEvent, lawCase: LawCase, alertaId: string) => {
    e.stopPropagation();
    const updatedAlerts = lawCase.alertas.map(a => {
      if (a.id === alertaId) {
        const nextState = !a.cumplida;
        return { 
          ...a, 
          cumplida: nextState,
          completedBy: nextState ? (currentUser?.username || 'sistema') : undefined
        };
      }
      return a;
    });
    onUpdateCase({ ...lawCase, alertas: updatedAlerts });
  };

  const allAlerts = cases.flatMap(c => 
    c.alertas.map(a => ({ ...a, caratula: c.caratula, caseObj: c }))
  );
  
  const sortedAlerts = allAlerts.sort((a, b) => {
    if (a.cumplida !== b.cumplida) return a.cumplida ? 1 : -1;
    return new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime();
  });
  
  const recentCases = [...cases].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
        <div className="flex items-center gap-6">
           <div className="bg-zinc-950 p-5 rounded-3xl shadow-xl border border-zinc-800 flex flex-col items-center justify-center">
              <span className="text-orange-500 font-serif text-2xl font-bold leading-none">N</span>
              <span className="text-white font-serif text-2xl font-bold leading-none">T</span>
           </div>
           <div>
              <h2 className="text-3xl font-serif font-bold text-slate-900 tracking-tight leading-tight uppercase">
                Estudio Neira Trujillo Abogados SRL
              </h2>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1 flex items-center">
                <span className="w-8 h-[1px] bg-orange-500 mr-2"></span>
                SEDE JULIACA - GESTIÓN v5.0
              </p>
           </div>
        </div>
        <button 
          onClick={() => onViewChange('new-case')}
          className="bg-black hover:bg-orange-600 text-white font-black px-10 py-4 rounded-2xl transition-all flex items-center shadow-xl shadow-slate-200 uppercase tracking-widest text-[10px] transform active:scale-95"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          Nuevo Expediente
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-[70vh]">
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center justify-between sticky top-0 bg-white pb-2 z-10 border-b border-slate-50">
              Control de Plazos
              <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-lg text-[9px]">{allAlerts.filter(a=>!a.cumplida).length} Pendientes</span>
            </h3>
            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-3">
              {sortedAlerts.map(alerta => {
                const urgency = calculateUrgency(alerta.fecha_vencimiento);
                return (
                  <div key={alerta.id} onClick={() => onSelectCase(alerta.caseObj)} className={`alert-card group cursor-pointer p-5 rounded-[2rem] border transition-all ${alerta.cumplida ? 'alert-completed border-slate-100' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${alerta.cumplida ? 'text-slate-400' : urgency.text}`}>
                        {alerta.cumplida ? '● Finalizada' : urgency.label}
                      </span>
                      <button 
                        onClick={(e) => handleToggleAlerta(e, alerta.caseObj, alerta.id)}
                        className={`text-[8px] font-black uppercase border px-3 py-1 rounded-xl transition-all ${alerta.cumplida ? 'text-orange-500 border-orange-200 bg-white' : 'text-slate-400 border-slate-200 bg-white hover:text-green-600 hover:border-green-100'}`}
                      >
                        {alerta.cumplida ? 'Reabrir' : 'Listo ✓'}
                      </button>
                    </div>
                    <p className={`text-sm font-bold mt-3 leading-tight tracking-tight ${alerta.cumplida ? 'line-through text-slate-400' : 'text-slate-800'}`}>{alerta.titulo}</p>
                    <div className="flex justify-between mt-3 pt-3 border-t border-slate-100/50 items-center">
                      <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-tighter">{alerta.fecha_vencimiento} | {alerta.hora || '--:--'}</p>
                      <p className="text-[8px] text-slate-300 font-black uppercase truncate max-w-[80px]">{alerta.caratula}</p>
                    </div>
                    {alerta.cumplida && alerta.completedBy && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                        </div>
                        <p className="text-[8px] font-black text-green-600 uppercase italic">
                          Acción de @{alerta.completedBy}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
              {allAlerts.length === 0 && (
                <div className="py-20 text-center text-slate-300 flex flex-col items-center">
                  <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z"/></svg>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Agenda de plazos vacía</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[70vh]">
          <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Trazabilidad de Expedientes</h3>
            <span className="text-[9px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100 uppercase">Últimos movimientos</span>
          </div>
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-5">Carátula / ID Interno</th>
                  <th className="px-8 py-5">Auditoría</th>
                  <th className="px-8 py-5">Sincronización</th>
                  <th className="px-8 py-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentCases.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-all cursor-pointer group" onClick={() => onSelectCase(c)}>
                    <td className="px-8 py-6">
                      <p className="text-[10px] font-black text-orange-600 mb-1">{c.codigo_interno}</p>
                      <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-orange-600 transition-colors uppercase tracking-tighter">{c.caratula}</p>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-zinc-950 flex items-center justify-center text-[8px] text-orange-500 font-black">@</div>
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{c.lastModifiedBy || 'sistema'}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-tighter">{new Date(c.updatedAt).toLocaleDateString()} <br/> <span className="text-slate-300">{new Date(c.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="bg-black text-white px-6 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg hover:bg-orange-600 hover:shadow-orange-200">Ver Ficha</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
