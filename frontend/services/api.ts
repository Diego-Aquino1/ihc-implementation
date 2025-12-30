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
    }
};
