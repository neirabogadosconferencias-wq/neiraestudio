
import React, { useState } from 'react';
import { LawCase, CaseStatus, ViewState } from '../types';

interface CaseListProps {
  cases: LawCase[];
  onSelectCase: (lawCase: LawCase) => void;
  onViewChange: (view: ViewState) => void;
}

const CaseList: React.FC<CaseListProps> = ({ cases, onSelectCase, onViewChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Lógica de pesos para ordenamiento
  const statusWeight = {
    [CaseStatus.IN_PROGRESS]: 0,
    [CaseStatus.OPEN]: 0,
    [CaseStatus.PAUSED]: 1,
    [CaseStatus.CLOSED]: 2
  };

  const filteredCases = cases
    .filter(c => {
      const matchesSearch = 
        c.caratula.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.nro_expediente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.codigo_interno.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.estado === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => statusWeight[a.estado] - statusWeight[b.estado]);

  const exportToExcel = () => {
    const headers = ["Codigo Interno", "Caratula", "Nro Expediente", "Juzgado", "Fuero", "Estado", "Cliente", "Contraparte", "Abogado Responsable"];
    const rows = cases.map(c => [
      c.codigo_interno,
      c.caratula,
      c.nro_expediente,
      c.juzgado,
      c.fuero,
      c.estado,
      c.cliente_nombre,
      c.contraparte,
      c.abogado_responsable
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Caratulas_Estudio_Neira_Trujillo.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-slate-900">Histórico de Expedientes</h2>
          <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Neira Trujillo - Gestión de Carpetas</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportToExcel}
            className="bg-green-600 text-white px-5 py-2 rounded-xl font-bold hover:bg-green-700 transition-all text-xs flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Exportar para Folder
          </button>
          <button 
            onClick={() => onViewChange('new-case')}
            className="bg-black text-white px-6 py-2 rounded-xl font-bold hover:bg-zinc-800 transition-all text-xs flex items-center"
          >
            Nuevo Caso
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input 
            type="text" 
            placeholder="Buscar por código ENT, expediente o cliente..." 
            className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-bold"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos los estados</option>
          {Object.values(CaseStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest">
              <th className="px-6 py-4">ID Interno / Exp</th>
              <th className="px-6 py-4">Carátula</th>
              <th className="px-6 py-4">Estado Procesal</th>
              <th className="px-6 py-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCases.map(c => (
              <tr key={c.id} className={`hover:bg-slate-50 transition-all group ${c.estado === CaseStatus.CLOSED ? 'opacity-60 grayscale' : ''}`}>
                <td className="px-6 py-4">
                  <p className="text-xs font-black text-orange-600">{c.codigo_interno}</p>
                  <p className="text-[10px] font-mono text-slate-400">{c.nro_expediente}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-slate-800">{c.caratula}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{c.cliente_nombre}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    c.estado === CaseStatus.CLOSED ? 'bg-zinc-100 text-zinc-500' : 'bg-orange-50 text-orange-600'
                  }`}>
                    {c.estado}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => onSelectCase(c)}
                    className="bg-black text-white px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-orange-600 transition-all shadow-md"
                  >
                    Abrir Ficha
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CaseList;
