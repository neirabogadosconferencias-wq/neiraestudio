
import React, { useState } from 'react';
import { LawCase, CaseStatus, CasePriority, CaseNote, CaseAlerta, CaseActuacion, User } from '../types';
import * as storage from '../services/storageService';

interface CaseDetailProps {
  lawCase: LawCase;
  onUpdate: (updatedCase: LawCase) => void;
  onBack: () => void;
  onDelete: (id: string) => void;
}

const CaseDetail: React.FC<CaseDetailProps> = ({ lawCase, onUpdate, onBack, onDelete }) => {
  const [activeTab, setActiveTab] = useState<'actuaciones' | 'alertas' | 'notas' | 'editar'>('actuaciones');
  const currentUser = storage.getCurrentUser();
  
  // Estados para CRUD
  const [editingActId, setEditingActId] = useState<string | null>(null);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const [newNote, setNewNote] = useState({ titulo: '', contenido: '', etiqueta: 'Estrategia' });
  const [newActuacion, setNewActuacion] = useState({ descripcion: '', tipo: 'Escrito', tipoPersonalizado: '', fecha: new Date().toISOString().split('T')[0] });
  const [newAlerta, setNewAlerta] = useState({ titulo: '', resumen: '', hora: '', fecha_vencimiento: '', prioridad: CasePriority.MEDIA });

  // --- LOGICA DE ACTUALIZACIÓN CENTRAL ---
  const handleUpdateField = (field: keyof LawCase, value: any) => {
    onUpdate({ ...lawCase, [field]: value });
  };

  // --- CRUD DE ALERTAS MEJORADO ---
  const addAlerta = () => {
    if (!newAlerta.titulo || !newAlerta.fecha_vencimiento) return;
    if (editingAlertId) {
      const updated = lawCase.alertas.map(a => a.id === editingAlertId ? { ...a, ...newAlerta } : a);
      onUpdate({ ...lawCase, alertas: updated });
      setEditingAlertId(null);
    } else {
      const al: CaseAlerta = { 
        id: Math.random().toString(36).substr(2, 9), 
        caso_id: lawCase.id, 
        ...newAlerta, 
        cumplida: false,
        createdBy: currentUser?.username || 'sistema'
      };
      onUpdate({ ...lawCase, alertas: [al, ...lawCase.alertas] });
    }
    setNewAlerta({ titulo: '', resumen: '', hora: '', fecha_vencimiento: '', prioridad: CasePriority.MEDIA });
  };

  // --- BIBLIOTECA POR EVENTO ---
  const addNote = () => {
    if (!newNote.contenido || !newNote.titulo) return;
    if (editingNoteId) {
      const updated = lawCase.notas.map(n => n.id === editingNoteId ? { ...n, ...newNote } : n);
      onUpdate({ ...lawCase, notas: updated });
      setEditingNoteId(null);
    } else {
      const note: CaseNote = { 
        id: Math.random().toString(36).substr(2, 9), 
        caso_id: lawCase.id, 
        ...newNote, 
        fecha_creacion: new Date().toISOString(),
        createdBy: currentUser?.username || 'sistema'
      };
      onUpdate({ ...lawCase, notas: [note, ...lawCase.notas] });
    }
    setNewNote({ titulo: '', contenido: '', etiqueta: 'Estrategia' });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-6 z-10">
          <button onClick={onBack} className="p-3 bg-slate-50 text-slate-400 hover:text-orange-500 rounded-2xl transition-all shadow-inner border border-slate-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black bg-orange-600 text-white px-3 py-1 rounded-lg uppercase tracking-widest shadow-lg shadow-orange-200">{lawCase.codigo_interno}</span>
              <span className="text-[10px] font-black bg-zinc-900 text-white px-3 py-1 rounded-lg uppercase tracking-widest">{lawCase.nro_expediente}</span>
            </div>
            <h2 className="text-3xl font-serif font-bold text-slate-900 mt-2">{lawCase.caratula}</h2>
            <p className="text-[9px] text-slate-400 uppercase font-black mt-2 tracking-widest border-l-2 border-orange-500 pl-2">
              Auditoría: Creado por @{lawCase.createdBy} | Modificado por @{lawCase.lastModifiedBy}
            </p>
          </div>
        </div>
        <div className="flex gap-2 z-10">
           <button onClick={() => setActiveTab('editar')} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-100 transition-all">Editar Carátula</button>
           <button onClick={() => confirm("¿Eliminar expediente?") && onDelete(lawCase.id)} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-50 rounded-xl border border-red-100 transition-all">Eliminar</button>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16"></div>
      </header>

      <nav className="flex gap-2 bg-white p-1.5 rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
        {(['actuaciones', 'alertas', 'notas'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-black text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            {tab === 'notas' ? 'Biblioteca Estratégica' : tab}
          </button>
        ))}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-4">Detalles del Proceso</h3>
              {[
                { label: 'Responsable', value: lawCase.abogado_responsable },
                { label: 'Juzgado / Sala', value: lawCase.juzgado },
                { label: 'Cliente', value: lawCase.cliente_nombre },
                { label: 'DNI/RUC', value: lawCase.cliente_dni },
                { label: 'Contraparte', value: lawCase.contraparte }
              ].map(item => (
                <div key={item.label}>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">{item.label}</p>
                   <p className="text-sm font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl">{item.value || 'No consignado'}</p>
                </div>
              ))}
              <div className="pt-4 border-t border-slate-50">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Estado de Tramitación</p>
                <select 
                  className="w-full bg-orange-50 text-orange-600 font-black px-4 py-3 rounded-2xl outline-none text-[10px] uppercase tracking-widest border border-orange-100 shadow-sm"
                  value={lawCase.estado}
                  onChange={(e) => handleUpdateField('estado', e.target.value)}
                >
                  {Object.values(CaseStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
           </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'actuaciones' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <h4 className="text-[11px] font-black text-orange-600 uppercase tracking-widest mb-6">Nuevo Registro de Actuación</h4>
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <input className="flex-1 bg-slate-50 p-4 rounded-2xl outline-none text-xs font-bold border border-slate-100 focus:border-orange-200 transition-all" placeholder="Resumen de la actuación..." value={newActuacion.descripcion} onChange={(e) => setNewActuacion({...newActuacion, descripcion: e.target.value})} />
                    <select className="bg-slate-50 p-4 rounded-2xl outline-none text-[10px] font-bold border border-slate-100" value={newActuacion.tipo} onChange={(e) => setNewActuacion({...newActuacion, tipo: e.target.value})}>
                      <option value="Escrito">Escrito</option>
                      <option value="Audiencia">Audiencia</option>
                      <option value="Notificación">Notificación</option>
                      <option value="Varios">Varios</option>
                      <option value="Otro">Otro Tipo...</option>
                    </select>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    {newActuacion.tipo === 'Otro' && (
                      <input className="flex-1 bg-slate-50 p-4 rounded-2xl outline-none text-[10px] font-bold border border-orange-200" placeholder="Especifique tipo de actuación..." value={newActuacion.tipoPersonalizado} onChange={(e) => setNewActuacion({...newActuacion, tipoPersonalizado: e.target.value})} />
                    )}
                    <input type="date" className="bg-slate-50 p-4 rounded-2xl outline-none text-[10px] font-bold border border-slate-100" value={newActuacion.fecha} onChange={(e) => setNewActuacion({...newActuacion, fecha: e.target.value})} />
                    <button onClick={() => {}} className="bg-orange-500 text-white p-4 px-10 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all">Agregar al Timeline</button>
                  </div>
                </div>
              </div>
              {/* Timeline Items... similar a versiones anteriores pero con auditoría visible */}
            </div>
          )}

          {activeTab === 'alertas' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-6">Programar Vencimiento / Plazo</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input className="bg-slate-50 p-4 rounded-2xl outline-none text-xs font-bold border border-slate-100" placeholder="Título (ej: Plazo Contestación)" value={newAlerta.titulo} onChange={(e) => setNewAlerta({...newAlerta, titulo: e.target.value})} />
                    <input type="date" className="bg-slate-50 p-4 rounded-2xl outline-none text-[10px] font-bold border border-slate-100" value={newAlerta.fecha_vencimiento} onChange={(e) => setNewAlerta({...newAlerta, fecha_vencimiento: e.target.value})} />
                    <input type="time" className="bg-slate-50 p-4 rounded-2xl outline-none text-[10px] font-bold border border-slate-100" value={newAlerta.hora} onChange={(e) => setNewAlerta({...newAlerta, hora: e.target.value})} />
                  </div>
                  <textarea className="w-full bg-slate-50 p-4 rounded-2xl outline-none text-[11px] font-bold border border-slate-100 min-h-[80px]" placeholder="Resumen detallado del vencimiento..." value={newAlerta.resumen} onChange={(e) => setNewAlerta({...newAlerta, resumen: e.target.value})} />
                  <button onClick={addAlerta} className="w-full bg-black text-white p-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-zinc-800 transition-all">Registrar Plazo</button>
                </div>
              </div>

              <div className="space-y-4">
                {lawCase.alertas.map(al => (
                  <div key={al.id} className={`p-6 rounded-[2rem] border transition-all relative group ${al.cumplida ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="flex justify-between items-start mb-4">
                       <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${al.cumplida ? 'bg-zinc-200 text-zinc-500' : 'bg-orange-100 text-orange-600'}`}>
                          {al.cumplida ? 'Cumplido' : 'Pendiente'}
                       </span>
                       <div className="flex gap-4 items-center">
                          <span className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-tighter">{al.fecha_vencimiento} {al.hora}</span>
                          <button onClick={() => confirm("Borrar?") && handleUpdateField('alertas', lawCase.alertas.filter(a=>a.id!==al.id))} className="text-red-300 hover:text-red-500 font-black">×</button>
                       </div>
                    </div>
                    <p className={`text-base font-bold ${al.cumplida ? 'line-through text-slate-400' : 'text-slate-900 uppercase'}`}>{al.titulo}</p>
                    {al.resumen && <p className="text-sm text-slate-500 mt-2 font-medium bg-slate-50 p-4 rounded-2xl border border-slate-50 italic">{al.resumen}</p>}
                    <div className="mt-4 flex justify-between items-center text-[9px] font-black uppercase text-slate-300">
                      <span>Programado por @{al.createdBy}</span>
                      {al.cumplida && <span>✓ {al.completedBy}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notas' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <h4 className="text-[11px] font-black text-orange-600 uppercase tracking-widest mb-6">Biblioteca Estratégica: Registro de Evento</h4>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <input className="flex-1 bg-slate-50 p-4 rounded-2xl outline-none text-sm font-bold border border-slate-100" placeholder="Título del Evento (ej: Resultado Entrevista)" value={newNote.titulo} onChange={(e) => setNewNote({...newNote, titulo: e.target.value})} />
                    <select className="bg-slate-50 p-4 rounded-2xl outline-none text-[10px] font-black border border-slate-100 uppercase" value={newNote.etiqueta} onChange={(e) => setNewNote({...newNote, etiqueta: e.target.value})}>
                      <option value="Estrategia">Estrategia</option>
                      <option value="Documentación">Documentación</option>
                      <option value="Investigación">Investigación</option>
                      <option value="Jurisprudencia">Jurisprudencia</option>
                    </select>
                  </div>
                  <textarea className="w-full bg-slate-50 p-6 rounded-2xl outline-none text-sm font-medium min-h-[150px] border border-slate-100" placeholder="Escriba el análisis detallado aquí..." value={newNote.contenido} onChange={(e) => setNewNote({...newNote, contenido: e.target.value})}></textarea>
                  <button onClick={addNote} className="w-full bg-black text-white p-4 rounded-2xl font-black text-[10px] uppercase shadow-xl">Guardar en Biblioteca</button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {lawCase.notas.map(note => (
                  <div key={note.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:border-orange-200 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-lg uppercase w-fit mb-2 tracking-widest">{note.etiqueta}</span>
                        <h6 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{note.titulo}</h6>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg uppercase tracking-widest">
                        {new Date(note.fecha_creacion).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm text-slate-700 leading-relaxed font-medium bg-slate-50/30 p-6 rounded-[1.5rem] border border-slate-50/50 whitespace-pre-wrap">
                      {note.contenido}
                    </div>
                    <p className="text-[9px] text-slate-300 font-black uppercase mt-6 text-right tracking-[0.1em]">Escrito por @{note.createdBy}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'editar' && (
            <div className="bg-white p-10 rounded-[2rem] border border-slate-100 shadow-2xl">
               <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-8 border-b pb-4">Actualizar Datos Principales</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carátula</label>
                   <input className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold border border-slate-100" value={lawCase.caratula} onChange={(e) => handleUpdateField('caratula', e.target.value)} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nro Expediente</label>
                   <input className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-mono border border-slate-100" value={lawCase.nro_expediente} onChange={(e) => handleUpdateField('nro_expediente', e.target.value)} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Juzgado / Ubicación</label>
                   <input className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100" value={lawCase.juzgado} onChange={(e) => handleUpdateField('juzgado', e.target.value)} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Abogado Resp.</label>
                   <input className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold" value={lawCase.abogado_responsable} onChange={(e) => handleUpdateField('abogado_responsable', e.target.value)} />
                 </div>
               </div>
               <button onClick={() => setActiveTab('actuaciones')} className="mt-10 bg-black text-white px-12 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl hover:bg-zinc-800 transition-all">Guardar Cambios en Ficha</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaseDetail;
