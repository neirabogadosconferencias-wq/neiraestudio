# Plan: Notitas/Recordatorios (Dashboard) y Calendario (Alertas + Modal Detalle)

> **Objetivo:** Plan detallado y mantenible para implementar:
> 1. Sección de notitas/recordatorios en el Dashboard
> 2. **Mostrar tareas/alertas y actuaciones en el Calendario** (fuente de datos correcta)
> 3. Modal de detalle al hacer clic en un evento del Calendario
>
> **Código:** óptimo, reutilizable, sin duplicar lógica.

---

## Resumen de alcance

| Feature | Backend | Frontend |
|---------|---------|----------|
| Notitas/Recordatorios | Nuevo modelo `UserStickyNote` + ViewSet | Nueva sección en Dashboard + CRUD |
| **Alertas en Calendario** | **Endpoint `/api/calendar/events/`** (Fase 5 plan principal) | **Calendar carga eventos vía API** |
| Modal detalle evento | Sin cambios | Modal reutilizable `EventDetailModal` |

---

## Parte 1: Notitas/Recordatorios en Dashboard

### 1.1 Diferenciación con modelos existentes

| Modelo | Alcance | Propósito |
|--------|---------|-----------|
| **Aviso** | Global (un solo activo, admin solo) | Anuncios del estudio |
| **CaseNote** | Por expediente | Biblioteca estratégica |
| **CaseAlerta** | Por expediente | Plazos/tareas con fecha de vencimiento |
| **UserStickyNote** *(nuevo)* | Por usuario | Notitas rápidas y recordatorios personales, sin expediente |

### 1.2 Modelo Backend: `UserStickyNote`

**Ubicación:** `backend/api/models.py`

```python
class UserStickyNote(models.Model):
    """Notitas/recordatorios personales del usuario (no vinculados a expediente)."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sticky_notes')
    titulo = models.CharField(max_length=200, verbose_name='Título')
    contenido = models.TextField(blank=True, verbose_name='Contenido')
    # Opcional: fecha recordatorio (si no hay fecha, es solo notita)
    fecha_recordatorio = models.DateField(null=True, blank=True, verbose_name='Recordar el')
    completada = models.BooleanField(default=False)
    orden = models.PositiveIntegerField(default=0)  # Para ordenar manualmente
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['orden', '-fecha_recordatorio', '-created_at']
        indexes = [models.Index(fields=['user']), models.Index(fields=['user', 'completada'])]
```

**Campos:**
- `user`: FK a User — cada usuario ve solo sus notas
- `titulo`: texto breve (ej. "Llamar a cliente X")
- `contenido`: texto opcional más largo
- `fecha_recordatorio`: opcional; si se setea, puede mostrarse como “recordatorio”
- `completada`: marcar como hecho
- `orden`: para arrastrar/ordenar (futuro)

### 1.3 Serializer y ViewSet

**Serializer:** `UserStickyNoteSerializer` en `serializers.py`
- Campos: `id`, `titulo`, `contenido`, `fecha_recordatorio`, `completada`, `orden`, `created_at`, `updated_at`
- Read-only: `user`, `user_username` (opcional)

**ViewSet:** `UserStickyNoteViewSet`
- `get_queryset`: `UserStickyNote.objects.filter(user=request.user)`
- `perform_create`: `serializer.save(user=request.user)`
- Sin `perform_update` especial: el usuario solo edita sus propias notas
- CRUD estándar: list, create, retrieve, update, destroy
- Permisos: `IsAuthenticated`

**URL:** `router.register(r'sticky-notes', UserStickyNoteViewSet, basename='sticky-note')`

### 1.4 Dashboard: endpoint de notitas

**Opción A (recomendada):** Endpoint separado `/api/sticky-notes/` — el frontend las pide aparte.
- Ventaja: carga independiente, no añade peso al dashboard principal.
- El Dashboard hace: `apiGetDashboard()` + `apiGetStickyNotes()` en paralelo.

**Opción B:** Incluir `sticky_notes` en `DashboardStats` (en `DashboardView`).
- Ventaja: una sola llamada.
- Desventaja: payload más grande y menos modular.

**Recomendación:** Opción A para mantener responsabilidades separadas.

### 1.5 Frontend: tipos y API

**`types.ts`:**
```ts
export interface UserStickyNote {
  id: string;
  titulo: string;
  contenido?: string;
  fecha_recordatorio?: string | null;
  completada: boolean;
  orden: number;
  created_at?: string;
  updated_at?: string;
}
```

**`apiService.ts`:**
```ts
apiGetStickyNotes(): Promise<UserStickyNote[]>
apiCreateStickyNote(data: Omit<UserStickyNote, 'id' | 'created_at' | 'updated_at'>): Promise<UserStickyNote>
apiUpdateStickyNote(id: string, data: Partial<UserStickyNote>): Promise<UserStickyNote>
apiDeleteStickyNote(id: string): Promise<void>
apiToggleStickyNote(id: string): Promise<UserStickyNote>  // toggle completada
```

### 1.6 Frontend: componente `DashboardStickyNotes`

**Ubicación:** `frontend/components/DashboardStickyNotes.tsx`

**Responsabilidades:**
- Lista de notitas con checkbox para marcar completada
- Botón "Nueva notita" abre mini-formulario (titulo + opcional contenido + fecha recordatorio)
- Editar inline o en pequeño modal
- Eliminar con confirmación
- Ordenar por `fecha_recordatorio` (próximas primero) y luego por `created_at`
- Estilo consistente con "Control de Plazos" (cards redondeadas, colores sutiles)

**Props:**
```ts
interface DashboardStickyNotesProps {
  onRefresh?: () => void;  // callback opcional tras crear/editar/eliminar
}
```

### 1.7 Integración en Dashboard

En `Dashboard.tsx`:
- Añadir columna o fila con `<DashboardStickyNotes />` (por ejemplo, junto a "Control de Plazos" o debajo).
- Layout sugerido: grid `lg:grid-cols-3` — col1: Control de Plazos, col2+3: Trazabilidad. La sección Notitas puede ser un panel pequeño arriba de Control de Plazos o una cuarta columna en desktop.
- Alternativa más simple: nueva fila debajo de estadísticas, con panel "Mis Notitas / Recordatorios" a la izquierda o centrado.

---

## Parte 2: Mostrar tareas/alertas en el Calendario

### 2.0 Problema actual: las alertas no se muestran

El `Calendar` recibe `cases` desde `App`, que carga datos con `apiGetCases` (listado de expedientes). Ese listado usa `LawCaseListSerializer`, que **no incluye** `actuaciones` ni `alertas`. El código del Calendar hace:

```ts
const allAlerts = casesArray.flatMap(c => (c.alertas || []))  // siempre []
```

Por eso la grilla muestra 0 alertas y 0 actuaciones. Los datos no llegan.

### 2.1 Solución: endpoint dedicado de eventos (Fase 5 del plan principal)

En lugar de depender de `cases`, el Calendario debe obtener sus datos de:

```
GET /api/calendar/events/?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
```

**Respuesta esperada (ejemplo):**
```json
{
  "eventos": [
    {
      "kind": "alerta",
      "id": "123",
      "titulo": "Presentar escrito",
      "fecha_vencimiento": "2025-03-15",
      "hora": "10:00:00",
      "resumen": "...",
      "prioridad": "Alta",
      "cumplida": false,
      "caso_id": 1,
      "caratula": "González c/ Municipalidad",
      "codigo_interno": "EXP-2024-001",
      "case": { "id": 1, "codigo_interno": "...", "caratula": "..." }
    },
    {
      "kind": "actuacion",
      "id": "456",
      "fecha": "2025-03-10",
      "descripcion": "Escrito presentado",
      "tipo": "Escrito",
      "caso_id": 1,
      "caratula": "...",
      "codigo_interno": "...",
      "case": { ... }
    }
  ]
}
```

**Backend (CalendarEventsView):**
- Consultar `CaseAlerta` y `CaseActuacion` de casos accesibles al usuario (`user_has_access_to_case`)
- Filtrar por rango `desde`–`hasta` (`fecha_vencimiento` para alertas, `fecha` para actuaciones)
- Unificar en lista ordenada por fecha
- Serializer unificado o dos serializers con campo `kind`

**Frontend:**
- `apiGetCalendarEvents(desde: string, hasta: string): Promise<CalendarEvent[]>`
- Calendar calcula `desde`/`hasta` del mes visible (o mes ±1 para transiciones) y llama a la API al montar o al cambiar mes
- Los eventos devueltos se usan para:
  - Puntos de colores en la grilla por día
  - Lista en el panel del día seleccionado
  - Apertura del modal de detalle al hacer clic

### 2.2 Flujo completo del Calendario

```
Usuario abre Calendario
    → Calendar obtiene primer/último día del mes visible
    → apiGetCalendarEvents(desde, hasta)
    → Backend devuelve alertas + actuaciones de casos accesibles
    → Calendar renderiza:
        1. Grilla: puntos por día según eventos
        2. Panel día seleccionado: lista de eventos
        3. Clic en evento → EventDetailModal
    → Modal: "Ir al expediente" / "Marcar cumplida"
```

### 2.3 Cambio en Calendar respecto a hoy

| Actual | Después |
|--------|---------|
| `cases` como fuente | `calendarEvents` desde `apiGetCalendarEvents` |
| `allAlerts` y `allActuaciones` derivados de `cases.alertas/actuaciones` (vacíos) | Eventos ya formateados por la API |
| Props: `cases`, `onSelectCase`, `onViewChange` | Props: `onSelectCase`, `onViewChange`; el Calendar carga sus propios eventos internamente |
| O quizás mantener `cases` como fallback si no hay endpoint aún | Prioridad: implementar endpoint primero; Calendar deja de usar `cases` para eventos |

**Recomendación:** Calendar deja de recibir `cases` para sus eventos. Carga datos con `apiGetCalendarEvents`.

**Alternativas descartadas:**
- Incluir `alertas`/`actuaciones` en `LawCaseListSerializer`: el listado es paginado (15 casos) y devuelve solo la primera página; no cubriría el rango completo del mes ni sería eficiente (payload muy grande).
- Usar `apiGetCase` por cada caso: N+1 requests; inviable.

### 2.4 Prioridad respecto al plan principal

La **Fase 5** de `PLAN_IMPLEMENTACION.md` (Endpoint de eventos de calendario) es **prerrequisito** para que las alertas se vean correctamente en el Calendario. El orden lógico es:

1. Implementar `GET /api/calendar/events/?desde=&hasta=`
2. Añadir `apiGetCalendarEvents` en frontend
3. Modificar Calendar para consumir ese endpoint
4. Añadir `EventDetailModal` y conectar clics

---

## Parte 3: Modal de detalle de evento en Calendario

### 3.1 Comportamiento actual

- Clic en día → `setSelectedDate` → se muestra panel inferior con eventos del día.
- Clic en alerta/actuación → `onSelectCase(caseObj)` → navega al expediente.
- No hay vista intermedia con detalles del evento (resumen, prioridad, etc.).

### 3.2 Objetivo

Al hacer **clic en un evento** (alerta o actuación):
1. Abrir un modal/drawer con los detalles del evento.
2. Mostrar: título, descripción/resumen, fecha, hora, expediente, prioridad (si aplica).
3. Acciones: "Ir al expediente" y, para alertas, "Marcar cumplida".

### 3.3 Tipos unificados para eventos de calendario

Para que el modal sea reutilizable, definir un tipo común:

**`types.ts`:**
```ts
export type CalendarEventKind = 'alerta' | 'actuacion';

export interface CalendarEventBase {
  kind: CalendarEventKind;
  id: string;
  titulo: string;
  fecha: string;
  hora?: string | null;
  caratula?: string;
  codigo_interno?: string;
  caseObj?: LawCase | { id: string };
}

export interface CalendarEventAlerta extends CalendarEventBase {
  kind: 'alerta';
  resumen?: string;
  prioridad?: string;
  cumplida?: boolean;
  fecha_vencimiento: string;
}

export interface CalendarEventActuacion extends CalendarEventBase {
  kind: 'actuacion';
  descripcion?: string;
  tipo?: string;
}

export type CalendarEvent = CalendarEventAlerta | CalendarEventActuacion;
```

### 3.4 Componente `EventDetailModal`

**Ubicación:** `frontend/components/EventDetailModal.tsx`

**Props:**
```ts
interface EventDetailModalProps {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
  onSelectCase: (lawCase: LawCase) => void;
  onToggleAlerta?: (alertaId: string) => Promise<void>;
}
```

**Contenido del modal:**
- Header: icono según `kind` (alerta/actuación) + título
- Body:
  - Fecha y hora
  - Expediente: carátula + código (como enlace/clickeable)
  - Descripción/resumen según tipo
  - Para alertas: prioridad, estado (cumplida/pendiente), botón "Marcar cumplida"
- Footer:
  - "Ir al expediente" (primary)
  - "Cerrar" (secondary)
- Overlay clickeable para cerrar

**Consideraciones:**
- Usar estado local para loading en "Marcar cumplida"
- Evitar propagación de clics en el modal para no cerrar al hacer clic dentro
- Accesibilidad: focus trap, tecla Escape para cerrar
- Diseño: reutilizar clases del resto de la app (border, rounded, colores)

### 3.5 Integración en Calendar

En `Calendar.tsx`:

1. Estado:
   ```ts
   const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
   const [eventModalOpen, setEventModalOpen] = useState(false);
   ```

2. Al hacer clic en evento (en el panel del día seleccionado o en la grilla):
   - En lugar de llamar directo a `onSelectCase`, llamar:
     ```ts
     setSelectedEvent(event);
     setEventModalOpen(true);
     ```

3. Renderizar:
   ```tsx
   <EventDetailModal
     event={selectedEvent}
     open={eventModalOpen}
     onClose={() => { setEventModalOpen(false); setSelectedEvent(null); }}
     onSelectCase={(c) => { setEventModalOpen(false); onSelectCase(c); }}
     onToggleAlerta={async (id) => { await api.apiToggleAlerta(id); /* refresh o update local */ }}
   />
   ```

4. Tras "Marcar cumplida": actualizar estado local del evento (optimistic) o recargar datos del calendario si se consume desde API futura.

### 3.6 Puntos de clic que abren el modal

- Cada card de alerta/actuación en el panel del día seleccionado (ya existe el `onClick`).
- Los puntos de colores en la grilla del mes: al hacer clic en un punto podría abrir el modal del primer evento de ese día, o un popover con lista corta que al elegir uno abra el modal. Para mantener simplicidad inicial: solo el panel inferior tiene clics que abren el modal; los puntos siguen seleccionando el día.

---

## Parte 4: Orden de implementación sugerido

### Fase A: Endpoint y datos del Calendario (prerrequisito)

1. Backend: `CalendarEventsView` — GET `/api/calendar/events/?desde=&hasta=`
2. Serializers para eventos unificados (alertas + actuaciones)
3. Filtrar por permisos (`user_has_access_to_case`) y rango de fechas
4. Frontend: `apiGetCalendarEvents(desde, hasta)`
5. Calendar: cargar eventos con `apiGetCalendarEvents` en lugar de `cases`

### Fase B: Modal de detalle

1. Crear `CalendarEvent` types en `types.ts`.
2. Crear `EventDetailModal.tsx` con props y layout.
3. Los eventos ya vienen de `apiGetCalendarEvents` en formato `CalendarEvent`; solo asegurar mapeo correcto (`caseObj` para navegación).
4. Conectar clics en eventos (grilla y panel) → abrir modal.
5. `onToggleAlerta` usando `apiToggleAlerta` existente; actualizar estado local del evento (optimistic) o recargar eventos.
6. Probar con alertas y actuaciones.

### Fase C: Notitas (nuevo modelo y UI)

1. Modelo `UserStickyNote` + migración.
2. Serializer + ViewSet + URL.
3. Tipos y funciones de API en frontend.
4. Componente `DashboardStickyNotes`.
5. Integrar en Dashboard.
6. Pruebas de CRUD y permisos (usuario solo ve sus notas).

---

## Parte 5: Código óptimo y mantenible

### Principios

1. **Un componente, una responsabilidad:** `EventDetailModal` solo muestra detalles y acciones; `DashboardStickyNotes` solo gestiona notitas.
2. **Tipos compartidos:** `CalendarEvent` evita `any` y facilita extender con `UserCalendarEvent` (Fase 6–7 del plan principal).
3. **API consistente:** CRUD de notitas sigue el patrón de alertas/notas (mismos nombres, misma estructura de errores).
4. **Sin duplicar lógica:** `calculateUrgency` / `getUrgencyColor` se reutilizan; el modal recibe el evento ya enriquecido.
5. **Estilos:** usar clases existentes (`rounded-2xl`, `border-slate-200`, `bg-orange-500`) para coherencia visual.
6. **Permisos:** notitas filtradas por `user` en backend; no exponer datos de otros usuarios.

### Estructura de archivos resultante

```
frontend/
  components/
    Dashboard.tsx              # Integra DashboardStickyNotes
    DashboardStickyNotes.tsx   # NUEVO
    Calendar.tsx               # Usa EventDetailModal
    EventDetailModal.tsx       # NUEVO

backend/
  api/
    models.py                  # + UserStickyNote
    serializers.py             # + UserStickyNoteSerializer
    views.py                   # + UserStickyNoteViewSet
    urls.py                    # + r'sticky-notes'
  api/migrations/
    XXXX_userstickynote.py     # NUEVO
```

---

## Parte 6: Dependencias con el plan principal

| Plan principal (PLAN_IMPLEMENTACION.md) | Este plan |
|----------------------------------------|-----------|
| Fase 5: Endpoint `/api/calendar/events/` | EventDetailModal funcionará igual con eventos provenientes de ese endpoint |
| Fase 6–7: UserCalendarEvent | `CalendarEvent` puede extenderse con `kind: 'personal'` y el modal mostrar un layout distinto para eventos personales |
| Fase 1–4: Permisos y multi-abogado | No afectan notitas (por usuario). Eventos de calendario ya respetan permisos de casos |

---

*Documento de planificación. No modifica código existente.*
