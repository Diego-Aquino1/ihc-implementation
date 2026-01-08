# Plan de Implementación: Persistencia y Visualización de Sesiones LIVE

## Objetivos
1. Guardar métricas finales de todas las sesiones LIVE
2. Crear vista de lista de entrevistas en el menú LIVE
3. Implementar vista de detalle con resultados completos
4. Agregar botón "Finalizar" que muestre pantalla de resultados
5. Pantalla de resultados creativa y completa

---

## 1. Backend: Modelos y Persistencia

### 1.1 Modelo de Sesión LIVE (`LiveSession`)
**Archivo**: `backend/models/live_metrics.py` (agregar o crear nuevo)

```python
class LiveSession(SQLModel, table=True):
    """Sesión completa de entrevista LIVE"""
    __tablename__ = "live_sessions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(foreign_key="users.id", index=True)
    session_number: int  # Número de sesión (1, 2, 3...)
    
    # Estado y duración
    status: str = Field(default="completed")  # completed, abandoned, paused
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: int = 0  # Duración total en segundos
    paused_seconds: int = 0  # Tiempo total en pausa
    
    # Progreso
    current_stage: str = Field(default="introduction")
    stages_completed: int = 0  # Cuántas etapas completó
    total_stages: int = 5
    
    # Conversación
    total_questions_asked: int = 0
    total_user_responses: int = 0
    conversation_summary: Optional[str] = None  # Resumen de la conversación
    
    # Tiempos por etapa
    introduction_duration: int = 0
    experience_duration: int = 0
    behavioral_duration: int = 0
    stress_duration: int = 0
    closing_duration: int = 0
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

### 1.2 Actualizar Modelo de Métricas Finales
**Archivo**: `backend/models/live_metrics.py`

Agregar relación con `LiveSession`:
```python
class LiveMetrics(SQLModel, table=True):
    # ... campos existentes ...
    live_session_id: Optional[int] = Field(foreign_key="live_sessions.id", index=True)
    # Mantener session_id para compatibilidad temporal
```

### 1.3 Servicio de Persistencia
**Archivo**: `backend/services/live_session_persistence.py` (nuevo)

Funciones:
- `create_live_session(session_id: int, user_id: int) -> LiveSession`
- `update_session_progress(session_id: int, stage: str, duration: int)`
- `finalize_session(session_id: int, status: str, metrics: Dict) -> LiveSession`
- `save_conversation_summary(session_id: int, summary: str)`
- `get_user_live_sessions(user_id: int) -> List[LiveSession]`
- `get_live_session(session_id: int) -> LiveSession`
- `get_session_metrics(session_id: int) -> Dict`

### 1.4 Endpoints API REST
**Archivo**: `backend/routers/live.py` (agregar endpoints HTTP)

```python
@router.get("/sessions")
async def get_user_sessions(user_id: int, db: Session = Depends(get_db))

@router.get("/sessions/{session_id}")
async def get_session_detail(session_id: int, db: Session = Depends(get_db))

@router.get("/sessions/{session_id}/metrics")
async def get_session_metrics(session_id: int, db: Session = Depends(get_db))

@router.post("/sessions/{session_id}/finalize")
async def finalize_session(session_id: int, db: Session = Depends(get_db))
```

### 1.5 Modificar WebSocket Handler
**Archivo**: `backend/routers/live.py`

- Al crear sesión: `create_live_session()`
- Al cambiar etapa: Actualizar `current_stage` y `stages_completed`
- Al pausar: Incrementar `paused_seconds`
- Al recibir `session_end`: Llamar `finalize_session()`
- Guardar métricas finales con `save_final_metrics()`

---

## 2. Frontend: Vista de Lista de Entrevistas

### 2.1 Nueva Página: Lista de Entrevistas LIVE
**Archivo**: `frontend/pages/LiveInterviewList.tsx` (nuevo)

**Componentes**:
- Tabla/cards con lista de sesiones
- Columnas: # Sesión, Fecha, Duración, Etapas Completadas, Score General, Estado
- Orden: Más reciente primero
- Filtros: Por fecha, score, estado
- Paginación si hay muchas sesiones

**UI**:
```
┌─────────────────────────────────────────────────────┐
│  Entrevistas LIVE                    [+ Nueva]      │
├─────────────────────────────────────────────────────┤
│  #  Fecha       Duración  Etapas  Score    Estado   │
│  3  15/01/2025  5:23      5/5     85/100  ✓         │
│  2  14/01/2025  4:12      4/5     72/100  ✓         │
│  1  13/01/2025  3:45      3/5     -       Abandonada│
└─────────────────────────────────────────────────────┘
```

### 2.2 Actualizar Layout/Router
**Archivo**: `frontend/components/Layout.tsx`

- Cambiar ruta del menú "LIVE" de `/live/1` a `/live/list`
- El menú "LIVE" muestra la lista de entrevistas
- Botón "Nueva Práctica" en la lista redirige a `/live/{next_id}`

---

## 3. Frontend: Vista de Detalle de Resultados

### 3.1 Nueva Página: Detalle de Sesión
**Archivo**: `frontend/pages/LiveInterviewDetail.tsx` (nuevo)

**Secciones**:
1. **Header**: # Sesión, Fecha/Hora, Duración total, Estado
2. **Resumen General**: Score general, Etapas completadas, Progreso
3. **Métricas de Audio**: 
   - WPM promedio, Pausas, Muletillas, Volumen, Claridad
   - Gráficos/visualizaciones
4. **Métricas Visuales**:
   - Contacto visual %, Postura, Sonrisas
   - Timeline de eventos visuales
5. **Progreso por Etapa**:
   - Barras de progreso mostrando tiempo en cada etapa
   - Qué etapa completó o en cuál se quedó
6. **Historial de Eventos** (opcional):
   - Timeline de transcripciones y eventos importantes
7. **Botones de Acción**:
   - "Nueva Práctica LIVE" (incrementa contador)
   - "Volver a Lista"

### 3.2 Componentes Reutilizables
**Archivos**: 
- `frontend/components/LiveMetricsCard.tsx`
- `frontend/components/StageProgressChart.tsx`
- `frontend/components/ScoreDisplay.tsx`

---

## 4. Frontend: Botón Finalizar y Pantalla de Resultados

### 4.1 Agregar Botón Finalizar
**Archivo**: `frontend/pages/LiveInterviewPage.tsx`

**Ubicación**: Top right, al lado de Pausar
**Funcionalidad**:
- Envía mensaje `session_end` al backend con estadísticas finales
- El backend guarda todo y retorna las métricas finales
- Redirige a `/live/{session_id}/results` (pantalla de resultados)
- Limpia recursos (cámara, audio, websocket)

### 4.2 Nueva Página: Pantalla de Resultados
**Archivo**: `frontend/pages/LiveInterviewResults.tsx` (nuevo)

**Diseño Creativo**:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│           🎉 ¡Entrevista Completada! 🎉                 │
│                                                         │
│            Tu Puntuación General                        │
│              ┌──────────┐                               │
│              │   85/100 │                               │
│              │  ⭐⭐⭐⭐☆  │                               │
│              └──────────┘                               │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  📊 Resumen                                      │  │
│  │                                                  │  │
│  │  ✅ Completaste 5/5 etapas                       │  │
│  │  ⏱️  Duración: 5 minutos 23 segundos             │  │
│  │  💬 Respondiste 8 preguntas                      │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ 🎤 Audio    │  │ 👁️  Visual  │  │ 📈 Progreso │   │
│  │             │  │             │  │             │   │
│  │ WPM: 145    │  │ Contacto:   │  │ Intro: ✓    │   │
│  │ Claridad: 8 │  │ 78%         │  │ Exp: ✓      │   │
│  │             │  │ Postura: 9  │  │ Comport: ✓  │   │
│  └─────────────┘  └─────────────┘  │ Estrés: ✓   │   │
│                                     │ Cierre: ✓   │   │
│                                     └─────────────┘   │
│                                                         │
│  💡 Destacados:                                         │
│  • Excelente contacto visual                           │
│  • Buen ritmo de habla                                 │
│  • Podrías reducir muletillas                          │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                 │
│  │ Ver Detalles │    │ Nueva Práctica│                │
│  └──────────────┘    └──────────────┘                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Características**:
- Animación de score (contador ascendente)
- Badges de logros alcanzados
- Sugerencias de mejora personalizadas
- Comparación con sesión anterior (si existe)
- Gráficos visuales de métricas
- Botones de acción destacados

---

## 5. Servicios Frontend

### 5.1 Servicio API para LIVE
**Archivo**: `frontend/services/liveApi.ts` (nuevo)

```typescript
export const liveApi = {
  getSessions: (userId: number) => Promise<LiveSession[]>
  getSession: (sessionId: number) => Promise<LiveSession>
  getSessionMetrics: (sessionId: number) => Promise<LiveMetrics>
  finalizeSession: (sessionId: number, stats: any) => Promise<LiveSession>
}
```

### 5.2 Actualizar WebSocket Client
**Archivo**: `frontend/services/wsLive.ts`

- Agregar handler para `session_finalized` que reciba métricas finales
- Manejar redirección a pantalla de resultados

---

## 6. Migraciones de Base de Datos

### 6.1 Script de Migración
**Archivo**: `backend/migrations/add_live_sessions_table.py` (nuevo)

```python
# Crear tabla live_sessions
# Agregar foreign key live_session_id a live_metrics
# Migrar datos existentes si hay
```

### 6.2 Actualizar Database
**Archivo**: `backend/database.py`

- Incluir `LiveSession` en create_tables()
- Relaciones correctas entre tablas

---

## 7. Flujo Completo de Usuario

### 7.1 Iniciar Nueva Entrevista
1. Usuario hace clic en "LIVE Interview" (Dashboard o Lista)
2. Navega a `/live/{session_id}` donde `session_id` es incremental
3. Backend crea `LiveSession` en DB
4. WebSocket conecta y comienza entrevista

### 7.2 Durante la Entrevista
- Backend actualiza progreso en tiempo real
- Guarda eventos de análisis
- Actualiza tiempos por etapa

### 7.3 Finalizar Entrevista
1. Usuario hace clic en "Finalizar"
2. Frontend envía `session_end` con stats finales
3. Backend:
   - Calcula métricas finales (promedios, scores)
   - Guarda `LiveMetrics`
   - Finaliza `LiveSession` (status="completed", ended_at, duration)
   - Retorna datos completos
4. Frontend redirige a `/live/{session_id}/results`
5. Muestra pantalla de resultados animada

### 7.4 Ver Historial
1. Usuario hace clic en "LIVE" en sidebar
2. Ve lista de todas sus entrevistas
3. Hace clic en una sesión
4. Ve detalle completo con todas las métricas
5. Puede iniciar nueva práctica desde ahí

---

## 8. Mejoras Adicionales (Futuro)

- Comparación entre sesiones (gráfico de evolución)
- Exportar reporte PDF
- Compartir resultados
- Filtros avanzados (por score, etapa, fecha)
- Estadísticas globales (promedios del usuario)
- Badges y logros desbloqueables

---

## 9. Archivos a Crear/Modificar

### Nuevos:
- `backend/models/live_session.py`
- `backend/services/live_session_persistence.py`
- `backend/migrations/add_live_sessions_table.py`
- `frontend/pages/LiveInterviewList.tsx`
- `frontend/pages/LiveInterviewDetail.tsx`
- `frontend/pages/LiveInterviewResults.tsx`
- `frontend/services/liveApi.ts`
- `frontend/components/LiveMetricsCard.tsx`
- `frontend/components/StageProgressChart.tsx`

### Modificar:
- `backend/models/live_metrics.py` (agregar relación)
- `backend/routers/live.py` (agregar endpoints HTTP + persistencia)
- `backend/services/live_session.py` (integrar persistencia)
- `backend/database.py` (incluir LiveSession)
- `frontend/pages/LiveInterviewPage.tsx` (botón finalizar)
- `frontend/components/Layout.tsx` (rutas)
- `frontend/services/wsLive.ts` (handler finalización)
- `frontend/pages/Dashboard.tsx` (ya tiene botón LIVE)

---

## 10. Prioridades de Implementación

**Fase 1 (Esencial)**:
1. Modelo LiveSession y persistencia básica
2. Botón Finalizar que guarde métricas finales
3. Pantalla de resultados básica

**Fase 2 (Completa)**:
4. Vista de lista de entrevistas
5. Vista de detalle
6. Endpoints API REST

**Fase 3 (Mejoras)**:
7. Animaciones y UX mejorada
8. Gráficos y visualizaciones
9. Comparaciones y estadísticas

---

## Notas Técnicas

- Usar el mismo `session_id` del WebSocket como ID de `LiveSession`
- Mantener compatibilidad con sesiones que no tienen `LiveSession` guardado
- Manejar casos de sesiones abandonadas (sin finalizar)
- Considerar límite de tiempo para sesiones muy largas
- Validar datos antes de guardar
- Manejar errores de persistencia sin romper la experiencia

