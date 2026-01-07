# Plan de Implementación: Feature LIVE - Entrevista en Tiempo Real

**Versión:** 1.0  
**Fecha:** 2025-01-07  
**Objetivo:** Implementar sistema de entrevista en tiempo real con chat de voz que integre las 4 etapas con análisis continuo de video y audio del usuario.

---

## 1. Visión General del Feature

### 1.1 Descripción

El feature **LIVE** es una modalidad de entrevista donde el usuario mantiene una conversación de voz en tiempo real con un entrevistador virtual. A diferencia de la simulación por etapas actual, LIVE integra las 4 etapas en una conversación fluida y continua.

### 1.2 Características Principales

- ✅ **Chat de voz bidireccional en tiempo real** (usuario ↔ entrevistador)
- ✅ **Análisis continuo de video y audio** del usuario mientras habla
- ✅ **Transición automática entre etapas** basada en progreso
- ✅ **Barra de progreso visual** mostrando etapa actual
- ✅ **Video/audio del entrevistador** contextual según etapa
- ✅ **Feedback visual en tiempo real** durante la conversación

### 1.3 Diferencias con Simulación Actual

| Aspecto | Simulación Actual | LIVE Feature |
|---------|-------------------|--------------|
| **Interacción** | Por etapas separadas | Conversación continua |
| **Análisis** | Post-respuesta | Tiempo real continuo |
| **Transiciones** | Manuales entre etapas | Automáticas basadas en progreso |
| **Feedback** | Al final de cada etapa | Continuo durante la conversación |
| **Duración** | 15-20 min (4 etapas) | 10-15 min (fluido) |

---

## 2. Arquitectura Técnica Propuesta

### 2.1 Componentes Principales

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                     │
├─────────────────────────────────────────────────────────┤
│  • LiveInterviewPage (nuevo componente)                │
│  • AudioRecorder (streaming continuo)                  │
│  • VideoAnalyzer (análisis frame por frame)            │
│  • ProgressBar (indicador de etapa)                    │
│  • InterviewerVideo (video/audio contextual)            │
│  • RealTimeFeedback (HUD con métricas)                 │
└─────────────────────────────────────────────────────────┘
                          ↕ WebSocket / WebRTC
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                     │
├─────────────────────────────────────────────────────────┤
│  • WebSocket Handler (conversación bidireccional)      │
│  • Stage Manager (transición entre etapas)             │
│  • Audio Processor (STT streaming)                      │
│  • Video Analyzer Service (análisis continuo)          │
│  • LLM Engine (generación de preguntas/respuestas)     │
│  • TTS Service (síntesis de voz del entrevistador)     │
└─────────────────────────────────────────────────────────┘
                          ↕ API Calls
┌─────────────────────────────────────────────────────────┐
│              SERVICIOS EXTERNOS                          │
├─────────────────────────────────────────────────────────┤
│  • Gemini Live API (conversación en tiempo real)        │
│  • Gemini 3 Flash (análisis visual continuo)           │
│  • OpenAI TTS (voz del entrevistador)                   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Flujo de Datos

```
Usuario habla
  ↓
[Frontend] Captura audio → Stream a Backend (WebSocket)
  ↓
[Backend] Recibe audio → Envía a Gemini Live API
  ↓
[Gemini Live] Procesa → Genera respuesta del entrevistador
  ↓
[Backend] Recibe respuesta → TTS → Audio al Frontend
  ↓
[Frontend] Reproduce audio del entrevistador

Paralelamente:
Usuario en cámara
  ↓
[Frontend] Captura frames (cada 600ms) → Canvas
  ↓
[Backend] Recibe frame → Gemini 3 Flash → Análisis visual
  ↓
[Backend] Procesa análisis → Feedback al Frontend
  ↓
[Frontend] Actualiza HUD con métricas
```

---

## 3. Etapas de Implementación

### FASE 1: Infraestructura Base (Semana 1-2)
**Objetivo:** Establecer la base técnica para comunicación en tiempo real

#### 1.1 Backend: WebSocket Handler
**Tareas:**
- [ ] Crear router WebSocket en FastAPI (`/ws/live/{session_id}`)
- [ ] Implementar manejo de conexiones WebSocket
- [ ] Sistema de mensajes bidireccionales (audio chunks, análisis, control)
- [ ] Gestión de estado de sesión LIVE

**Archivos a crear/modificar:**
- `backend/routers/live.py` (nuevo)
- `backend/services/live_session.py` (nuevo)
- `backend/main.py` (agregar router)

**Dependencias:**
- `fastapi-websocket` o `python-socketio`
- `websockets` library

#### 1.2 Frontend: Componente Base LIVE
**Tareas:**
- [ ] Crear `pages/LiveInterviewPage.tsx`
- [ ] Implementar conexión WebSocket
- [ ] Layout básico (video usuario, video entrevistador, barra progreso)
- [ ] Manejo de estados de conexión

**Archivos a crear/modificar:**
- `frontend/pages/LiveInterviewPage.tsx` (nuevo)
- `frontend/services/wsLive.ts` (nuevo)
- `frontend/App.tsx` (agregar ruta)

**Dependencias:**
- WebSocket API nativa o `socket.io-client`

#### 1.3 Barra de Progreso de Etapas
**Tareas:**
- [ ] Componente `ProgressBar.tsx` con 4 etapas
- [ ] Indicador visual de etapa actual
- [ ] Transiciones suaves entre etapas
- [ ] Integración con estado de sesión

**Archivos a crear:**
- `frontend/components/ProgressBar.tsx` (nuevo)

**Etapas a mostrar:**
1. **Introducción** (0-25%)
2. **Experiencia** (25-50%)
3. **Comportamiento** (50-75%)
4. **Cierre** (75-100%)

---

### FASE 2: Chat de Voz en Tiempo Real (Semana 2-3)
**Objetivo:** Implementar conversación bidireccional de voz

#### 2.1 Integración con Gemini Live API
**Tareas:**
- [ ] Investigar y configurar Gemini Live API
- [ ] Implementar cliente para streaming de audio
- [ ] Manejo de respuestas en tiempo real
- [ ] Gestión de turnos de conversación

**Archivos a crear/modificar:**
- `backend/services/gemini_live_client.py` (nuevo)
- `backend/services/live_session.py` (modificar)

**Decisiones necesarias:**
- [ ] ¿Usar Gemini Live API o simular con OpenAI Whisper + LLM?
- [ ] ¿Streaming continuo o por chunks?
- [ ] ¿Latencia aceptable? (objetivo: <500ms)

#### 2.2 Captura y Streaming de Audio
**Tareas:**
- [ ] Modificar `AudioRecorder.tsx` para streaming continuo
- [ ] Envío de chunks de audio por WebSocket
- [ ] Buffer management para evitar lag
- [ ] Manejo de silencios y pausas

**Archivos a modificar:**
- `frontend/components/AudioRecorder.tsx`
- `frontend/services/wsLive.ts`

**Consideraciones técnicas:**
- Formato de audio: WebM, Opus, o PCM
- Tamaño de chunks: 1-2 segundos
- Compresión: Opus codec (mejor calidad/tamaño)

#### 2.3 Reproducción de Audio del Entrevistador
**Tareas:**
- [ ] Recibir audio del backend (TTS o Gemini Live)
- [ ] Reproducir audio en tiempo real
- [ ] Sincronización con video del entrevistador
- [ ] Manejo de interrupciones y solapamientos

**Archivos a crear/modificar:**
- `frontend/components/InterviewerAudio.tsx` (nuevo)
- `frontend/pages/LiveInterviewPage.tsx` (modificar)

---

### FASE 3: Análisis en Tiempo Real (Semana 3-4)
**Objetivo:** Analizar video y audio del usuario continuamente

#### 3.1 Análisis de Video Continuo
**Tareas:**
- [ ] Modificar captura de video para envío continuo
- [ ] Integrar con Gemini 3 Flash para análisis frame por frame
- [ ] Procesar análisis y extraer métricas
- [ ] Enviar feedback visual al frontend

**Archivos a crear/modificar:**
- `backend/services/video_analyzer_live.py` (nuevo)
- `frontend/hooks/useMediaPipeFaceMesh.ts` (modificar si necesario)
- `frontend/pages/LiveInterviewPage.tsx` (modificar)

**Métricas a analizar:**
- Contacto visual
- Postura
- Expresiones faciales
- Gestos

**Frecuencia de análisis:**
- Objetivo: cada 600ms (como actual)
- Optimización: solo cuando hay cambios significativos

#### 3.2 Análisis de Audio en Tiempo Real
**Tareas:**
- [ ] Análisis de audio mientras el usuario habla
- [ ] Detección de velocidad de habla
- [ ] Detección de muletillas
- [ ] Análisis de tono y entonación
- [ ] Feedback visual inmediato

**Archivos a crear:**
- `frontend/services/audioAnalyzer.ts` (nuevo)
- `backend/services/audio_analyzer_live.py` (nuevo)

**Tecnologías:**
- Web Audio API para análisis local
- Opcional: validación con IA cloud

#### 3.3 Feedback Visual en Tiempo Real
**Tareas:**
- [ ] Componente HUD con métricas en vivo
- [ ] Actualización continua de indicadores
- [ ] Colores semánticos (verde/amarillo/rojo)
- [ ] Animaciones suaves

**Archivos a crear:**
- `frontend/components/LiveFeedbackHUD.tsx` (nuevo)

**Métricas a mostrar:**
- Contacto visual (%)
- Postura (score)
- Velocidad de habla
- Muletillas (contador)
- Estado general (nervioso/confiado/neutral)

---

### FASE 4: Gestión de Etapas y Transiciones (Semana 4-5)
**Objetivo:** Transición automática entre las 4 etapas con gestión de tiempo y mejoras visuales

#### 4.1 Stage Manager en Backend
**Tareas:**
- [ ] Lógica de transición automática entre etapas
- [ ] Criterios de progreso basados en tiempo y calidad
- [ ] Actualización de instrucciones del sistema por etapa
- [ ] Persistencia de progreso y estado

**Archivos a crear:**
- `backend/services/stage_manager.py` (nuevo)
- `backend/services/live_session.py` (modificar)

**Criterios de transición:**
- **Tiempo mínimo por etapa: 45 segundos**
- **Progreso basado en tiempo**: Cada 45 segundos avanza automáticamente
- **Calidad de respuestas** (opcional, basado en métricas de Fase 3)
- **Número de preguntas** respondidas (opcional, puede acelerar transición)

**Lógica de etapas:**
1. **Introducción** (0-45s) → Automáticamente pasa a Experiencia
2. **Experiencia** (45-90s) → Automáticamente pasa a Comportamiento  
3. **Comportamiento** (90-135s) → Automáticamente pasa a Cierre
4. **Cierre** (135-180s) → Finaliza la sesión

#### 4.2 Avatar Visual Animado del Entrevistador
**Tareas:**
- [ ] Componente de avatar con animación CSS
- [ ] Sincronización de animación con audio del entrevistador
- [ ] Estados visuales: escuchando, hablando, pensando
- [ ] Animación de onda de audio sincronizada con reproducción

**Archivos a crear:**
- `frontend/components/InterviewerAvatar.tsx` (nuevo)

**Implementación:**
- **No usar Veo 3** para generación de videos
- **Animación CSS** pura sincronizada con `isAgentSpeaking`
- **Ondas de audio** que responden al audio en tiempo real
- **Estados**: 
  - `idle`: Avatar estático/animación sutil
  - `speaking`: Animación de habla con ondas de audio
  - `listening`: Animación sutil de atención

**Recursos necesarios:**
- Solo CSS y JavaScript (sin videos ni imágenes adicionales)
- Posiblemente una imagen base del entrevistador o usar SVG/CSS puro

#### 4.3 Actualización de Barra de Progreso
**Tareas:**
- [ ] Sincronización con backend (tiempo real)
- [ ] Animaciones de transición entre etapas
- [ ] Indicadores visuales de progreso basados en tiempo
- [ ] Tooltips informativos con tiempo restante
- [ ] Countdown visual para cada etapa

**Archivos a modificar:**
- `frontend/components/ProgressBar.tsx`

**Funcionalidades:**
- Mostrar tiempo transcurrido en la etapa actual
- Countdown: "45s restantes" → "0s restantes"
- Animación suave al cambiar de etapa
- Indicador visual de próxima etapa

---

### FASE 5: Integración y Pulido (Semana 5-6)
**Objetivo:** Integrar todos los componentes y mejorar UX

#### 5.1 Manejo de Errores y Reconexión
**Tareas:**
- [ ] Manejo de desconexiones WebSocket
- [ ] Reconexión automática
- [ ] Recuperación de estado
- [ ] Mensajes de error amigables

**Archivos a modificar:**
- `frontend/services/wsLive.ts`
- `backend/routers/live.py`

#### 5.2 Optimización de Rendimiento
**Tareas:**
- [ ] Optimizar frecuencia de análisis
- [ ] Compresión de datos
- [ ] Lazy loading de recursos
- [ ] Debouncing de actualizaciones UI

#### 5.3 Testing y Validación
**Tareas:**
- [ ] Testing de flujo completo
- [ ] Validación de latencia
- [ ] Testing de diferentes conexiones
- [ ] Testing de diferentes navegadores

#### 5.4 Documentación y Onboarding
**Tareas:**
- [ ] Guía de uso del feature LIVE
- [ ] Tooltips y ayuda contextual
- [ ] Tutorial inicial (opcional)
- [ ] Documentación técnica

---

## 4. Recursos y Decisiones Necesarias

### 4.1 Recursos del Usuario

#### Avatar Visual del Entrevistador
**Necesario:**
- [ ] Imagen base del entrevistador (PNG/SVG) - OPCIONAL
  - Si no se proporciona, usar diseño CSS/SVG puro
- [ ] Formato: PNG transparente o SVG
- [ ] Resolución: 1080p ideal, pero no crítico (se escala)

**Implementación:**
- **NO usar videos pregrabados**
- **NO usar Veo 3 para generación**
- **Animación CSS** sincronizada con audio en tiempo real
- **Ondas de audio** que responden al estado `isAgentSpeaking`
- Estados: idle, speaking (con ondas), listening

**Alternativa si no hay imagen:**
- Usar SVG/CSS puro para crear avatar simple
- Enfoque en animación de ondas de audio

#### Configuración de API Keys
**Necesario:**
- [ ] Gemini Live API key (si se usa)
- [ ] Verificar límites y costos de Gemini Live API
- [ ] Configurar en `.env` del backend

### 4.2 Decisiones Técnicas

#### Opción A: Gemini Live API (Recomendado si disponible)
**Pros:**
- ✅ Conversación natural en tiempo real
- ✅ Manejo automático de turnos
- ✅ Baja latencia

**Contras:**
- ⚠️ Costo por minuto de uso
- ⚠️ Dependencia de servicio externo
- ⚠️ Requiere API key específica

#### Opción B: Simulación con OpenAI Whisper + LLM
**Pros:**
- ✅ Más control sobre el flujo
- ✅ Costo predecible
- ✅ Ya tenemos integración con OpenAI

**Contras:**
- ⚠️ Latencia mayor (1-2 segundos)
- ⚠️ Más complejidad de implementación
- ⚠️ Requiere manejo manual de turnos

**Recomendación:** Empezar con Opción B (más control) y migrar a Opción A si está disponible y el costo es aceptable.

### 4.3 Configuración de Infraestructura

**Backend:**
- [ ] Verificar capacidad de WebSocket en servidor
- [ ] Configurar rate limiting para WebSocket
- [ ] Configurar timeouts apropiados

**Frontend:**
- [ ] Verificar compatibilidad de WebSocket en navegadores objetivo
- [ ] Configurar polyfills si es necesario
- [ ] Optimizar para móvil (opcional)

---

## 5. Estructura de Archivos Propuesta

```
backend/
├── routers/
│   └── live.py                    # WebSocket handler para LIVE
├── services/
│   ├── live_session.py            # Gestión de sesiones LIVE
│   ├── gemini_live_client.py      # Cliente Gemini Live API
│   ├── video_analyzer_live.py      # Análisis de video continuo
│   ├── audio_analyzer_live.py     # Análisis de audio continuo
│   ├── stage_manager.py           # Gestión de etapas
│   └── interviewer_media.py       # Gestión de videos/audios

frontend/
├── pages/
│   └── LiveInterviewPage.tsx      # Página principal LIVE
├── components/
│   ├── ProgressBar.tsx            # Barra de progreso de etapas
│   ├── InterviewerVideo.tsx      # Video/imagen del entrevistador
│   ├── InterviewerAudio.tsx       # Reproducción de audio
│   └── LiveFeedbackHUD.tsx        # HUD con métricas en tiempo real
├── services/
│   ├── wsLive.ts                  # WebSocket client para LIVE
│   └── audioAnalyzer.ts           # Análisis de audio local
└── hooks/
    └── useLiveSession.ts          # Hook para gestión de sesión LIVE

assets/
└── interviewer/
    ├── stage-1/                   # Videos/audios etapa 1
    ├── stage-2/                   # Videos/audios etapa 2
    ├── stage-3/                   # Videos/audios etapa 3
    └── stage-4/                   # Videos/audios etapa 4
```

---

## 6. Métricas de Éxito

### 6.1 Métricas Técnicas
- **Latencia de respuesta del entrevistador**: <500ms
- **Latencia de análisis visual**: <600ms
- **Uptime de WebSocket**: >99%
- **Tasa de reconexión exitosa**: >95%

### 6.2 Métricas de Producto
- **Tasa de finalización de sesión LIVE**: >80%
- **Satisfacción del usuario**: >4/5
- **Tiempo promedio de sesión**: 10-15 min
- **Tasa de uso vs. simulación tradicional**: >50%

---

## 7. Riesgos y Mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| Latencia alta en chat de voz | Alto | Media | Implementar buffering inteligente, fallback a modo no-real-time |
| Costo de Gemini Live API | Alto | Alta | Monitorear uso, implementar límites, considerar alternativa |
| Problemas de conectividad | Medio | Media | Reconexión automática, guardado de progreso |
| Análisis en tiempo real muy costoso | Medio | Media | Optimizar frecuencia, usar análisis local cuando sea posible |
| Complejidad de integración | Medio | Alta | Desarrollo incremental, testing continuo |

---

## 8. Próximos Pasos Inmediatos

### Semana 1: Setup y Planificación
1. **Decidir tecnología de chat de voz** (Gemini Live vs. Whisper+LLM)
2. **Preparar recursos de video/audio** del entrevistador (o usar alternativa)
3. **Configurar entorno de desarrollo** para WebSocket
4. **Crear estructura de archivos** base

### Semana 2: Implementación Fase 1
1. **Implementar WebSocket handler** en backend
2. **Crear componente base** LiveInterviewPage
3. **Implementar barra de progreso**
4. **Testing básico de conexión**

---

## 9. Notas de Implementación

- Este plan es incremental: cada fase se puede probar independientemente
- Se puede empezar con una versión simplificada y mejorar iterativamente
- El análisis en tiempo real puede empezar básico y mejorarse con el tiempo
- La integración con Gemini Live puede ser opcional inicialmente

---

**Fin del Documento**

