
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

export type UserRole = 'admin' | 'abogado' | 'usuario';

export interface User {
  id: string | number;
  username: string;
  password?: string;
  isAdmin?: boolean;
  is_admin?: boolean; // Compatibilidad con backend
  rol?: UserRole;
  rol_display?: string;
}

export interface CaseNote {
  id: string;
  caso_id?: string;
  caso?: string;
  titulo: string;
  contenido: string;
  etiqueta: string;
  fecha_creacion?: string;
  created_at?: string;
  createdBy?: string;
  created_by?: string;
  created_by_username?: string;
}

export interface CaseActuacion {
  id: string;
  caso_id?: string;
  caso?: string;
  fecha: string;
  descripcion: string;
  tipo: string;
  createdBy?: string;
  created_by?: string;
  created_by_username?: string;
  created_at?: string;
}

export interface CaseAlerta {
  id: string;
  caso_id?: string;
  caso?: string;
  titulo: string;
  resumen: string;
  hora?: string | null;
  fecha_vencimiento: string;
  cumplida: boolean;
  prioridad: CasePriority;
  createdBy?: string;
  created_by?: string;
  created_by_username?: string;
  completedBy?: string;
  completed_by?: string;
  completed_by_username?: string;
  completed_at?: string | null;
  created_at?: string;
}

export interface Cliente {
  id: string | number;
  nombre_completo: string;
  dni_ruc: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  notas?: string;
  total_expedientes?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CaseTag {
  id: string | number;
  nombre: string;
  color: string;
  descripcion?: string;
  created_at?: string;
}

export interface ActuacionTemplate {
  id: string | number;
  nombre: string;
  tipo: string;
  descripcion_template: string;
  created_by?: string;
  created_by_username?: string;
  created_at?: string;
  updated_at?: string;
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
  cliente?: Cliente;
  cliente_id?: string | number;
  cliente_nombre: string;
  cliente_nombre_display?: string;
  cliente_dni: string;
  contraparte: string;
  fecha_inicio: string;
  updatedAt?: string;
  updated_at?: string;
  createdBy?: string;
  created_by?: string;
  created_by_username?: string;
  lastModifiedBy?: string;
  last_modified_by?: string;
  last_modified_by_username?: string;
  created_at?: string;
  actuaciones?: CaseActuacion[];
  alertas?: CaseAlerta[];
  notas?: CaseNote[];
  etiquetas?: CaseTag[];
  etiquetas_ids?: (string | number)[];
}

export interface DashboardStats {
  stats: {
    total_cases: number;
    open_cases: number;
    in_progress_cases: number;
    paused_cases: number;
    closed_cases: number;
  };
  stats_by_fuero: Record<string, number>;
  stats_by_abogado: Record<string, number>;
  cases_by_month: Array<{ mes: string; total: number }>;
  recent_cases: LawCase[];
  alertas: CaseAlerta[];
}

export type ViewState = 'dashboard' | 'cases' | 'new-case' | 'case-detail' | 'users' | 'calendar' | 'clientes';
