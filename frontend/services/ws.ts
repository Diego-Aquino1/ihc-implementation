const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8005';

export type WSMessage = { type: string; payload?: any };

function toWsUrl(httpUrl: string): string {
  if (httpUrl.startsWith('https://')) return httpUrl.replace('https://', 'wss://');
  if (httpUrl.startsWith('http://')) return httpUrl.replace('http://', 'ws://');
  return httpUrl;
}

export function connectSessionWS(sessionId: number, onMessage: (msg: WSMessage) => void): WebSocket {
  const wsBase = toWsUrl(API_URL);
  const ws = new WebSocket(`${wsBase}/ws/sessions/${sessionId}`);

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      onMessage(msg);
    } catch {
      // ignore
    }
  };

  return ws;
}

export function wsSend(ws: WebSocket | null, msg: WSMessage) {
  if (!ws) return;
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(msg));
}


