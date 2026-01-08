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
    // LIVE Interview API
    getLiveSessions: async (userId?: number, limit: number = 50) => {
        const params = new URLSearchParams();
        if (userId) params.append('user_id', userId.toString());
        params.append('limit', limit.toString());
        const response = await fetch(`${API_URL}/live/sessions?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch live sessions');
        return response.json();
    },
    getLiveSession: async (sessionId: number) => {
        const response = await fetch(`${API_URL}/live/sessions/${sessionId}`);
        if (!response.ok) throw new Error('Failed to fetch live session');
        return response.json();
    },
    getLiveSessionMetrics: async (sessionId: number) => {
        const response = await fetch(`${API_URL}/live/sessions/${sessionId}/metrics`);
        if (!response.ok) throw new Error('Failed to fetch session metrics');
        return response.json();
    },
    getFullLiveSession: async (sessionId: number) => {
        const response = await fetch(`${API_URL}/live/sessions/${sessionId}/full`);
        if (!response.ok) throw new Error('Failed to fetch full session');
        return response.json();
    }
};
