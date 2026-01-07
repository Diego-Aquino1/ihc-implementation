const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8005';

export const api = {
    getProfile: async () => {
        const response = await fetch(`${API_URL}/profile/`);
        if (!response.ok) throw new Error('Failed to fetch profile');
        return response.json();
    },
    updateProfile: async (data: any) => {
        const response = await fetch(`${API_URL}/profile/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update profile');
        return response.json();
    },
    getHistory: async () => {
        const response = await fetch(`${API_URL}/history/`);
        if (!response.ok) throw new Error('Failed to fetch history');
        return response.json();
    },
    getDashboardStats: async () => {
        const response = await fetch(`${API_URL}/dashboard/stats`);
        if (!response.ok) throw new Error('Failed to fetch stats');
        return response.json();
    },

    // ===== MVP Coach (sessions) =====
    createSession: async (selected_modules: string[] = ['HR', 'Behavioral', 'Leadership'], config: any = {}) => {
        const response = await fetch(`${API_URL}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selected_modules, config })
        });
        if (!response.ok) throw new Error('Failed to create session');
        return response.json();
    },

    nextTurn: async (sessionId: number) => {
        const response = await fetch(`${API_URL}/sessions/${sessionId}/next`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to get next turn');
        return response.json();
    },

    submitAnswerAudio: async (sessionId: number, audioBlob: Blob, text?: string) => {
        const form = new FormData();
        if (text) form.append('text', text);
        const file = new File([audioBlob], 'answer.webm', { type: audioBlob.type || 'audio/webm' });
        form.append('audio', file);

        const response = await fetch(`${API_URL}/sessions/${sessionId}/answer`, {
            method: 'POST',
            body: form
        });
        if (!response.ok) throw new Error('Failed to submit answer');
        return response.json();
    },

    submitAnswerText: async (sessionId: number, text: string) => {
        const form = new FormData();
        form.append('text', text);
        const response = await fetch(`${API_URL}/sessions/${sessionId}/answer`, {
            method: 'POST',
            body: form
        });
        if (!response.ok) throw new Error('Failed to submit answer');
        return response.json();
    },

    tts: async (text: string) => {
        const response = await fetch(`${API_URL}/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        if (!response.ok) {
            // 501 -> fallback
            return null;
        }
        return response.json();
    }
};
