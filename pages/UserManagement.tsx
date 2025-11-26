
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { UserRole, Staff, Delegate } from '../types';
import AddUserModal from '../components/AddUserModal';
import ConfirmationModal from '../components/ConfirmationModal';

// Helper function to format Gregorian date and add Hijri date
const formatDateWithHijri = (dateString?: string): string => {
    if (!dateString || dateString.trim() === '') return '-';
    const date = new Date(`${dateString}T00:00:00Z`);
    if (isNaN(date.getTime())) return dateString;
    const gregorian = date.toLocaleDateString('en-CA', { timeZone: 'UTC' });
    const hijriFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    const hijri = hijriFormatter.format(date);
    return `${gregorian} (${hijri})`;
};


const UserTable: React.FC<{ 
    users: Staff[]; 
    delegates: Delegate[]; 
    onEdit: (user: Staff) => void; 
    onDelete: (user: Staff) => void; 
    currentUser: Staff; 
}> = ({ users, delegates, onEdit, onDelete, currentUser }) => {
    const { t } = useTranslation();
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-center">
                <thead className="border-b border-gray-700 text-gray-400">
                    <tr>
                        <th scope="col" className="p-3 ltr:text-left rtl:text-right">{t('userName')}</th>
                        <th scope="col" className="p-3">{t('userRole')}</th>
                        <th scope="col" className="p-3">{t('assignedDelegates')}</th>
                        <th scope="col" className="p-3">{t('phoneNumber')}</th>
                        <th scope="col" className="p-3">{t('nationalId')}</th>
                        <th scope="col" className="p-3">{t('idExpiryDate')}</th>
                        <th scope="col" className="p-3">{t('actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {users.length > 0 ? users.map(user => (
                        <tr key={user.id} className="border-b border-gray-800 hover:bg-orange-500/5 transition-colors">
                            <td className="p-3 font-semibold ltr:text-left rtl:text-right flex items-center gap-3">
                                <img src={user.imageUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                                {user.name}
                            </td>
                            <td className="p-3">{t(`role_${user.role}`)}</td>
                             <td className="p-3 font-semibold">
                                {user.role === UserRole.OpsSupervisor
                                    ? <span className="text-lg text-orange-400">{delegates.filter(d => d.supervisorId === user.id).length}</span>
                                    : '-'}
                            </td>
                            <td className="p-3 font-mono">{user.phone}</td>
                            <td className="p-3 font-mono">{user.nationalId}</td>
                            <td className="p-3">{formatDateWithHijri(user.idExpiryDate)}</td>
                            <td className="p-3">
                                <div className="flex items-center justify-center gap-2">
                                    <button 
                                        onClick={() => onEdit(user)}
                                        className="bg-blue-600/50 hover:bg-blue-500/50 text-blue-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                                        title={t('edit')}
                                    >
                                        <i className="fas fa-edit"></i>
                                    </button>
                                    {user.id !== currentUser.id && ( // Prevent self-deletion
                                        <button 
                                            onClick={() => onDelete(user)}
                                            className="bg-red-600/50 hover:bg-red-500/50 text-red-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                                            title={t('action_terminate')}
                                        >
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={7} className="p-6 text-center text-gray-400">{t('noUsersFound')}</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const UserManagement: React.FC = () => {
    const { data, setData, currentUser } = useContext(AppContext);
    const { t } = useTranslation();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<Staff | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, user: Staff | null }>({ isOpen: false, user: null });
    const [searchQuery, setSearchQuery] = useState('');

    const manageableStaff = useMemo(() => 
        data.staff.filter(s => 
            // Ensure super admins (GM/Movement) can't edit each other unless they are one, generally allow all viewing
            // But prevent editing higher roles if current user is lower role (though logic currently only gives access to GM/Movement/HR)
            true
        ), 
    [data.staff]);
    
    const filteredStaff = useMemo(() => {
        if (!searchQuery) return manageableStaff;
        const lowerQuery = searchQuery.toLowerCase();
        return manageableStaff.filter(s => 
            s.name.toLowerCase().includes(lowerQuery) ||
            s.phone.includes(lowerQuery) ||
            s.nationalId.includes(lowerQuery)
        );
    }, [manageableStaff, searchQuery]);

    const handleSaveUser = (newUserData: Omit<Staff, 'id'>) => {
        setData(prev => {
            if (userToEdit) {
                // Update Existing
                return {
                    ...prev,
                    staff: prev.staff.map(s => s.id === userToEdit.id ? { ...s, ...newUserData } : s)
                };
            } else {
                // Create New
                const newId = Math.max(0, ...prev.staff.map(s => s.id)) + 1;
                return {
                    ...prev,
                    staff: [...prev.staff, { ...newUserData, id: newId }]
                };
            }
        });
        setIsAddModalOpen(false);
        setUserToEdit(null);
    };

    const handleEditUser = (user: Staff) => {
        setUserToEdit(user);
        setIsAddModalOpen(true);
    };

    const handleDeleteUser = (user: Staff) => {
        setDeleteModal({ isOpen: true, user });
    };

    const confirmDelete = () => {
        if (!deleteModal.user) return;
        setData(prev => ({
            ...prev,
            staff: prev.staff.filter(s => s.id !== deleteModal.user!.id)
        }));
        setDeleteModal({ isOpen: false, user: null });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {isAddModalOpen && (
                <AddUserModal
                    onClose={() => { setIsAddModalOpen(false); setUserToEdit(null); }}
                    onSave={handleSaveUser}
                    currentUser={currentUser!}
                    userToEdit={userToEdit}
                />
            )}
            {deleteModal.isOpen && deleteModal.user && (
                 <ConfirmationModal
                    isOpen={deleteModal.isOpen}
                    onClose={() => setDeleteModal({ isOpen: false, user: null })}
                    onConfirm={confirmDelete}
                    title={t('confirm')}
                    message={`${t('areYouSureYouWantTo')} ${t('action_terminate')} ${deleteModal.user.name}?`}
                    confirmButtonText={t('yes')}
                    confirmButtonColor="bg-red-600 hover:bg-red-700"
                />
            )}

            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-white">{t('staffManagement')}</h1>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                     <div className="relative flex-grow sm:flex-grow-0">
                             <i className="fas fa-search absolute top-3 ltr:left-3 rtl:right-3 text-gray-500"></i>
                             <input 
                                type="text" 
                                placeholder={`${t('userName')} / ${t('phoneNumber')} / ${t('nationalId')}`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-styled w-full sm:w-64 ltr:pl-10 rtl:pr-10 py-2"
                             />
                    </div>
                    <button onClick={() => { setUserToEdit(null); setIsAddModalOpen(true); }} className="btn-primary flex items-center gap-2">
                        <i className="fas fa-user-plus"></i> {t('addUser')}
                    </button>
                </div>
            </div>

            <div className="glass-card p-4">
                <div className="pt-4">
                   <UserTable 
                        users={filteredStaff} 
                        delegates={data.delegates} 
                        onEdit={handleEditUser} 
                        onDelete={handleDeleteUser}
                        currentUser={currentUser!}
                    />
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
