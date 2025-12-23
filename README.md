## Entrenador de entrevistas – T2.1 (Experiencia / Proyecto)

Este repositorio contiene una implementación completa y funcional para practicar la etapa **T2.1 – Describir un proyecto o experiencia** dentro de una entrevista laboral por etapas.

El foco está en la etapa de **Experiencia**, usando una interfaz React moderna con diseño tipo Shadcn UI y un backend FastAPI que simula la evaluación de comportamientos observables.

### Estructura

- `backend`: API FastAPI con el endpoint `POST /mock/evaluate-t2-1` que detecta múltiples comportamientos.
- `frontend`: SPA en React (Vite + Tailwind CSS) con interfaz completa para práctica T2.1.
- `docker-compose.yml`: orquesta ambos servicios.

### Cómo ejecutar

1. Asegúrate de tener **Docker** y **docker compose** instalados.
2. En la raíz del proyecto, ejecuta:

```bash
docker compose up --build
```

3. Frontend: `http://localhost:3002`
4. Backend: `http://localhost:8001/docs` para ver los endpoints mock.

### Funcionalidades implementadas

#### Subtareas cognitivas (HTA)

✅ **Seleccionar un ejemplo relevante**
- Dropdown con 6 tipos de proyectos predefinidos
- Opción para escribir tu propio proyecto
- Ayuda a enfocarse en un ejemplo concreto

✅ **Estructurar con STAR**
- 4 campos obligatorios: Situación, Tarea, Acción, Resultado
- Placeholders orientadores con ejemplos concretos
- Validación que no permite avanzar si falta alguna parte
- Contador de palabras por campo
- Detección de muletillas por campo

✅ **Ajustar longitud (resumen vs detalle)**
- Selector explícito: Respuesta breve (1–2 min) vs Detallada (3–4 min)
- Objetivos de palabras diferentes según modo
- Feedback en tiempo real sobre longitud adecuada

#### Comportamientos observables detectados

✅ **"No sabía cómo responder / cuánto extenderme"**
- Guías claras en cada paso
- Consejos contextuales para evitar bloqueos
- Feedback inmediato sobre longitud

✅ **"Se demora en hilar ideas"**
- Detección de pausas largas entre campos STAR
- Métrica `thinking_delay` que identifica demoras
- Sugerencias específicas para estructurar más rápido

✅ **"Mezcla palabras, vocaliza mal, habla más rápido de lo que piensa"**
- Detección de velocidad de escritura (keystrokes/segundo)
- Conteo de backspaces (indica correcciones frecuentes)
- Métrica `word_mixing` que combina velocidad alta + muchos backspaces
- Feedback visual sobre muletillas detectadas

✅ **Pausas prolongadas**
- Temporizador desde que se presiona "Empezar a practicar"
- Alerta si pasan >15 segundos sin escribir
- Detección de pausa larga en tiempo total de respuesta

✅ **Muletillas**
- Lista de muletillas comunes en español: "eh", "este", "mmm", "o sea", etc.
- Detección automática en tiempo real
- Contador por campo y total
- Feedback específico si hay ≥3 muletillas

✅ **Lenguaje incompleto**
- Detección de frases incompletas (sin punto final, muy cortas)
- Frases que terminan con coma o "y" sin completar
- Métrica `incomplete_language` en el feedback

✅ **Respuesta demasiado corta o técnica sin contexto**
- Validación de longitud según modo (breve vs detallado)
- Detección de exceso de términos técnicos vs palabras de contexto
- Feedback constructivo sobre cómo traducir términos técnicos

### Flujo de uso (T2.1)

1. **Selecciona un ejemplo relevante**: Elige el tipo de proyecto que quieres practicar.
2. **Lee la pregunta** de la persona entrevistadora en la tarjeta inicial.
3. **Elige el modo de longitud cognitiva**:
   - Respuesta breve (1–2 minutos): 80–150 palabras objetivo
   - Respuesta detallada (3–4 minutos): 150–280 palabras objetivo
4. **Completa los cuatro campos STAR**:
   - Observa contadores de palabras y advertencias en tiempo real
   - Detecta muletillas mientras escribes
   - Recibe avisos si algo está muy corto o muy técnico
5. **Presiona "Empezar a practicar"** para iniciar el temporizador y detectar pausas prolongadas.
6. **Envía con "Enviar para recibir feedback"**:
   - El frontend llama a `POST /mock/evaluate-t2-1` con todas las métricas
   - El backend evalúa:
     - Estructura STAR (completa/incompleta)
     - Longitud (muy corta/adecuada/muy larga)
     - Nivel técnico (claro/muy técnico)
     - Pausas prolongadas
     - Muletillas detectadas
     - Lenguaje incompleto
     - Demora en hilar ideas
     - Mezcla de palabras / velocidad
   - Devuelve sugerencias concretas y constructivas
7. **Revisa el panel de feedback inmediato** con:
   - 4 métricas principales (Estructura, Longitud, Claridad, Fluidez)
   - Lista de sugerencias específicas para mejorar
8. **Repite el ejercicio** ajustando según el feedback.

### Diseño y UX

- **Interfaz minimalista** siguiendo principios de Shadcn UI
- **Gradientes sutiles** y espaciado generoso para mejor legibilidad
- **Feedback visual inmediato** con badges de colores y alertas contextuales
- **Microcopys claros** que ayudan a salir del bloqueo
- **Diseño responsive** que funciona en desktop y móvil
- **Accesibilidad**: focus visible, contraste adecuado, labels claros

### Alcance

- ✅ Solo etapa **T2.1 – Experiencia / Proyecto**
- ✅ Evaluación simulada y determinista (no hay NLP real)
- ✅ Detección de múltiples comportamientos observables
- ✅ Interfaz completa con todas las subtareas cognitivas
- ❌ No hay autenticación ni persistencia de usuarios
- ❌ No se usa voz real; los tiempos se simulan con temporizadores y métricas de escritura

### Tecnologías

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI + Python 3.11
- **Orquestación**: Docker Compose
