
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { delegatesService } from '../services/delegatesService';
import { Delegate } from '../types/models';

const AllDelegates: React.FC = () => {
  const navigate = useNavigate();
  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newType, setNewType] = useState('كفالة');
  const [newStatus, setNewStatus] = useState('نشط');

  const fetchDelegates = async () => {
    setLoading(true);
    const data = await delegatesService.loadDelegates();
    setDelegates(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDelegates();
  }, []);

  const handleAddDelegate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { success, error } = await delegatesService.addDelegate({
      name: newName,
      phone: newPhone,
      password: newPassword,
      type: newType,
      employment_status: newStatus,
    });

    if (success) {
      alert('تمت الإضافة بنجاح');
      setShowForm(false);
      // Reset form
      setNewName('');
      setNewPhone('');
      setNewPassword('');
      fetchDelegates(); // Refresh list
    } else {
      alert('خطأ أثناء الإضافة: ' + error);
    }
  };

  return (
    <div style={styles.container} dir="rtl">
      <div style={styles.header}>
        <h2>إدارة المناديب</h2>
        <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>عودة للرئيسية</button>
      </div>

      <div style={styles.content}>
        <button 
          onClick={() => setShowForm(!showForm)} 
          style={styles.addBtn}
        >
          {showForm ? 'إلغاء' : 'إضافة مندوب جديد'}
        </button>

        {showForm && (
          <form onSubmit={handleAddDelegate} style={styles.form}>
            <h3>بيانات المندوب الجديد</h3>
            <div style={styles.formGrid}>
              <input placeholder="الاسم" value={newName} onChange={e => setNewName(e.target.value)} required style={styles.input} />
              <input placeholder="الجوال" value={newPhone} onChange={e => setNewPhone(e.target.value)} required style={styles.input} />
              <input placeholder="كلمة المرور" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={styles.input} />
              <select value={newType} onChange={e => setNewType(e.target.value)} style={styles.input}>
                <option value="كفالة">كفالة</option>
                <option value="أجير">أجير</option>
              </select>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={styles.input}>
                <option value="نشط">نشط</option>
                <option value="موقوف">موقوف</option>
              </select>
            </div>
            <button type="submit" style={styles.submitBtn}>حفظ</button>
          </form>
        )}

        {loading ? (
          <p>جاري التحميل...</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tr}>
                <th style={styles.th}>الاسم</th>
                <th style={styles.th}>الجوال</th>
                <th style={styles.th}>النوع</th>
                <th style={styles.th}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {delegates.map(d => (
                <tr key={d.id} style={styles.tr}>
                  <td style={styles.td}>{d.name}</td>
                  <td style={styles.td}>{d.phone}</td>
                  <td style={styles.td}>{d.type}</td>
                  <td style={styles.td}>
                    <span style={d.employment_status === 'نشط' ? styles.activeBadge : styles.inactiveBadge}>
                      {d.employment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: '2rem', fontFamily: 'Arial, sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' },
  backBtn: { padding: '0.5rem 1rem', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', background: '#fff' },
  content: { background: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  addBtn: { padding: '0.75rem 1.5rem', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '1rem' },
  form: { marginBottom: '2rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' },
  input: { padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' },
  submitBtn: { padding: '0.5rem 2rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem' },
  tr: { borderBottom: '1px solid #e5e7eb' },
  th: { padding: '1rem', textAlign: 'right', backgroundColor: '#f3f4f6', fontWeight: 'bold' },
  td: { padding: '1rem' },
  activeBadge: { backgroundColor: '#d1fae5', color: '#065f46', padding: '0.25rem 0.5rem', borderRadius: '999px', fontSize: '0.875rem' },
  inactiveBadge: { backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.25rem 0.5rem', borderRadius: '999px', fontSize: '0.875rem' },
};

export default AllDelegates;
