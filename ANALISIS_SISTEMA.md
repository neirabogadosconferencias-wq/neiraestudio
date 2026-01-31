# 📋 Análisis Completo del Sistema - Estudio Neira Trujillo

## 🎯 Propósito del Sistema

**Sistema de Gestión Jurídica para el Estudio Neira Trujillo Abogados SRL** - Sede Juliaca

Este es un sistema integral diseñado específicamente para la gestión y seguimiento de expedientes legales en un estudio jurídico. Permite a los abogados y personal del estudio llevar un control completo de todos los casos, actuaciones, plazos y notas estratégicas.

---

## 🏢 Contexto del Negocio

- **Cliente**: Estudio Neira Trujillo Abogados SRL
- **Ubicación**: Sede Juliaca, Perú
- **Versión**: 5.0
- **Tipo**: Sistema de gestión jurídica profesional
- **Propósito**: Digitalizar y optimizar la gestión de expedientes legales

---

## 🏗️ Arquitectura del Sistema

### **Stack Tecnológico**

#### **Frontend**
- **Framework**: React 18+ con TypeScript
- **Build Tool**: Vite
- **Estilos**: Tailwind CSS
- **Estado**: React Hooks (useState, useEffect)
- **HTTP Client**: Fetch API nativo
- **Autenticación**: JWT (JSON Web Tokens)

#### **Backend**
- **Framework**: Django 5.0
- **API**: Django REST Framework (DRF)
- **Autenticación**: Simple JWT (djangorestframework-simplejwt)
- **Base de Datos**: SQLite (desarrollo) / PostgreSQL (producción configurable)
- **CORS**: django-cors-headers
- **Configuración**: python-decouple para variables de entorno

---

## 📊 Modelos de Datos y Entidades

### **1. User (Usuario)**
Sistema de usuarios con roles diferenciados:
- **Campos**:
  - `username`: Nombre de usuario único
  - `password`: Contraseña (hasheada)
  - `is_admin`: Boolean que determina si es administrador
  - `is_staff`: Automáticamente igual a `is_admin`
- **Roles**:
  - **Administrador**: Puede gestionar usuarios, crear/editar/eliminar expedientes
  - **Usuario Regular**: Puede ver y editar expedientes, pero no gestionar usuarios
- **Auditoría**: Todos los cambios quedan registrados con el usuario que los realizó

### **2. LawCase (Expediente Legal)**
Entidad principal del sistema. Representa un caso legal completo.

**Campos Principales**:
- `codigo_interno`: Generado automáticamente con formato `ENT-XXXX-YYYY-JLCA`
  - Ejemplo: `ENT-0001-2024-JLCA` (Estudio Neira Trujillo, número secuencial, año, Juliaca)
- `caratula`: Nombre completo del caso (ej: "Pérez c/ López s/ Daños y Perjuicios")
- `nro_expediente`: Número oficial del expediente judicial
- `juzgado`: Juzgado o sala donde se tramita
- `fuero`: Tipo de fuero (Civil, Comercial, Penal, Laboral, Familia)
- `estado`: Estado procesal del expediente
  - **Abierto**: Caso recién iniciado
  - **En Trámite**: Activamente en proceso
  - **Pausado**: Temporalmente detenido
  - **Cerrado**: Finalizado

**Información de Partes**:
- `cliente_nombre`: Nombre completo del cliente
- `cliente_dni`: DNI o RUC del cliente
- `contraparte`: Nombre de la parte contraria
- `abogado_responsable`: Abogado asignado al caso

**Auditoría**:
- `created_by`: Usuario que creó el expediente
- `last_modified_by`: Último usuario que modificó
- `created_at`: Fecha de creación
- `updated_at`: Fecha de última modificación

**Relaciones**:
- Tiene múltiples `actuaciones` (eventos del proceso)
- Tiene múltiples `alertas` (plazos y vencimientos)
- Tiene múltiples `notas` (información estratégica)

### **3. CaseActuacion (Actuación Procesal)**
Registra cada evento o movimiento dentro del expediente.

**Campos**:
- `caso`: Relación con LawCase
- `fecha`: Fecha de la actuación
- `descripcion`: Detalle completo de lo ocurrido
- `tipo`: Tipo de actuación
  - Escrito
  - Audiencia
  - Notificación
  - Varios
  - Otro (personalizable)
- `created_by`: Usuario que registró la actuación
- `created_at`: Fecha de registro

**Propósito**: Mantener un timeline completo de todos los eventos del expediente, permitiendo trazabilidad completa.

### **4. CaseAlerta (Alerta/Plazo)**
Sistema de gestión de plazos y vencimientos críticos.

**Campos**:
- `caso`: Relación con LawCase
- `titulo`: Nombre del plazo (ej: "Plazo para Contestación")
- `resumen`: Descripción detallada del plazo
- `fecha_vencimiento`: Fecha límite
- `hora`: Hora específica (opcional)
- `prioridad`: Alta, Media, Baja
- `cumplida`: Boolean que indica si se cumplió
- `completed_by`: Usuario que marcó como cumplida
- `completed_at`: Fecha y hora de cumplimiento
- `created_by`: Usuario que creó la alerta

**Funcionalidad Especial**:
- Sistema de cálculo de urgencia automático:
  - **Vencido**: Pasó la fecha
  - **Hoy**: Vence en menos de 24 horas
  - **Urgente**: Vence en menos de 72 horas
  - **Pendiente**: Más de 72 horas
- Toggle para marcar como cumplida/reabrir
- Tracking de quién completó la acción

### **5. CaseNote (Nota Estratégica)**
Biblioteca de información estratégica y análisis del caso.

**Campos**:
- `caso`: Relación con LawCase
- `titulo`: Título de la nota
- `contenido`: Análisis o información detallada
- `etiqueta`: Categoría de la nota
  - **Estrategia**: Planes y estrategias legales
  - **Documentación**: Información sobre documentos
  - **Investigación**: Hallazgos de investigación
  - **Jurisprudencia**: Referencias legales y precedentes
- `created_by`: Usuario que creó la nota
- `created_at`: Fecha de creación

**Propósito**: Centralizar información estratégica, análisis, jurisprudencia relevante y documentación importante del caso.

---

## 🎨 Interfaz de Usuario y Flujos

### **1. Pantalla de Login**
- Autenticación con username y password
- Retorna JWT tokens (access y refresh)
- Guarda usuario en localStorage
- Redirige al Dashboard

### **2. Dashboard (Pantalla Principal)**
Vista central del sistema con dos paneles:

**Panel Izquierdo - Control de Plazos**:
- Lista todas las alertas de todos los expedientes
- Ordenadas por urgencia (vencidas primero, luego por fecha)
- Muestra estado visual (Vencido, Hoy, Urgente, Pendiente)
- Botón para marcar como cumplida/reabrir
- Click en alerta abre el expediente correspondiente
- Muestra quién completó cada alerta

**Panel Derecho - Trazabilidad de Expedientes**:
- Tabla con los últimos 5 expedientes modificados
- Muestra código interno, carátula, usuario que modificó, fecha/hora
- Click en fila abre el detalle del expediente
- Botón "Ver Ficha" para acceso directo

**Header**:
- Logo del estudio (NT)
- Nombre completo del estudio
- Botón "Nuevo Expediente"

### **3. Lista de Expedientes**
- Tabla completa con todos los expedientes
- **Búsqueda**: Por código interno, expediente, cliente o carátula
- **Filtro**: Por estado (Abierto, En Trámite, Pausado, Cerrado)
- **Ordenamiento**: Por estado (En Trámite/Abierto primero, luego Pausado, luego Cerrado)
- **Exportación**: Botón para exportar a CSV
- **Visualización**: Expedientes cerrados aparecen en escala de grises
- Click en "Abrir Ficha" abre el detalle

### **4. Formulario de Nuevo Expediente**
Campos requeridos:
- Carátula (obligatorio)
- Número de Expediente (obligatorio)

Campos opcionales:
- Abogado Responsable
- Cliente (nombre completo)
- DNI/RUC Cliente
- Fuero (dropdown: Civil, Comercial, Penal, Laboral, Familia)
- Estado Inicial (dropdown)
- Juzgado
- Contraparte

Al crear, se genera automáticamente el código interno.

### **5. Detalle de Expediente (Ficha Completa)**
Vista más compleja con múltiples pestañas:

**Header**:
- Código interno y número de expediente (badges)
- Carátula completa
- Información de auditoría (creado por, modificado por)
- Botones: Editar Carátula, Eliminar

**Panel Lateral Izquierdo**:
- Detalles del proceso (solo lectura)
- Información de partes
- Selector de estado (editable)

**Panel Principal - Pestañas**:

**a) Actuaciones (Timeline)**:
- Formulario para agregar nueva actuación
  - Descripción (obligatorio)
  - Tipo (dropdown + opción "Otro" personalizable)
  - Fecha
- Timeline visual con todas las actuaciones
- Cada actuación muestra: tipo, fecha, descripción, usuario que la registró
- Botón para eliminar actuación

**b) Alertas**:
- Formulario para crear nueva alerta
  - Título (obligatorio)
  - Fecha de vencimiento (obligatorio, mínimo hoy)
  - Hora (opcional)
  - Resumen (opcional)
- Lista de alertas con:
  - Estado (Pendiente/Cumplido)
  - Fecha y hora de vencimiento
  - Botón para eliminar
  - Si está cumplida, muestra quién la completó

**c) Notas (Biblioteca Estratégica)**:
- Formulario para nueva nota
  - Título (obligatorio)
  - Etiqueta (dropdown: Estrategia, Documentación, Investigación, Jurisprudencia)
  - Contenido (obligatorio, textarea grande)
- Grid con todas las notas
- Cada nota muestra: etiqueta, título, contenido completo, fecha, usuario creador
- Botón para eliminar nota

### **6. Gestión de Usuarios** (Solo Administradores)
- Formulario para crear nuevo usuario
  - Username (único)
  - Password (mínimo 4 caracteres)
  - Checkbox "Es Administrador"
- Tabla con todos los usuarios
- Botón para eliminar (no se puede eliminar el admin principal con ID=1)
- Solo visible para usuarios con `is_admin=True`

---

## 🔐 Sistema de Autenticación y Seguridad

### **Autenticación JWT**
- **Login**: `POST /api/auth/login/` retorna:
  - `access`: Token de acceso (corto plazo)
  - `refresh`: Token de refresco (largo plazo)
  - `user`: Datos del usuario
- **Refresh**: `POST /api/auth/refresh/` para renovar el access token
- **Validación**: Todas las peticiones (excepto login) requieren header:
  ```
  Authorization: Bearer {access_token}
  ```

### **Permisos**
- **Público**: Solo login
- **Autenticado**: Ver y editar expedientes, actuaciones, alertas, notas
- **Administrador**: Todo lo anterior + gestión de usuarios

### **Auditoría**
- Todos los cambios registran:
  - `created_by`: Usuario que creó
  - `last_modified_by`: Usuario que modificó
  - Timestamps automáticos

---

## 📡 API REST - Endpoints

### **Autenticación**
- `POST /api/auth/login/` - Login
- `GET /api/auth/me/` - Usuario actual
- `POST /api/auth/refresh/` - Refrescar token

### **Dashboard**
- `GET /api/dashboard/` - Estadísticas y datos del dashboard

### **Expedientes**
- `GET /api/cases/` - Listar (con filtros: `?search=`, `?estado=`)
- `POST /api/cases/` - Crear
- `GET /api/cases/{id}/` - Detalle
- `PATCH /api/cases/{id}/` - Actualizar parcial
- `DELETE /api/cases/{id}/` - Eliminar
- `POST /api/cases/{id}/add_actuacion/` - Agregar actuación
- `POST /api/cases/{id}/add_alerta/` - Agregar alerta
- `POST /api/cases/{id}/add_note/` - Agregar nota

### **Actuaciones**
- `GET /api/actuaciones/` - Listar (`?caso={id}` para filtrar)
- `POST /api/actuaciones/` - Crear
- `PATCH /api/actuaciones/{id}/` - Actualizar
- `DELETE /api/actuaciones/{id}/` - Eliminar

### **Alertas**
- `GET /api/alertas/` - Listar (`?caso={id}`, `?cumplida=true/false`)
- `POST /api/alertas/` - Crear
- `PATCH /api/alertas/{id}/` - Actualizar
- `POST /api/alertas/{id}/toggle_cumplida/` - Toggle cumplida
- `DELETE /api/alertas/{id}/` - Eliminar

### **Notas**
- `GET /api/notas/` - Listar (`?caso={id}`)
- `POST /api/notas/` - Crear
- `PATCH /api/notas/{id}/` - Actualizar
- `DELETE /api/notas/{id}/` - Eliminar

### **Usuarios** (Solo Admin)
- `GET /api/users/` - Listar
- `POST /api/users/` - Crear
- `DELETE /api/users/{id}/` - Eliminar

---

## 🎯 Casos de Uso Principales

### **1. Apertura de Nuevo Expediente**
1. Usuario hace click en "Nuevo Expediente"
2. Completa formulario (mínimo carátula y número)
3. Sistema genera código interno automáticamente
4. Expediente se crea con estado "Abierto"
5. Usuario es registrado como `created_by` y `last_modified_by`

### **2. Registro de Actuación**
1. Usuario abre expediente
2. Va a pestaña "Actuaciones"
3. Completa descripción, tipo y fecha
4. Sistema registra actuación con timestamp y usuario
5. Aparece en timeline del expediente

### **3. Programación de Plazo**
1. Usuario abre expediente
2. Va a pestaña "Alertas"
3. Ingresa título, fecha de vencimiento, hora (opcional), resumen
4. Alerta aparece en Dashboard (panel de plazos)
5. Sistema calcula urgencia automáticamente
6. Cuando se cumple, usuario marca como cumplida
7. Sistema registra quién y cuándo se completó

### **4. Registro de Nota Estratégica**
1. Usuario abre expediente
2. Va a pestaña "Notas"
3. Completa título, etiqueta y contenido
4. Nota se guarda en "Biblioteca Estratégica" del expediente
5. Útil para análisis, jurisprudencia, estrategias

### **5. Seguimiento de Plazos (Dashboard)**
1. Usuario entra al Dashboard
2. Ve panel izquierdo con todas las alertas
3. Alertas ordenadas por urgencia
4. Click en alerta abre expediente correspondiente
5. Puede marcar como cumplida directamente desde Dashboard

### **6. Búsqueda y Filtrado**
1. Usuario va a "Expedientes"
2. Puede buscar por código, expediente, cliente o carátula
3. Puede filtrar por estado
4. Resultados ordenados por prioridad de estado
5. Click en expediente abre ficha completa

### **7. Exportación de Datos**
1. Usuario va a "Expedientes"
2. Click en "Exportar para Folder"
3. Sistema genera CSV con todos los expedientes
4. Archivo descargable con nombre timestamp

### **8. Gestión de Usuarios (Admin)**
1. Administrador accede a "Usuarios"
2. Puede crear nuevos usuarios con rol
3. Puede eliminar usuarios (excepto admin principal)
4. Lista muestra todos los usuarios y sus roles

---

## 🔄 Flujos de Datos

### **Creación de Expediente**
```
Usuario → Frontend (Form) → API POST /cases/ → Backend
Backend genera código interno → Guarda en BD → Retorna expediente completo
Frontend actualiza lista → Redirige a lista de casos
```

### **Actualización de Estado**
```
Usuario cambia estado en detalle → API PATCH /cases/{id}/ → Backend
Backend actualiza → Registra last_modified_by → Retorna actualizado
Frontend actualiza vista local → Sincroniza con servidor
```

### **Gestión de Alertas**
```
Usuario crea alerta → API POST /cases/{id}/add_alerta/ → Backend
Backend guarda → Retorna alerta
Frontend actualiza caso → Dashboard se actualiza automáticamente
```

---

## 🎨 Diseño y UX

### **Estilo Visual**
- **Colores principales**: Negro, Naranja (#FF6B35), Blanco, Grises
- **Tipografía**: Serif para títulos (elegante), Sans-serif para contenido
- **Estilo**: Minimalista, profesional, moderno
- **Responsive**: Funciona en desktop y móvil

### **Componentes Reutilizables**
- Toast notifications para feedback
- Loading states en operaciones asíncronas
- Confirmaciones antes de eliminar
- Validaciones en tiempo real
- Estados vacíos informativos

---

## 📈 Características Destacadas

1. **Código Interno Automático**: Formato `ENT-XXXX-YYYY-JLCA` único por expediente
2. **Sistema de Urgencia Inteligente**: Calcula automáticamente urgencia de plazos
3. **Auditoría Completa**: Todo cambio queda registrado con usuario y timestamp
4. **Timeline de Actuaciones**: Historial completo y ordenado de eventos
5. **Biblioteca Estratégica**: Organización de información por categorías
6. **Exportación CSV**: Para integración con otros sistemas
7. **Búsqueda Avanzada**: Múltiples criterios de búsqueda
8. **Roles y Permisos**: Sistema de administradores y usuarios
9. **JWT Refresh**: Tokens se renuevan automáticamente
10. **Validaciones Robustas**: Frontend y backend validan datos

---

## 🚀 Estado Actual del Sistema

### **Funcionalidades Completadas**
✅ Autenticación JWT completa
✅ CRUD completo de expedientes
✅ CRUD completo de actuaciones
✅ CRUD completo de alertas
✅ CRUD completo de notas
✅ Gestión de usuarios (admin)
✅ Dashboard con alertas y casos recientes
✅ Búsqueda y filtrado
✅ Exportación CSV
✅ Sistema de auditoría
✅ Validaciones frontend y backend
✅ Manejo de errores robusto
✅ Toast notifications
✅ Estados de carga
✅ Confirmaciones de eliminación

### **Mejoras Recientes Implementadas**
✅ Timeline completo de actuaciones
✅ Estados vacíos informativos
✅ Validaciones mejoradas en formularios
✅ Botones deshabilitados cuando faltan datos
✅ Mejor manejo de errores
✅ Limpieza de console.logs
✅ Mejoras en UX/UI

---

## 📝 Notas Técnicas

- **Base de Datos**: SQLite por defecto, configurable a PostgreSQL vía `.env`
- **CORS**: Configurado para `localhost:3000` y `localhost:5173`
- **Tokens JWT**: Access token (corto), Refresh token (largo)
- **Migraciones**: Django maneja automáticamente el esquema de BD
- **Variables de Entorno**: Backend usa `.env` para configuración sensible

---

## 🎓 Conclusión

Este es un **sistema profesional completo** para la gestión de expedientes legales, diseñado específicamente para las necesidades del Estudio Neira Trujillo Abogados. Combina una interfaz moderna y fácil de usar con un backend robusto y escalable, proporcionando todas las herramientas necesarias para llevar un control exhaustivo de casos legales, plazos, actuaciones y documentación estratégica.

El sistema está **listo para producción** con todas las funcionalidades core implementadas y probadas.
