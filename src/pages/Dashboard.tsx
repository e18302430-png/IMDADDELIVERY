
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { delegatesService } from '../services/delegatesService';
import { staffService } from '../services/staffService';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [stats, setStats] = useState({ delegatesCount: 0, staffCount: 0 });

  useEffect(() => {
    const loadData = async () => {
      const delegates = await delegatesService.loadDelegates();
      const staff = await staffService.loadStaff();
      setStats({
        delegatesCount: delegates.length,
        staffCount: staff.length,
      });
    };
    loadData();
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div style={styles.container} dir="rtl">
      <header style={styles.header}>
        <h2>لوحة التحكم</h2>
        <button onClick={handleLogout} style={styles.logoutBtn}>تسجيل الخروج</button>
      </header>

      <main style={styles.main}>
        <div style={styles.welcome}>
          <h3>مرحباً، {user?.name}</h3>
          <p>الدور الوظيفي: {user?.roleOrType}</p>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.card}>
            <h4>عدد المناديب</h4>
            <p style={styles.number}>{stats.delegatesCount}</p>
          </div>
          <div style={styles.card}>
            <h4>عدد الموظفين</h4>
            <p style={styles.number}>{stats.staffCount}</p>
          </div>
        </div>

        <div style={styles.actions}>
          <button onClick={() => navigate('/delegates')} style={styles.actionBtn}>
            إدارة المناديب
          </button>
        </div>
      </main>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    backgroundColor: '#1f2937',
    color: '#fff',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoutBtn: {
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  main: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  welcome: {
    marginBottom: '2rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  card: {
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  number: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#2563eb',
    margin: '0.5rem 0 0 0',
  },
  actions: {
    marginTop: '2rem',
  },
  actionBtn: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '1rem 2rem',
    fontSize: '1.1rem',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export default Dashboard;
