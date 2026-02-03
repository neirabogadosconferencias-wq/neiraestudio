
import React, { useState, useEffect } from 'react';
import { LawCase, CaseStatus, ViewState, Cliente, CaseTag } from '../types';
import * as api from '../services/apiService';

const PAGE_SIZE = 8;

interface CaseListProps {
  cases: LawCase[];
  casesCount: number;
  casesPage: number;
  onSelectCase: (lawCase: LawCase) => void | Promise<void>;
  onViewChange: (view: ViewState) => void;
  onLoadCases: (filters?: api.CasesListFilters, page?: number) => Promise<void>;
}

const CaseList: React.FC<CaseListProps> = ({ cases, casesCount, casesPage, onSelectCase, onViewChange, onLoadCases }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [abogadoFilter, setAbogadoFilter] = useState('');
  const [fueroFilter, setFueroFilter] = useState('');
  const [juzgadoFilter, setJuzgadoFilter] = useState('');
  const [clienteFilter, setClienteFilter] = useState<string | number>('');
  const [etiquetaFilter, setEtiquetaFilter] = useState<string | number>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tags, setTags] = useState<CaseTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [openingCaseId, setOpeningCaseId] = useState<string | null>(null);
  
  const casesArray = Array.isArray(cases) ? cases : [];
  const totalPages = Math.max(1, Math.ceil(casesCount / PAGE_SIZE));

  // Cargar clientes y tags
  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientesData, tagsData] = await Promise.all([
          api.apiGetClientes(),
          api.apiGetTags()
        ]);
        setClientes(clientesData);
        setTags(tagsData);
      } catch (error) {
        console.error('Error al cargar datos:', error);
      }
    };
    loadData();
  }, []);

  const buildFilters = (): api.CasesListFilters | undefined => {
    const filters: api.CasesListFilters = {};
    if (searchTerm) filters.search = searchTerm;
    if (statusFilter !== 'all') filters.estado = statusFilter;
    if (abogadoFilter) filters.abogado = abogadoFilter;
    if (fueroFilter) filters.fuero = fueroFilter;
    if (juzgadoFilter) filters.juzgado = juzgadoFilter;
    if (clienteFilter) filters.cliente = clienteFilter;
    if (etiquetaFilter) filters.etiqueta = etiquetaFilter;
    return Object.keys(filters).length > 0 ? filters : undefined;
  };

  // Aplicar filtros (con debounce para búsqueda)
  useEffect(() => {
    const applyFilters = async (page: number = 1) => {
      setLoading(true);
      await onLoadCases(buildFilters(), page);
      setLoading(false);
    };
    const delay = searchTerm ? 500 : 0;
    const timeoutId = setTimeout(() => applyFilters(1), delay);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, abogadoFilter, fueroFilter, juzgadoFilter, clienteFilter, etiquetaFilter]);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setLoading(true);
    onLoadCases(buildFilters(), page).finally(() => setLoading(false));
  };

  // Lógica de pesos para ordenamiento
  const statusWeight = {
    [CaseStatus.IN_PROGRESS]: 0,
    [CaseStatus.OPEN]: 0,
    [CaseStatus.PAUSED]: 1,
    [CaseStatus.CLOSED]: 2
  };

  const filteredCases = casesArray.sort((a, b) => statusWeight[a.estado] - statusWeight[b.estado]);

  const exportToExcel = async () => {
    if (casesArray.length === 0) {
      alert('No hay expedientes para exportar');
      return;
    }
    
    try {
      setIsExporting(true);
      const filters = buildFilters();
      const blob = await api.apiExportExcel(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Expedientes_Estudio_Neira_Trujillo_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error al exportar:', error);
      alert(error?.message || 'Error al exportar a Excel. Asegúrate de que openpyxl esté instalado en el backend.');
    } finally {
      setIsExporting(false);
    }
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
            disabled={isExporting || casesArray.length === 0}
            className="bg-green-600 text-white px-5 py-2 rounded-xl font-bold hover:bg-green-700 transition-all text-xs flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exportando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Exportar a Excel
              </>
            )}
          </button>
          <button 
            onClick={() => onViewChange('new-case')}
            className="bg-black text-white px-6 py-2 rounded-xl font-bold hover:bg-zinc-800 transition-all text-xs flex items-center"
          >
            Nuevo Caso
          </button>
        </div>
      </div>

      <div className="space-y-4">
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
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
            Filtros {showAdvancedFilters ? '▼' : '▶'}
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Abogado</label>
              <input
                type="text"
                placeholder="Filtrar por abogado..."
                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs"
                value={abogadoFilter}
                onChange={(e) => setAbogadoFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fuero</label>
              <select
                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs"
                value={fueroFilter}
                onChange={(e) => setFueroFilter(e.target.value)}
              >
                <option value="">Todos los fueros</option>
                <option value="Civil">Civil</option>
                <option value="Comercial">Comercial</option>
                <option value="Penal">Penal</option>
                <option value="Laboral">Laboral</option>
                <option value="Familia">Familia</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Juzgado</label>
              <input
                type="text"
                placeholder="Filtrar por juzgado..."
                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs"
                value={juzgadoFilter}
                onChange={(e) => setJuzgadoFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Cliente</label>
              <select
                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs"
                value={clienteFilter}
                onChange={(e) => setClienteFilter(e.target.value || '')}
              >
                <option value="">Todos los clientes</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre_completo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Etiqueta</label>
              <select
                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs"
                value={etiquetaFilter}
                onChange={(e) => setEtiquetaFilter(e.target.value || '')}
              >
                <option value="">Todas las etiquetas</option>
                {tags.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setAbogadoFilter('');
                  setFueroFilter('');
                  setJuzgadoFilter('');
                  setClienteFilter('');
                  setEtiquetaFilter('');
                }}
                className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold transition-all"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-2xl">
            <span className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
          </div>
        )}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[900px] text-left border-collapse">
          <thead>
            <tr className="bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest">
              <th className="px-6 py-4">ID Interno / Exp</th>
              <th className="px-6 py-4">Carátula</th>
              <th className="px-6 py-4">Abogado responsable</th>
              <th className="px-6 py-4">Fuero</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCases.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <p className="text-slate-400 font-bold text-sm">No se encontraron expedientes</p>
                    <p className="text-slate-300 text-xs mt-1">{searchTerm || statusFilter !== 'all' ? 'Intenta con otros filtros' : 'Crea tu primer expediente'}</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCases.map(c => (
              <tr key={c.id} className={`hover:bg-slate-50 transition-all group ${c.estado === CaseStatus.CLOSED ? 'opacity-60 grayscale' : ''}`}>
                <td className="px-6 py-4">
                  <p className="text-xs font-black text-orange-600">{c.codigo_interno}</p>
                  <p className="text-[10px] font-mono text-slate-400">{c.nro_expediente}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-slate-800">{c.caratula}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{c.cliente_nombre_display || c.cliente?.nombre_completo || c.cliente_nombre}</p>
                  {c.etiquetas && c.etiquetas.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {c.etiquetas.map(tag => (
                        <span
                          key={tag.id}
                          className="px-2 py-0.5 rounded text-[8px] font-black uppercase"
                          style={{ backgroundColor: tag.color + '20', color: tag.color }}
                        >
                          {tag.nombre}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs font-bold text-slate-700">{c.abogado_responsable || '—'}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs text-slate-600">{c.fuero || '—'}</p>
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
                    onClick={async () => {
                      if (openingCaseId) return;
                      setOpeningCaseId(String(c.id));
                      try {
                        await onSelectCase(c);
                      } finally {
                        setOpeningCaseId(null);
                      }
                    }}
                    disabled={!!openingCaseId}
                    className="bg-black text-white px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-orange-600 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                  >
                    {openingCaseId === String(c.id) ? (
                      <>
                        <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                        Abriendo...
                      </>
                    ) : (
                      'Abrir Ficha'
                    )}
                  </button>
                </td>
              </tr>
            ))
            )}
          </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs font-bold text-slate-500">
              Página {casesPage} de {totalPages} · {casesCount} expediente{casesCount !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => goToPage(casesPage - 1)}
                disabled={loading || casesPage <= 1}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => goToPage(casesPage + 1)}
                disabled={loading || casesPage >= totalPages}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseList;
