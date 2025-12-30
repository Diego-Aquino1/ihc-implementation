import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

interface SessionItem {
    id: number;
    date: string;
    score: number;
    duration_seconds: number;
    feedback_summary: string;
}

const History: React.FC = () => {
    const [history, setHistory] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getHistory().then(data => {
            setHistory(data);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    if (loading) return <div className="p-8 text-center">Loading history...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-6">Historial de Sesiones</h1>
            <div className="space-y-4">
                {history.map((session) => (
                    <div key={session.id} className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm text-slate-500">{new Date(session.date).toLocaleDateString()}</span>
                                <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{Math.floor(session.duration_seconds / 60)} min</span>
                            </div>
                            <p className="font-medium dark:text-white">{session.feedback_summary || "Sin feedback detallado"}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Score</p>
                                <p className={`text-2xl font-black ${session.score >= 80 ? 'text-green-500' : session.score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                                    {session.score}
                                </p>
                            </div>
                            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <span className="material-symbols-outlined text-primary">visibility</span>
                            </button>
                        </div>
                    </div>
                ))}
                {history.length === 0 && (
                    <p className="text-center text-slate-500 py-10">No hay sesiones registradas aún.</p>
                )}
            </div>
        </div>
    );
};

export default History;
