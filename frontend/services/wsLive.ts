/**
 * Servicio WebSocket para feature LIVE
 * Maneja la conexión y comunicación en tiempo real con el backend
 * Incluye reconexión automática y recuperación de estado
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8005';

export type LiveMessage = {
  type: string;
  [key: string]: any;
};

export type LiveStage = 'introduction' | 'experience' | 'behavioral' | 'stress' | 'closing';

export interface LiveSession {
  session_id: number;
  user_id?: number;
  current_stage: LiveStage;
  progress: number; // 0.0 a 1.0 (progreso total)
  stage_progress?: number; // 0.0 a 1.0 (progreso dentro de la etapa actual)
  time_remaining?: number; // Segundos restantes en etapa actual
  started_at: string;
  last_activity: string;
  is_active: boolean;
  questions_count: number;
}

interface ReconnectConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RECONNECT_CONFIG: ReconnectConfig = {
  maxAttempts: 10,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 1.5
};

export class LiveWebSocketClient {
  private ws: WebSocket | null = null;
  private sessionId: number;
  private reconnectAttempts = 0;
  private reconnectConfig: ReconnectConfig;
  private reconnectTimer?: number;
  private isManualDisconnect = false;
  private onMessageCallback?: (message: LiveMessage) => void;
  private onErrorCallback?: (error: Event) => void;
  private onCloseCallback?: () => void;
  private onReconnectCallback?: () => void;
  private heartbeatInterval?: number;
  private lastHeartbeatTime: number = 0;
  private messageQueue: LiveMessage[] = []; // Cola de mensajes pendientes
  private sessionState?: LiveSession; // Estado de sesión para recuperación

  constructor(sessionId: number, reconnectConfig?: Partial<ReconnectConfig>) {
    this.sessionId = sessionId;
    this.reconnectConfig = { ...DEFAULT_RECONNECT_CONFIG, ...reconnectConfig };
  }

  /**
   * Conecta al WebSocket con manejo mejorado de errores
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
        const url = `${wsUrl}/live/ws/${this.sessionId}`;
        
        this.ws = new WebSocket(url);
        this.lastHeartbeatTime = Date.now();

        this.ws.onopen = () => {
          console.log('LIVE WebSocket connected');
          this.reconnectAttempts = 0;
          this.isManualDisconnect = false;
          this.startHeartbeat();
          
          // Procesar cola de mensajes pendientes
          this.flushMessageQueue();
          
          // Recuperar estado si existe
          if (this.sessionState) {
            console.log('Session state recovered:', this.sessionState);
          }
          
          if (this.onReconnectCallback && this.reconnectAttempts > 0) {
            this.onReconnectCallback();
          }
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: LiveMessage = JSON.parse(event.data);
            this.lastHeartbeatTime = Date.now();
            
            // Manejar pong del servidor
            if (message.type === 'pong') {
              return;
            }
            
            // Guardar estado de sesión para recuperación
            if (message.session) {
              this.sessionState = message.session;
            }
            
            if (this.onMessageCallback) {
              this.onMessageCallback(message);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('LIVE WebSocket error:', error);
          if (this.onErrorCallback) {
            this.onErrorCallback(error);
          }
          // No rechazar aquí, dejar que onclose maneje la reconexión
        };

        this.ws.onclose = (event) => {
          console.log(`LIVE WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
          this.stopHeartbeat();
          
          if (this.onCloseCallback && !this.isManualDisconnect) {
            this.onCloseCallback();
          }
          
          // Intentar reconectar si no fue un cierre intencional y no excedió intentos
          if (!this.isManualDisconnect && this.reconnectAttempts < this.reconnectConfig.maxAttempts) {
            this.attemptReconnect();
          } else if (this.reconnectAttempts >= this.reconnectConfig.maxAttempts) {
            console.error('Max reconnection attempts reached. Connection failed.');
            reject(new Error('Failed to reconnect after maximum attempts'));
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Intenta reconectar con backoff exponencial
   */
  private attemptReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectConfig.initialDelay * Math.pow(this.reconnectConfig.backoffMultiplier, this.reconnectAttempts - 1),
      this.reconnectConfig.maxDelay
    );
    
    console.log(`Attempting to reconnect in ${delay}ms (${this.reconnectAttempts}/${this.reconnectConfig.maxAttempts})...`);
    
    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection attempt failed:', error);
        if (this.reconnectAttempts < this.reconnectConfig.maxAttempts) {
          this.attemptReconnect();
        }
      });
    }, delay);
  }

  /**
   * Procesa la cola de mensajes pendientes
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  /**
   * Desconecta del WebSocket
   */
  disconnect(): void {
    this.isManualDisconnect = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    this.messageQueue = [];
  }

  /**
   * Envía un mensaje al servidor (con cola si está desconectado)
   */
  send(message: LiveMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message:', error);
        // Agregar a cola para reintentar después
        this.messageQueue.push(message);
      }
    } else {
      // Agregar a cola si no está conectado
      console.warn('WebSocket not connected, queueing message:', message.type);
      this.messageQueue.push(message);
      
      // Limitar tamaño de cola
      if (this.messageQueue.length > 50) {
        this.messageQueue.shift(); // Remover mensaje más antiguo
      }
    }
  }

  /**
   * Envía un chunk de audio
   */
  sendAudioChunk(audioData: string): void {
    this.send({
      type: 'audio_chunk',
      data: audioData
    });
  }

  /**
   * Envía un frame de video (con compresión)
   */
  sendVideoFrame(imageData: string): void {
    // Remover prefijo data: si existe
    const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
    
    this.send({
      type: 'video_frame',
      data: base64Data
    });
  }

  /**
   * Notifica que se completó una pregunta
   */
  notifyQuestionCompleted(): void {
    this.send({
      type: 'question_completed'
    });
  }

  /**
   * Inicializa la sesión con user_id
   */
  initialize(userId?: number): void {
    this.send({
      type: 'connect',
      user_id: userId
    });
  }

  /**
   * Obtiene el estado de sesión guardado (para recuperación)
   */
  getSavedSessionState(): LiveSession | undefined {
    return this.sessionState;
  }

  /**
   * Callbacks
   */
  onMessage(callback: (message: LiveMessage) => void): void {
    this.onMessageCallback = callback;
  }

  onError(callback: (error: Event) => void): void {
    this.onErrorCallback = callback;
  }

  onClose(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  onReconnect(callback: () => void): void {
    this.onReconnectCallback = callback;
  }

  /**
   * Heartbeat mejorado con detección de timeout
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Verificar si el servidor responde
        const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeatTime;
        if (timeSinceLastHeartbeat > 60000) {
          console.warn('No heartbeat received for 60s, connection may be stale');
        }
        
        this.send({ type: 'ping' });
      }
    }, 30000); // Ping cada 30 segundos
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  /**
   * Estado de la conexión
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Obtiene el número de intentos de reconexión
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Reinicia el contador de intentos de reconexión
   */
  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }
}
