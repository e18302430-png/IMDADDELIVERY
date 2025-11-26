
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { delegatesService } from '../services/delegatesService';
import { Delegate } from '../types/models';

const DelegateHome: React.FC = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [delegateInfo, setDelegateInfo] = useState<Delegate | null>(null);

  useEffect(() => {
    if (user?.id) {
      delegatesService.getDelegateById(user.id).then(data => {
        setDelegateInfo(data);
      });
    }
  }, [user]);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div style={styles.container} dir="rtl">
      <div style={styles.card}>
        <div style={styles.header}>
          <h2>ملف المندوب</h2>
          <button onClick={handleLogout} style={styles.logoutBtn}>خروج</button>
        </div>

        <div style={styles.info}>
          <div style={styles.row}>
            <strong>الاسم:</strong>
            <span>{delegateInfo?.name || user?.name}</span>
          </div>
          <div style={styles.row}>
            <strong>رقم الجوال:</strong>
            <span>{delegateInfo?.phone || user?.phone}</span>
          </div>
          <div style={styles.row}>
            <strong>نوع التعاقد:</strong>
            <span>{delegateInfo?.type || user?.roleOrType}</span>
          </div>
          <div style={styles.row}>
            <strong>الحالة الوظيفية:</strong>
            <span style={delegateInfo?.employment_status === 'نشط' ? styles.active : styles.inactive}>
              {delegateInfo?.employment_status || 'غير معروف'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#eef2f6',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'Arial, sans-serif',
    padding: '1rem',
  },
  card: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '500px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    borderBottom: '1px solid #eee',
    paddingBottom: '1rem',
  },
  logoutBtn: {
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  active: { color: 'green', fontWeight: 'bold' },
  inactive: { color: 'red', fontWeight: 'bold' },
};

export default DelegateHome;
