
import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { Circular, UserRole } from '../types';

const CreateCircularModal: React.FC<{
    onClose: () => void;
    onSave: (circular: Omit<Circular, 'id' | 'createdAt' | 'authorRole' | 'authorName'>) => void;
    currentUserRole: UserRole;
}> = ({ onClose, onSave, currentUserRole }) => {
    const { t } = useTranslation();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [audience, setAudience] = useState<'all' | 'delegates'>('delegates');

    const canTargetAll = [UserRole.GeneralManager, UserRole.MovementManager].includes(currentUserRole);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            alert(t('error_fillAllFields'));
            return;
        }
        onSave({ title, content, audience });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="glass-card w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-orange-400">{t('createNewCircular')}</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-300">{t('circularTitle')}</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input-styled w-full" required />
                        </div>
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-300">{t('circularContent')}</label>
                            <textarea value={content} onChange={e => setContent(e.target.value)} rows={6} className="input-styled w-full" required />
                        </div>
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-300">{t('targetAudience')}</label>
                            <select value={audience} onChange={e => setAudience(e.target.value as 'all' | 'delegates')} className="input-styled w-full">
                                {canTargetAll && <option value="all">{t('audience_all')}</option>}
                                <option value="delegates">{t('audience_delegates')}</option>
                            </select>
                        </div>
                    </div>
                    <div className="p-6 border-t border-gray-700 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="btn-secondary">{t('cancel')}</button>
                        <button type="submit" className="btn-primary">{t('create')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const GuidanceAndCirculars: React.FC = () => {
    const { data, setData, currentUser } = useContext(AppContext);
    const { t } = useTranslation();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const sortedCirculars = useMemo(() => {
        return (data.circulars || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [data.circulars]);

    const handleSaveCircular = (newCircularData: Omit<Circular, 'id' | 'createdAt' | 'authorRole' | 'authorName'>) => {
        if (!currentUser) return;
        const newCircular: Circular = {
            id: Date.now(),
            ...newCircularData,
            authorRole: currentUser.role,
            authorName: t(`role_${currentUser.role}`),
            createdAt: new Date().toISOString(),
        };
        setData(prev => ({ ...prev, circulars: [...(prev.circulars || []), newCircular] }));
        setIsCreateModalOpen(false);
    };

    return (
        <div className="space-y-6 animate-fade-in">
             {isCreateModalOpen && (
                <CreateCircularModal 
                    onClose={() => setIsCreateModalOpen(false)}
                    onSave={handleSaveCircular}
                    currentUserRole={currentUser!.role}
                />
            )}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-white">{t('guidanceAndCirculars')}</h1>
                <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary flex items-center gap-2">
                    <i className="fas fa-plus-circle"></i>
                    {t('createNewCircular')}
                </button>
            </div>
            
            <div className="glass-card p-4">
                {sortedCirculars.length > 0 ? (
                    <div className="space-y-4">
                        {sortedCirculars.map(c => (
                             <div key={c.id} className="bg-gray-800/50 p-4 rounded-lg">
                                <p className="font-bold text-lg text-orange-400">{c.title}</p>
                                <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">{c.content}</p>
                                <div className="text-xs text-gray-500 mt-4 pt-3 border-t border-gray-700/50 flex justify-between items-center">
                                    <div>
                                        <span>{t('author')}: {c.authorName}</span>
                                        <span className="mx-2">|</span>
                                        <span>{t('date')}: {new Date(c.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full ${c.audience === 'all' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-green-500/20 text-green-300'}`}>
                                        {t(`audience_${c.audience}`)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                     <div className="text-center py-16 text-gray-400">
                        <i className="fas fa-bullhorn text-5xl mb-4"></i>
                        <p>{t('noCirculars')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GuidanceAndCirculars;
