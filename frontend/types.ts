
export enum CaseStatus {
  OPEN = 'Abierto',
  IN_PROGRESS = 'En Trámite',
  PAUSED = 'Pausado',
  CLOSED = 'Cerrado'
}

export enum CasePriority {
  ALTA = 'Alta',
  MEDIA = 'Media',
  BAJA = 'Baja'
}

export interface User {
  id: string;
  username: string;
  password?: string;
  isAdmin: boolean;
}

export interface CaseNote {
  id: string;
  caso_id: string;
  titulo: string;
  contenido: string;
  etiqueta: string;
  fecha_creacion: string;
  createdBy: string; // ID del usuario
}

export interface CaseActuacion {
  id: string;
  caso_id: string;
  fecha: string;
  descripcion: string;
  tipo: string;
  createdBy: string; // ID del usuario
}

export interface CaseAlerta {
  id: string;
  caso_id: string;
  titulo: string;
  resumen: string;
  hora: string;
  fecha_vencimiento: string;
  cumplida: boolean;
  prioridad: CasePriority;
  createdBy: string;
  completedBy?: string; // Nuevo: Usuario que marcó como cumplida
}

export interface LawCase {
  id: string;
  codigo_interno: string;
  caratula: string;
  nro_expediente: string;
  juzgado: string;
  fuero: string;
  estado: CaseStatus;
  abogado_responsable: string;
  cliente_nombre: string;
  cliente_dni: string;
  contraparte: string;
  fecha_inicio: string;
  updatedAt: string;
  createdBy: string;      // Usuario que creó el caso
  lastModifiedBy: string; // Último usuario que modificó
  actuaciones: CaseActuacion[];
  alertas: CaseAlerta[];
  notas: CaseNote[];
}

export type ViewState = 'dashboard' | 'cases' | 'new-case' | 'case-detail' | 'users';
