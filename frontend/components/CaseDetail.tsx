
import React, { useState, useEffect } from 'react';
import { LawCase, CaseStatus, CasePriority, CaseNote, CaseAlerta, CaseActuacion, User, CaseTag, ActuacionTemplate } from '../types';
import * as api from '../services/apiService';
import MiniRichEditor from './MiniRichEditor';

interface CaseDetailProps {
  lawCase: LawCase;
  onUpdate: (updatedCase: LawCase) => void;
  onBack: () => void;
  onDelete: (id: string) => void;
}

const CaseDetail: React.FC<CaseDetailProps> = ({ lawCase, onUpdate, onBack, onDelete }) => {
  const [activeTab, setActiveTab] = useState<'actuaciones' | 'alertas' | 'notas' | 'editar'>('actuaciones');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [caseData, setCaseData] = useState<LawCase>({
    ...lawCase,
    actuaciones: lawCase.actuaciones || [],
    alertas: lawCase.alertas || [],
    notas: lawCase.notas || [],
  });

  useEffect(() => {
    // 1. Carga optimista del usuario (Instant Admin UI)
    const storedUser = api.apiGetStoredUser();
    if (storedUser) {
      setCurrentUser(storedUser);
    }

    const loadData = async () => {
      try {
        // La validación del usuario ocurre en background
        const [user, fullCase, templatesData, tagsData] = await Promise.all([
          api.apiGetCurrentUser(),
          api.apiGetCase(lawCase.id).catch(() => lawCase),
          api.apiGetActuacionTemplates(),
          api.apiGetTags()
        ]);

        // Si el usuario validado es diferente (ej: permisos cambiaron), actualizar
        if (user && JSON.stringify(user) !== JSON.stringify(storedUser)) {
          setCurrentUser(user);
        }

        // Asegurar que los arrays estén inicializados
        setCaseData({
          ...fullCase,
          actuaciones: fullCase.actuaciones || [],
          alertas: fullCase.alertas || [],
          notas: fullCase.notas || [],
        });
        setTemplates(templatesData || []);
        setTags(tagsData || []);
      } catch (error) {
        console.error('Error al cargar datos del expediente:', error);
        // Fallback seguro
        setCaseData({
          ...lawCase,
          actuaciones: lawCase.actuaciones || [],
          alertas: lawCase.alertas || [],
          notas: lawCase.notas || [],
        });
      }
    };
    loadData();
  }, [lawCase.id]);

  // Estados para CRUD
  const [editingActId, setEditingActId] = useState<string | null>(null);
  const [editActuacionDraft, setEditActuacionDraft] = useState<{ descripcion: string; tipo: string; fecha: string } | null>(null);
  const [savingActuacionId, setSavingActuacionId] = useState<string | null>(null);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [submittingAlerta, setSubmittingAlerta] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);
  const [submittingActuacion, setSubmittingActuacion] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [newNote, setNewNote] = useState({ titulo: '', resumen: '', contenido: '', etiqueta: 'Estrategia' });
  const [newActuacion, setNewActuacion] = useState({ descripcion: '', tipo: 'Escrito', tipoPersonalizado: '', fecha: new Date().toISOString().split('T')[0] });
  const [newAlerta, setNewAlerta] = useState({ titulo: '', resumen: '', hora: '', fecha_vencimiento: '', prioridad: CasePriority.MEDIA, tiempo_estimado_minutos: 0 as number });
  const [templates, setTemplates] = useState<ActuacionTemplate[]>([]);
  const [tags, setTags] = useState<CaseTag[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [abogados, setAbogados] = useState<User[]>([]);
  const [actuacionFilterTipo, setActuacionFilterTipo] = useState<string>('');
  const [actuacionOrder, setActuacionOrder] = useState<'desc' | 'asc'>('desc');
  const [actuacionPage, setActuacionPage] = useState(1);
  // Pagination & Sort for Notes
  const [notePage, setNotePage] = useState(1);
  const NOTES_PAGE_SIZE = 3;

  const isAdmin = Boolean(currentUser?.isAdmin || currentUser?.is_admin);

  const ACTUACIONES_PAGE_SIZE = 5;
  const actuacionesRaw = caseData.actuaciones || [];
  const actuacionesSorted = [...actuacionesRaw].sort((a, b) => {
    const dateA = a.fecha ? new Date(a.fecha).getTime() : 0;
    const dateB = b.fecha ? new Date(b.fecha).getTime() : 0;
    return actuacionOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });
  const actuacionesFiltered = actuacionFilterTipo
    ? actuacionesSorted.filter((a) => (a.tipo || '') === actuacionFilterTipo)
    : actuacionesSorted;
  const actuacionesTotal = actuacionesFiltered.length;
  const actuacionesPaginated = actuacionesFiltered.slice(
    (actuacionPage - 1) * ACTUACIONES_PAGE_SIZE,
    actuacionPage * ACTUACIONES_PAGE_SIZE
  );
  const actuacionesTotalPages = Math.max(1, Math.ceil(actuacionesTotal / ACTUACIONES_PAGE_SIZE));

  // Notas Logic
  const notesRaw = caseData.notas || [];
  const notesSorted = [...notesRaw].sort((a, b) => {
    // Sort by created_at desc
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });
  const notesTotal = notesSorted.length;
  const notesPaginated = notesSorted.slice(
    (notePage - 1) * NOTES_PAGE_SIZE,
    notePage * NOTES_PAGE_SIZE
  );
  const notesTotalPages = Math.max(1, Math.ceil(notesTotal / NOTES_PAGE_SIZE));

  const tiposActuacion = Array.from(new Set(actuacionesRaw.map((a) => a.tipo).filter(Boolean))) as string[];

  useEffect(() => {
    // Cargar lista de abogados solo si es admin (optimización)
    if (isAdmin) {
      api.apiGetUsers().then((users) => {
        // Verificar si el componente sigue montado (cleanup safety si fuera class, acá es effect)
        setAbogados(users.filter((u) => u.rol === 'abogado'));
      }).catch(() => setAbogados([]));
    }
  }, [isAdmin]);

  // --- LOGICA DE ACTUALIZACIÓN CENTRAL ---
  const handleUpdateField = async (field: keyof LawCase, value: any) => {
    const previousValue = caseData[field as keyof LawCase];
    setCaseData((prev) => ({ ...prev, [field]: value }));
    try {
      const updated = await api.apiUpdateCase(String(caseData.id), { [field]: value });
      setCaseData(updated);
      onUpdate(updated);
    } catch (error) {
      console.error('Error al actualizar:', error);
      setCaseData((prev) => ({ ...prev, [field]: previousValue }));
      alert('Error al actualizar. Por favor, intenta nuevamente.');
    }
  };

  // --- LOGICA EXPEDIENTE DIGITAL ---
  const [digitalLinkInput, setDigitalLinkInput] = useState('');
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);

  useEffect(() => {
    if (caseData.folder_link) {
      setDigitalLinkInput(caseData.folder_link);
    }
  }, [caseData.folder_link]);

  const saveDigitalLink = async () => {
    if (!caseData.id) return;
    setIsSavingLink(true);
    setShowSuccessMsg(false);
    try {
      await handleUpdateField('folder_link', digitalLinkInput);
      setShowSuccessMsg(true);
      setTimeout(() => setShowSuccessMsg(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Error al guardar el enlace.');
    } finally {
      setIsSavingLink(false);
    }
  };

  // ... (rest of code)

  // (In render)
  // Update Tab Button Color
  {
    isAdmin && (
      <button
        onClick={() => setActiveTab('digital' as any)}
        className={`flex-1 py-4 px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === ('digital' as any) ? 'bg-orange-500 text-white shadow-xl shadow-orange-200' : 'text-slate-400 hover:bg-slate-50'}`}
      >
        Expediente Digital
      </button>
    )
  }

  // Update Public Button Color
  {
    caseData.folder_link && (
      <a
        href={caseData.folder_link}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-3 w-full bg-black hover:bg-zinc-800 text-white p-4 rounded-2xl shadow-lg shadow-slate-200 transition-all group"
      >
        <svg className="w-5 h-5 text-orange-500 group-hover:text-orange-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
        <div className="text-left">
          <p className="text-[9px] font-black uppercase opacity-70 text-zinc-400">Acceso Directo</p>
          <p className="text-xs font-black uppercase tracking-widest text-white">Abrir Carpeta Digital</p>
        </div>
        <svg className="w-4 h-4 ml-auto opacity-50 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
      </a>
    )
  }

  // Update Admin Tab Content Colors and Notification
  {
    activeTab === ('digital' as any) && isAdmin && (
      <div className="space-y-6 animate-fadeIn">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
          </div>
          <h4 className="text-xl font-bold text-slate-900 mb-2">Vincular Carpeta Digital</h4>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-8">
            Conecta este expediente con su carpeta en la nube (Google Drive, Dropbox, OneDrive).
            El botón de acceso aparecerá automáticamente para todos los usuarios.
          </p>

          <div className="max-w-xl mx-auto space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <input
                type="url"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium text-slate-700"
                placeholder="https://drive.google.com/drive/folders/..."
                value={digitalLinkInput}
                onChange={(e) => setDigitalLinkInput(e.target.value)}
              />
            </div>

            <button
              onClick={saveDigitalLink}
              disabled={isSavingLink}
              className="w-full bg-black hover:bg-zinc-800 text-white font-bold py-4 rounded-2xl shadow-lg shadow-slate-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSavingLink ? 'Guardando...' : 'Guardar Enlace'}
            </button>

            {/* Custom Notification */}
            {showSuccessMsg && (
              <div className="animate-fadeIn p-4 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100 flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                Link del expediente actualizado correctamente.
              </div>
            )}

            {caseData.folder_link && (
              <div className="pt-4 mt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-widest">Enlace actual activo</p>
                <a href={caseData.folder_link} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline text-sm break-all font-medium">
                  {caseData.folder_link}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // --- CRUD DE ALERTAS ---
  const addAlerta = async () => {
    if (!newAlerta.titulo.trim() || !newAlerta.fecha_vencimiento) {
      alert('Por favor, completa el título y la fecha de vencimiento');
      return;
    }
    setSubmittingAlerta(true);
    try {
      if (editingAlertId) {
        const updated = await api.apiUpdateAlerta(editingAlertId, newAlerta);
        const updatedAlertas = (caseData.alertas || []).map(a => String(a.id) === String(editingAlertId) ? updated : a);
        const updatedCase = { ...caseData, alertas: updatedAlertas };
        setCaseData(updatedCase);
        onUpdate(updatedCase);
        setEditingAlertId(null);
      } else {
        const payload = {
          titulo: newAlerta.titulo.trim(),
          resumen: newAlerta.resumen.trim() || '',
          hora: newAlerta.hora?.trim() ? newAlerta.hora : null,
          fecha_vencimiento: newAlerta.fecha_vencimiento,
          prioridad: newAlerta.prioridad,
          tiempo_estimado_minutos: newAlerta.tiempo_estimado_minutos || 0,
        };
        const nueva = await api.apiCreateAlerta(String(caseData.id), payload);
        const updatedCase = { ...caseData, alertas: [nueva, ...(caseData.alertas || [])] };
        setCaseData(updatedCase);
        onUpdate(updatedCase);
      }
      setNewAlerta({ titulo: '', resumen: '', hora: '', fecha_vencimiento: '', prioridad: CasePriority.MEDIA, tiempo_estimado_minutos: 0 });
    } catch (error: any) {
      console.error('Error al guardar alerta:', error);
      alert(error?.message || 'Error al guardar la tarea/alerta. Por favor, intenta nuevamente.');
    } finally {
      setSubmittingAlerta(false);
    }
  };

  const deleteAlerta = async (id: string) => {
    if (!confirm('¿Eliminar esta tarea/alerta? Esta acción no se puede deshacer.')) return;
    try {
      await api.apiDeleteAlerta(String(id));
      const updatedAlertas = (caseData.alertas || []).filter(a => String(a.id) !== String(id));
      const updatedCase = { ...caseData, alertas: updatedAlertas };
      setCaseData(updatedCase);
      onUpdate(updatedCase);
    } catch (error: any) {
      console.error('Error al eliminar alerta:', error);
      alert(error?.message || 'Error al eliminar la tarea/alerta.');
    }
  };

  const addNote = async () => {
    const contenidoLimpio = (newNote.contenido || '').replace(/<[^>]*>/g, '').trim();
    if (!newNote.titulo.trim()) {
      alert('Por favor, completa el título de la nota');
      return;
    }
    if (!contenidoLimpio) {
      alert('Por favor, escribe el contenido de la nota');
      return;
    }
    if (!caseData.id) {
      alert('Error: No se puede crear la nota. El expediente no tiene ID.');
      return;
    }
    setSubmittingNote(true);
    try {
      if (editingNoteId) {
        const updated = await api.apiUpdateNote(String(editingNoteId), newNote);
        const updatedNotas = (caseData.notas || []).map(n => String(n.id) === String(editingNoteId) ? updated : n);
        const updatedCase = { ...caseData, notas: updatedNotas };
        setCaseData(updatedCase);
        onUpdate(updatedCase);
        setEditingNoteId(null);
      } else {
        const nueva = await api.apiCreateNote(String(caseData.id), newNote);
        const updatedCase = { ...caseData, notas: [nueva, ...(caseData.notas || [])] };
        setCaseData(updatedCase);
        onUpdate(updatedCase);
      }
      setNewNote({ titulo: '', resumen: '', contenido: '', etiqueta: 'Estrategia' });
      // Reset page to 1 on add/edit to ensure visibility or user preference (optional, keeping simple)
      if (!editingNoteId) setNotePage(1);
    } catch (error: any) {
      console.error('Error al guardar nota:', error);
      const errorMessage = error?.message || error?.detail || 'Error al guardar la nota. Por favor, intenta nuevamente.';
      alert(errorMessage);
    } finally {
      setSubmittingNote(false);
    }
  };

  const startEditNote = (note: CaseNote) => {
    setEditingNoteId(String(note.id));
    setNewNote({
      titulo: note.titulo,
      resumen: note.resumen || '',
      contenido: note.contenido,
      etiqueta: note.etiqueta || 'Estrategia'
    });
    // Scroll to top or just let user see the form change
    // If needed: window.scrollTo(0,0) or ref
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setNewNote({ titulo: '', resumen: '', contenido: '', etiqueta: 'Estrategia' });
  };

  // --- CRUD DE ACTUACIONES ---
  const applyTemplate = (template: ActuacionTemplate) => {
    let descripcion = template.descripcion_template;
    // Reemplazar variables en la plantilla
    descripcion = descripcion.replace(/{caratula}/g, caseData.caratula || '');
    descripcion = descripcion.replace(/{cliente}/g, caseData.cliente?.nombre_completo || caseData.cliente_nombre || '');
    descripcion = descripcion.replace(/{nro_expediente}/g, caseData.nro_expediente || '');
    descripcion = descripcion.replace(/{juzgado}/g, caseData.juzgado || '');
    descripcion = descripcion.replace(/{fecha}/g, new Date().toLocaleDateString('es-ES'));

    setNewActuacion({
      ...newActuacion,
      descripcion,
      tipo: template.tipo,
    });
    setSelectedTemplate('');
  };

  const startEditActuacion = (act: CaseActuacion) => {
    setEditingActId(String(act.id));
    setEditActuacionDraft({
      descripcion: act.descripcion || '',
      tipo: act.tipo || 'Escrito',
      fecha: act.fecha || new Date().toISOString().split('T')[0],
    });
  };

  const cancelEditActuacion = () => {
    setEditingActId(null);
    setEditActuacionDraft(null);
  };

  const saveActuacion = async (actId: string) => {
    if (!editActuacionDraft) return;
    setSavingActuacionId(actId);
    try {
      const updated = await api.apiUpdateActuacion(actId, {
        descripcion: editActuacionDraft.descripcion.trim(),
        tipo: editActuacionDraft.tipo,
        fecha: editActuacionDraft.fecha,
      });
      const updatedActuaciones = (caseData.actuaciones || []).map((a) =>
        String(a.id) === String(actId) ? updated : a
      );
      setCaseData({ ...caseData, actuaciones: updatedActuaciones });
      onUpdate({ ...caseData, actuaciones: updatedActuaciones });
      setEditingActId(null);
      setEditActuacionDraft(null);
    } catch (error: any) {
      console.error('Error al actualizar actuación:', error);
      alert(error?.message || 'Error al guardar. Intenta de nuevo.');
    } finally {
      setSavingActuacionId(null);
    }
  };

  const formatFecha = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTiempoEstimado = (minutos: number | undefined | null): string => {
    if (minutos == null || minutos <= 0) return '—';
    const h = Math.floor(minutos / 60);
    return `${h} h`;
  };

  const addActuacion = async () => {
    if (!newActuacion.descripcion.trim()) {
      alert('Por favor, ingresa una descripción para la actuación');
      return;
    }
    if (newActuacion.tipo === 'Otro' && !newActuacion.tipoPersonalizado.trim()) {
      alert('Por favor, especifica el tipo de actuación');
      return;
    }
    if (!caseData.id) {
      alert('Error: No se puede crear la actuación. El expediente no tiene ID.');
      return;
    }
    setSubmittingActuacion(true);
    try {
      const tipo = newActuacion.tipo === 'Otro' ? newActuacion.tipoPersonalizado : newActuacion.tipo;
      const nueva = await api.apiCreateActuacion(String(caseData.id), {
        descripcion: newActuacion.descripcion.trim(),
        tipo: tipo || 'Escrito',
        fecha: newActuacion.fecha || new Date().toISOString().split('T')[0],
      });
      const updatedCase = {
        ...caseData,
        actuaciones: [nueva, ...(caseData.actuaciones || [])]
      };
      setCaseData(updatedCase);
      onUpdate(updatedCase);
      setNewActuacion({ descripcion: '', tipo: 'Escrito', tipoPersonalizado: '', fecha: new Date().toISOString().split('T')[0] });
      setSelectedTemplate('');
      setActuacionPage(1);
    } catch (error: any) {
      console.error('Error al guardar actuación:', error);
      const errorMessage = error?.message || error?.detail || 'Error al guardar la actuación. Por favor, intenta nuevamente.';
      alert(errorMessage);
    } finally {
      setSubmittingActuacion(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-6 z-10">
          <button onClick={onBack} className="p-3 bg-slate-50 text-slate-400 hover:text-orange-500 rounded-2xl transition-all shadow-inner border border-slate-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black bg-orange-600 text-white px-3 py-1 rounded-lg uppercase tracking-widest shadow-lg shadow-orange-200">{caseData.codigo_interno}</span>
              <span className="text-[10px] font-black bg-zinc-900 text-white px-3 py-1 rounded-lg uppercase tracking-widest">{caseData.nro_expediente}</span>
            </div>
            <h2 className="text-3xl font-serif font-bold text-slate-900 mt-2">{caseData.caratula}</h2>
            {caseData.etiquetas && caseData.etiquetas.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {caseData.etiquetas.map(tag => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest"
                    style={{ backgroundColor: tag.color + '20', color: tag.color, border: `1px solid ${tag.color}40` }}
                  >
                    {tag.nombre}
                  </span>
                ))}
              </div>
            )}
            <p className="text-[9px] text-slate-400 uppercase font-black mt-2 tracking-widest border-l-2 border-orange-500 pl-2">
              Auditoría: Creado por @{caseData.created_by_username || caseData.createdBy || 'sistema'} | Modificado por @{caseData.last_modified_by_username || caseData.lastModifiedBy || 'sistema'}
            </p>
          </div>
        </div>
        <div className="flex gap-2 z-10 flex-col items-end">
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setIsExporting(true);
                try {
                  const blob = await api.apiExportCaseTimeline(String(caseData.id));
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Timeline_${caseData.codigo_interno}_${new Date().toISOString().split('T')[0]}.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (e: any) {
                  alert(e.message || 'Error al descargar timeline');
                } finally {
                  setIsExporting(false);
                }
              }}
              disabled={isExporting}
              className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 rounded-xl border border-emerald-100 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <span className="animate-spin rounded-full h-3 w-3 border-2 border-emerald-600 border-t-transparent"></span>
                  Exportando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Exportar Timeline
                </>
              )}
            </button>
            <button onClick={() => setActiveTab('editar')} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-100 transition-all">Editar Carátula</button>
            <button
              onClick={() => {
                if (confirm("¿Estás seguro de eliminar este expediente? Esta acción no se puede deshacer.")) {
                  onDelete(String(caseData.id));
                }
              }}
              className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-50 rounded-xl border border-red-100 transition-all"
            >
              Eliminar
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16"></div>
      </header >

      <nav className="flex gap-2 bg-white p-1.5 rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
        {(['actuaciones', 'alertas', 'notas'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-black text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            {tab === 'notas' ? 'Biblioteca Estratégica' : tab === 'alertas' ? 'Tareas/Alertas' : tab}
          </button>
        ))}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('digital' as any)}
            className={`flex-1 py-4 px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === ('digital' as any) ? 'bg-orange-600 text-white shadow-xl shadow-orange-200' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            Expediente Digital
          </button>
        )}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-4">Detalles del Proceso</h3>

            {/* BOTON EXPEDIENTE DIGITAL PUBLICO */}
            {caseData.folder_link && (
              <a
                href={caseData.folder_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full bg-black hover:bg-zinc-800 text-white p-4 rounded-2xl shadow-lg shadow-slate-200 transition-all group"
              >
                <svg className="w-5 h-5 text-orange-500 group-hover:text-orange-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                <div className="text-left">
                  <p className="text-[9px] font-black uppercase opacity-70 text-zinc-400">Acceso Directo</p>
                  <p className="text-xs font-black uppercase tracking-widest text-white">Abrir Carpeta Digital</p>
                </div>
                <svg className="w-4 h-4 ml-auto opacity-50 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            )}

            {[
              { label: 'Responsable', value: caseData.abogado_responsable },
              { label: 'Juzgado / Sala', value: caseData.juzgado },
              { label: 'Cliente', value: caseData.cliente_nombre },
              { label: 'DNI/RUC', value: caseData.cliente_dni },
              { label: 'Contraparte', value: caseData.contraparte }
            ].map(item => (
              <div key={item.label}>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">{item.label}</p>
                <p className="text-sm font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl">{item.value || 'No consignado'}</p>
              </div>
            ))}
            <div className="pt-4 border-t border-slate-50 space-y-4">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Estado de Tramitación</p>
                <select
                  className="w-full bg-orange-50 text-orange-600 font-black px-4 py-3 rounded-2xl outline-none text-[10px] uppercase tracking-widest border border-orange-100 shadow-sm"
                  value={caseData.estado}
                  onChange={(e) => handleUpdateField('estado', e.target.value)}
                >
                  {Object.values(CaseStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Etiquetas</p>
                <select
                  multiple
                  className="w-full bg-slate-50 px-4 py-3 rounded-2xl outline-none text-[10px] font-bold border border-slate-100 min-h-[100px]"
                  value={caseData.etiquetas?.map(t => String(t.id)) || []}
                  onChange={(e) => {
                    const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
                    const selectedTags = tags.filter(t => selectedIds.includes(String(t.id)));
                    handleUpdateField('etiquetas_ids', selectedTags.map(t => t.id));
                  }}
                >
                  {tags.map(tag => (
                    <option key={tag.id} value={String(tag.id)}>
                      {tag.nombre}
                    </option>
                  ))}
                </select>
                <p className="text-[8px] text-slate-400 mt-1">Mantén Ctrl/Cmd para seleccionar múltiples</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'actuaciones' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <h4 className="text-[11px] font-black text-orange-600 uppercase tracking-widest mb-6">Nuevo Registro de Actuación</h4>
                {templates.length > 0 && (
                  <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 block">Usar Plantilla</label>
                    <div className="flex gap-2">
                      <select
                        className="flex-1 bg-white px-4 py-2 rounded-xl outline-none text-xs font-bold border border-slate-200"
                        value={selectedTemplate}
                        onChange={(e) => {
                          const template = templates.find(t => String(t.id) === e.target.value);
                          if (template) {
                            applyTemplate(template);
                            setSelectedTemplate(e.target.value);
                          }
                        }}
                      >
                        <option value="">Seleccionar plantilla...</option>
                        {templates.map(t => (
                          <option key={t.id} value={String(t.id)}>{t.nombre} ({t.tipo})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <input
                      className="flex-1 bg-slate-50 p-4 rounded-2xl outline-none text-xs font-bold border border-slate-100 focus:border-orange-200 transition-all"
                      placeholder="Resumen de la actuación..."
                      value={newActuacion.descripcion}
                      onChange={(e) => setNewActuacion({ ...newActuacion, descripcion: e.target.value })}
                      required
                    />
                    <select className="bg-slate-50 p-4 rounded-2xl outline-none text-[10px] font-bold border border-slate-100" value={newActuacion.tipo} onChange={(e) => setNewActuacion({ ...newActuacion, tipo: e.target.value })}>
                      <option value="Escrito">Escrito</option>
                      <option value="Audiencia">Audiencia</option>
                      <option value="Notificación">Notificación</option>
                      <option value="Varios">Varios</option>
                      <option value="Otro">Otro Tipo...</option>
                    </select>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    {newActuacion.tipo === 'Otro' && (
                      <input
                        className="flex-1 bg-slate-50 p-4 rounded-2xl outline-none text-[10px] font-bold border border-orange-200"
                        placeholder="Especifique tipo de actuación..."
                        value={newActuacion.tipoPersonalizado}
                        onChange={(e) => setNewActuacion({ ...newActuacion, tipoPersonalizado: e.target.value })}
                        required={newActuacion.tipo === 'Otro'}
                      />
                    )}
                    <input type="date" className="bg-slate-50 p-4 rounded-2xl outline-none text-[10px] font-bold border border-slate-100" value={newActuacion.fecha} onChange={(e) => setNewActuacion({ ...newActuacion, fecha: e.target.value })} />
                    <button
                      onClick={addActuacion}
                      disabled={!newActuacion.descripcion.trim() || (newActuacion.tipo === 'Otro' && !newActuacion.tipoPersonalizado.trim()) || submittingActuacion}
                      className="bg-orange-500 text-white p-4 px-10 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {submittingActuacion ? (
                        <>
                          <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></span>
                          <span>Guardando...</span>
                        </>
                      ) : (
                        'Agregar al Timeline'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Filtro, orden y paginación de actuaciones */}
              {actuacionesRaw.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 flex-wrap items-center justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filtrar por tipo</label>
                    <select
                      className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500"
                      value={actuacionFilterTipo}
                      onChange={(e) => {
                        setActuacionFilterTipo(e.target.value);
                        setActuacionPage(1);
                      }}
                    >
                      <option value="">Todas</option>
                      {['Escrito', 'Audiencia', 'Notificación', 'Varios', 'Otro'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                      {tiposActuacion.filter((t) => !['Escrito', 'Audiencia', 'Notificación', 'Varios', 'Otro'].includes(t)).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Orden</label>
                    <select
                      className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500"
                      value={actuacionOrder}
                      onChange={(e) => {
                        setActuacionOrder(e.target.value as 'desc' | 'asc');
                        setActuacionPage(1);
                      }}
                    >
                      <option value="desc">Más recientes primero</option>
                      <option value="asc">Más antiguas primero</option>
                    </select>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500">
                    {actuacionesTotal} actuación{actuacionesTotal !== 1 ? 'es' : ''}
                    {actuacionesTotalPages > 1 && ` · Página ${actuacionPage} de ${actuacionesTotalPages}`}
                  </p>
                </div>
              )}

              {/* Timeline de Actuaciones */}
              <div className="space-y-4">
                {actuacionesFiltered.length === 0 ? (
                  <div className="bg-white p-12 rounded-[2rem] border border-slate-100 text-center">
                    <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-slate-400 font-bold text-sm">
                      {actuacionesRaw.length === 0 ? 'No hay actuaciones registradas' : 'Ninguna actuación coincide con el filtro'}
                    </p>
                    <p className="text-slate-300 text-xs mt-2">
                      {actuacionesRaw.length === 0 ? 'Agrega la primera actuación del expediente' : 'Cambia el filtro o agrega una nueva'}
                    </p>
                  </div>
                ) : (
                  actuacionesPaginated.map((act, idx) => (
                    <div key={act.id || idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-orange-200 transition-all">
                      {editingActId === String(act.id) && editActuacionDraft ? (
                        <>
                          <div className="space-y-4 mb-4">
                            <textarea
                              className="w-full bg-slate-50 p-4 rounded-2xl outline-none text-sm font-medium border border-slate-100 min-h-[100px] focus:ring-2 focus:ring-orange-500"
                              placeholder="Descripción..."
                              value={editActuacionDraft.descripcion}
                              onChange={(e) => setEditActuacionDraft((d) => d ? { ...d, descripcion: e.target.value } : null)}
                            />
                            <div className="flex flex-wrap gap-3">
                              <select
                                className="bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold border border-slate-100 outline-none focus:ring-2 focus:ring-orange-500"
                                value={editActuacionDraft.tipo}
                                onChange={(e) => setEditActuacionDraft((d) => d ? { ...d, tipo: e.target.value } : null)}
                              >
                                <option value="Escrito">Escrito</option>
                                <option value="Audiencia">Audiencia</option>
                                <option value="Notificación">Notificación</option>
                                <option value="Varios">Varios</option>
                                <option value="Otro">Otro</option>
                              </select>
                              <input
                                type="date"
                                className="bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold border border-slate-100 outline-none focus:ring-2 focus:ring-orange-500"
                                value={editActuacionDraft.fecha}
                                onChange={(e) => setEditActuacionDraft((d) => d ? { ...d, fecha: e.target.value } : null)}
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={cancelEditActuacion}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => saveActuacion(String(act.id))}
                              disabled={savingActuacionId === String(act.id) || !editActuacionDraft.descripcion.trim()}
                              className="px-5 py-2 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {savingActuacionId === String(act.id) ? (
                                <>
                                  <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                                  Guardando...
                                </>
                              ) : (
                                'Guardar'
                              )}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center">
                                <span className="text-orange-600 font-black text-xs">{act.tipo?.substring(0, 2).toUpperCase() || 'AC'}</span>
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{act.tipo || 'Actuación'}</p>
                                <p className="text-[10px] text-slate-400 font-mono font-bold">{act.fecha || 'Sin fecha'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEditActuacion(act)}
                                className="text-slate-400 hover:text-orange-500 font-bold text-xs uppercase tracking-widest px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-all"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('¿Eliminar esta actuación?')) {
                                    api.apiDeleteActuacion(String(act.id)).then(() => {
                                      const updatedActuaciones = (caseData.actuaciones || []).filter(a => String(a.id) !== String(act.id));
                                      const updatedCase = { ...caseData, actuaciones: updatedActuaciones };
                                      setCaseData(updatedCase);
                                      onUpdate(updatedCase);
                                    }).catch(error => {
                                      console.error('Error al eliminar actuación:', error);
                                      alert('Error al eliminar la actuación');
                                    });
                                  }
                                }}
                                className="text-red-300 hover:text-red-500 font-black text-lg"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-50">
                            {act.descripcion}
                          </p>
                          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-right">
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.1em]">
                              Registrado por @{act.created_by_username || act.createdBy || 'sistema'}
                            </p>
                            {act.last_modified_by_username && act.updated_at && (
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.1em]">
                                Modificado por @{act.last_modified_by_username} · {formatFecha(act.updated_at)}
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}

                {actuacionesTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActuacionPage((p) => Math.max(1, p - 1))}
                      disabled={actuacionPage <= 1}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <span className="text-xs font-bold text-slate-500">
                      Página {actuacionPage} de {actuacionesTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActuacionPage((p) => Math.min(actuacionesTotalPages, p + 1))}
                      disabled={actuacionPage >= actuacionesTotalPages}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === ('digital' as any) && isAdmin && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center">
                <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">Vincular Carpeta Digital</h4>
                <p className="text-sm text-slate-400 max-w-md mx-auto mb-8">
                  Conecta este expediente con su carpeta en la nube (Google Drive, Dropbox, OneDrive).
                  El botón de acceso aparecerá automáticamente para todos los usuarios.
                </p>

                <div className="max-w-xl mx-auto space-y-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <input
                      type="url"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium text-slate-700"
                      placeholder="https://drive.google.com/drive/folders/..."
                      value={digitalLinkInput}
                      onChange={(e) => setDigitalLinkInput(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={saveDigitalLink}
                    disabled={isSavingLink}
                    className="w-full bg-black hover:bg-zinc-800 text-white font-bold py-4 rounded-2xl shadow-lg shadow-slate-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSavingLink ? 'Guardando...' : 'Guardar Enlace'}
                  </button>

                  {/* Custom Notification */}
                  {showSuccessMsg && (
                    <div className="animate-fadeIn p-4 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100 flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      Link del expediente actualizado correctamente.
                    </div>
                  )}

                  {caseData.folder_link && (
                    <div className="pt-4 mt-4 border-t border-slate-100">
                      <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-widest">Enlace actual activo</p>
                      <a href={caseData.folder_link} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline text-sm break-all font-medium">
                        {caseData.folder_link}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'alertas' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-6">Programar Vencimiento / Plazo</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      className="bg-slate-50 p-4 rounded-2xl outline-none text-xs font-bold border border-slate-100"
                      placeholder="Título (ej: Plazo Contestación)"
                      value={newAlerta.titulo}
                      onChange={(e) => setNewAlerta({ ...newAlerta, titulo: e.target.value })}
                      required
                    />
                    <input
                      type="date"
                      className="bg-slate-50 p-4 rounded-2xl outline-none text-[10px] font-bold border border-slate-100"
                      value={newAlerta.fecha_vencimiento}
                      onChange={(e) => setNewAlerta({ ...newAlerta, fecha_vencimiento: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                    <input
                      type="time"
                      className="bg-slate-50 p-4 rounded-2xl outline-none text-[10px] font-bold border border-slate-100"
                      value={newAlerta.hora}
                      onChange={(e) => setNewAlerta({ ...newAlerta, hora: e.target.value })}
                      title="Hora opcional"
                    />
                  </div>
                  <textarea
                    className="w-full bg-slate-50 p-4 rounded-2xl outline-none text-[11px] font-bold border border-slate-100 min-h-[80px]"
                    placeholder="Resumen detallado del vencimiento (opcional)..."
                    value={newAlerta.resumen}
                    onChange={(e) => setNewAlerta({ ...newAlerta, resumen: e.target.value })}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tiempo estimado (horas)</span>
                    <input
                      type="number"
                      min={0}
                      max={999}
                      className="w-24 bg-slate-50 p-3 rounded-xl outline-none text-xs font-bold border border-slate-100"
                      placeholder="Ej: 2"
                      value={newAlerta.tiempo_estimado_minutos === 0 ? '' : Math.floor(newAlerta.tiempo_estimado_minutos / 60)}
                      onChange={(e) => {
                        const h = Math.max(0, parseInt(e.target.value, 10) || 0);
                        setNewAlerta({ ...newAlerta, tiempo_estimado_minutos: h * 60 });
                      }}
                      title="Horas"
                    />
                    <span className="text-slate-400 font-bold">h</span>
                  </div>
                  <button
                    type="button"
                    onClick={addAlerta}
                    disabled={!newAlerta.titulo.trim() || !newAlerta.fecha_vencimiento || submittingAlerta}
                    className="w-full bg-black text-white p-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[52px]"
                  >
                    {submittingAlerta ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" aria-hidden />
                        <span>Registrando plazo…</span>
                      </>
                    ) : (
                      'Registrar Plazo'
                    )}
                  </button>
                </div>
              </div>

              {(caseData.alertas || []).length > 0 && (() => {
                const alertas = caseData.alertas || [];
                const totalMin = alertas.reduce((acc, al) => acc + (al.tiempo_estimado_minutos ?? 0), 0);
                const cumplidasMin = alertas.filter((al) => al.cumplida).reduce((acc, al) => acc + (al.tiempo_estimado_minutos ?? 0), 0);
                const pendientesMin = alertas.filter((al) => !al.cumplida).reduce((acc, al) => acc + (al.tiempo_estimado_minutos ?? 0), 0);
                const hayAlgunTiempo = totalMin > 0 || cumplidasMin > 0 || pendientesMin > 0;
                return hayAlgunTiempo ? (
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">Resumen de tiempo estimado</p>
                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total (todas)</span>
                      <span className="text-sm font-black text-orange-600">{formatTiempoEstimado(totalMin)}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cumplido (solo tareas cumplidas)</span>
                      <span className="text-sm font-black text-emerald-600">{formatTiempoEstimado(cumplidasMin)}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pendiente (horas por cumplir)</span>
                      <span className="text-sm font-black text-amber-600">{formatTiempoEstimado(pendientesMin)}</span>
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="space-y-4">
                {(caseData.alertas || []).length === 0 ? (
                  <div className="bg-white p-12 rounded-[2rem] border border-slate-100 text-center">
                    <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-slate-400 font-bold text-sm">No hay tareas/alertas programadas</p>
                    <p className="text-slate-300 text-xs mt-2">Agrega la primera tarea/alerta o plazo</p>
                  </div>
                ) : (
                  (caseData.alertas || []).map(al => (
                    <div key={al.id} className={`p-6 rounded-[2rem] border transition-all relative group ${al.cumplida ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${al.cumplida ? 'bg-zinc-200 text-zinc-500' : 'bg-orange-100 text-orange-600'}`}>
                          {al.cumplida ? 'Cumplido' : 'Pendiente'}
                        </span>
                        <div className="flex gap-4 items-center">
                          <span className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-tighter">
                            {al.fecha_vencimiento} {al.hora ? `| ${al.hora}` : ''}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAlerta(String(al.id));
                            }}
                            className="text-red-300 hover:text-red-500 font-black transition-all"
                            title="Eliminar tarea/alerta"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <p className={`text-base font-bold ${al.cumplida ? 'line-through text-slate-400' : 'text-slate-900 uppercase'}`}>{al.titulo}</p>
                      {al.resumen && <p className="text-sm text-slate-500 mt-2 font-medium bg-slate-50 p-4 rounded-2xl border border-slate-50 italic whitespace-pre-wrap">{al.resumen}</p>}
                      {al.tiempo_estimado_minutos != null && al.tiempo_estimado_minutos > 0 && (
                        <p className="mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Tiempo est.: {formatTiempoEstimado(al.tiempo_estimado_minutos)}
                        </p>
                      )}
                      <div className="mt-4 flex justify-between items-center text-[9px] font-black uppercase text-slate-300">
                        <span>Programado por @{al.created_by_username || al.createdBy || 'sistema'}</span>
                        {al.cumplida && <span>✓ {al.completed_by_username || al.completedBy || 'sistema'}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'notas' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <h4 className="text-[11px] font-black text-orange-600 uppercase tracking-widest mb-6">Biblioteca Estratégica: Registro de Evento</h4>
                <div className="space-y-4">
                  {editingNoteId && (
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-4 flex justify-between items-center">
                      <span className="text-xs font-bold text-orange-700">MODO EDICIÓN: Editando nota existente</span>
                      <button onClick={cancelEditNote} className="text-xs font-black uppercase text-orange-400 hover:text-orange-600">Cancelar Edición</button>
                    </div>
                  )}
                  <div className="flex gap-4">
                    <input
                      className="flex-1 bg-slate-50 p-4 rounded-2xl outline-none text-sm font-bold border border-slate-100 focus:ring-2 focus:ring-orange-500 transition-all"
                      placeholder="Título del Evento (ej: Resultado Entrevista)"
                      value={newNote.titulo}
                      onChange={(e) => setNewNote({ ...newNote, titulo: e.target.value })}
                      required
                    />
                    <select className="bg-slate-50 p-4 rounded-2xl outline-none text-[10px] font-black border border-slate-100 uppercase focus:ring-2 focus:ring-orange-500" value={newNote.etiqueta} onChange={(e) => setNewNote({ ...newNote, etiqueta: e.target.value })}>
                      <option value="Estrategia">Estrategia</option>
                      <option value="Documentación">Documentación</option>
                      <option value="Investigación">Investigación</option>
                      <option value="Jurisprudencia">Jurisprudencia</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Resumen / Descripción breve</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 p-4 rounded-2xl outline-none text-sm font-medium border border-slate-100 focus:ring-2 focus:ring-orange-500 transition-all"
                      placeholder="Resumen opcional en una línea..."
                      value={newNote.resumen || ''}
                      onChange={(e) => setNewNote({ ...newNote, resumen: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Contenido detallado (negrita, color, subrayado…)</label>
                    <MiniRichEditor
                      value={newNote.contenido}
                      onChange={(html) => setNewNote((prev) => ({ ...prev, contenido: html }))}
                      placeholder="Escriba el análisis detallado aquí..."
                      minHeight="180px"
                    />
                  </div>
                  <button
                    onClick={addNote}
                    disabled={!newNote.titulo.trim() || !(newNote.contenido || '').replace(/<[^>]*>/g, '').trim() || submittingNote}
                    className="w-full bg-black text-white p-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submittingNote ? (
                      <>
                        <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></span>
                        <span>{editingNoteId ? 'Guardando...' : 'Guardando en Biblioteca...'}</span>
                      </>
                    ) : (
                      editingNoteId ? 'Guardar Cambios' : 'Guardar en Biblioteca'
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {(notesRaw || []).length === 0 ? (
                  <div className="bg-white p-12 rounded-[2rem] border border-slate-100 text-center">
                    <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-slate-400 font-bold text-sm">No hay notas registradas</p>
                    <p className="text-slate-300 text-xs mt-2">Agrega la primera nota estratégica</p>
                  </div>
                ) : (
                  notesPaginated.map(note => (
                    <div key={note.id} className={`bg-white p-8 rounded-[2rem] border shadow-sm transition-all group relative ${editingNoteId === String(note.id) ? 'border-orange-400 ring-2 ring-orange-100' : 'border-slate-100 hover:border-orange-200'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-lg uppercase w-fit mb-2 tracking-widest">{note.etiqueta}</span>
                          <h6 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{note.titulo}</h6>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg uppercase tracking-widest">
                            {new Date(note.fecha_creacion || note.created_at || Date.now()).toLocaleDateString()}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEditNote(note)}
                              className="text-slate-400 hover:text-orange-500 font-bold text-xs uppercase tracking-widest px-2 py-1.5 rounded-lg hover:bg-orange-50 transition-all"
                            >
                              EDITAR
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('¿Eliminar esta nota?')) {
                                  api.apiDeleteNote(String(note.id)).then(() => {
                                    const updatedNotas = (caseData.notas || []).filter(n => String(n.id) !== String(note.id));
                                    const updatedCase = { ...caseData, notas: updatedNotas };
                                    setCaseData(updatedCase);
                                    onUpdate(updatedCase);
                                  }).catch(error => {
                                    console.error('Error al eliminar nota:', error);
                                    alert('Error al eliminar la nota');
                                  });
                                }
                              }}
                              className="text-red-300 hover:text-red-500 font-secondary text-2xl leading-none px-2"
                              title="Eliminar nota"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </div>
                      {note.resumen && (
                        <p className="text-sm text-slate-600 font-medium mb-3 pb-3 border-b border-slate-100">{note.resumen}</p>
                      )}
                      <div className="text-sm text-slate-700 leading-relaxed font-medium bg-slate-50/30 p-6 rounded-[1.5rem] border border-slate-50/50">
                        {typeof note.contenido === 'string' && /<[a-z][\s\S]*>/i.test(note.contenido) ? (
                          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0" dangerouslySetInnerHTML={{ __html: note.contenido }} />
                        ) : (
                          <span className="whitespace-pre-wrap">{note.contenido ?? ''}</span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-300 font-black uppercase mt-6 text-right tracking-[0.1em]">Escrito por @{note.created_by_username || note.createdBy || 'sistema'}</p>
                    </div>
                  ))
                )}
                {/* Pagination Controls for Notes */}
                {notesTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setNotePage((p) => Math.max(1, p - 1))}
                      disabled={notePage <= 1}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <span className="text-xs font-bold text-slate-500">
                      Página {notePage} de {notesTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotePage((p) => Math.min(notesTotalPages, p + 1))}
                      disabled={notePage >= notesTotalPages}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'editar' && (
            <div className="bg-white p-10 rounded-[2rem] border border-slate-100 shadow-2xl">
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-8 border-b pb-4">Detalles del Proceso — Editar y guardar</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carátula</label>
                  <input className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold border border-slate-100" value={caseData.caratula || ''} onChange={(e) => handleUpdateField('caratula', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nro. Expediente</label>
                  <input className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-mono border border-slate-100" value={caseData.nro_expediente || ''} onChange={(e) => handleUpdateField('nro_expediente', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Juzgado / Sala</label>
                  <input className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100" value={caseData.juzgado || ''} onChange={(e) => handleUpdateField('juzgado', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contraparte</label>
                  <input className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100" value={caseData.contraparte || ''} onChange={(e) => handleUpdateField('contraparte', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Abogado responsable
                    {!isAdmin && <span className="text-[8px] text-slate-300 ml-2">(Solo Admin)</span>}
                  </label>
                  <select
                    className={`w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                    value={caseData.abogado_responsable || ''}
                    onChange={(e) => {
                      if (isAdmin) handleUpdateField('abogado_responsable', e.target.value);
                    }}
                    disabled={!isAdmin}
                  >
                    <option value="">Sin asignar</option>
                    {abogados.map((u) => (
                      <option key={String(u.id)} value={u.username}>{u.username}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente (nombre completo)</label>
                  <input className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100" value={caseData.cliente_nombre || ''} onChange={(e) => handleUpdateField('cliente_nombre', e.target.value)} placeholder="Nombre del cliente" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DNI / RUC Cliente</label>
                  <input className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-mono border border-slate-100" value={caseData.cliente_dni || ''} onChange={(e) => handleUpdateField('cliente_dni', e.target.value)} placeholder="DNI o RUC" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fuero / Jurisdicción</label>
                  <input className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100" value={caseData.fuero || ''} onChange={(e) => handleUpdateField('fuero', e.target.value)} placeholder="Ej: Civil, Comercial..." />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado de tramitación</label>
                  <select className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold" value={caseData.estado || ''} onChange={(e) => handleUpdateField('estado', e.target.value)}>
                    {Object.values(CaseStatus).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="mt-6 text-[10px] text-slate-400 font-bold">Los cambios se guardan al editar cada campo. El panel izquierdo refleja los datos actualizados.</p>
              <button type="button" onClick={() => setActiveTab('actuaciones')} className="mt-6 bg-black text-white px-12 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl hover:bg-zinc-800 transition-all">Volver a Actuaciones</button>
            </div>
          )}
        </div>
      </div>
    </div >
  );
};

export default CaseDetail;
