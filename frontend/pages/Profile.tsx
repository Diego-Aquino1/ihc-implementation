import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const Profile: React.FC = () => {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '' });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = () => {
        api.getProfile().then(data => {
            setProfile(data);
            setFormData({ name: data.name, email: data.email });
            setLoading(false);
        }).catch(console.error);
    };

    const handleSave = async () => {
        try {
            await api.updateProfile({ ...profile, ...formData });
            setProfile({ ...profile, ...formData });
            setIsEditing(false);
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-6">Perfil de Usuario</h1>

            <div className="bg-white dark:bg-surface-dark p-8 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
                <div className="flex flex-col items-center mb-8">
                    <img src={profile.avatar_url} alt="Profile" className="w-32 h-32 rounded-full mb-4 border-4 border-primary/20" />
                    <span className="bg-gradient-to-r from-primary to-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{profile.plan} Plan</span>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre Completo</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:text-white"
                            />
                        ) : (
                            <p className="text-lg font-medium dark:text-white">{profile.name}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Correo Electrónico</label>
                        {isEditing ? (
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:text-white"
                            />
                        ) : (
                            <p className="text-lg font-medium dark:text-white">{profile.email}</p>
                        )}
                    </div>

                    <div className="pt-6 flex justify-end gap-3">
                        {isEditing ? (
                            <>
                                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-white font-bold">Cancelar</button>
                                <button onClick={handleSave} className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-bold transition-colors">Guardar Cambios</button>
                            </>
                        ) : (
                            <button onClick={() => setIsEditing(true)} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white px-6 py-2 rounded-lg font-bold transition-colors">Editar Perfil</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
