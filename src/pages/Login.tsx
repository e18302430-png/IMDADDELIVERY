
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState<'staff' | 'delegate'>('staff');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { user, error } = await authService.loginUser(userType, phone, password);

    if (error || !user) {
      setErrorMsg(error || 'فشل تسجيل الدخول');
      setLoading(false);
      return;
    }

    // التوجيه حسب نوع المستخدم
    if (user.kind === 'staff') {
      navigate('/dashboard');
    } else {
      navigate('/delegate');
    }
  };

  return (
    <div style={styles.container} dir="rtl">
      <div style={styles.card}>
        <h2 style={styles.title}>تسجيل الدخول</h2>
        <p style={styles.subtitle}>منصة إمداد اللوجستية</p>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>نوع المستخدم:</label>
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value as 'staff' | 'delegate')}
              style={styles.input}
            >
              <option value="staff">إداري / موظف</option>
              <option value="delegate">مندوب توصيل</option>
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>رقم الجوال:</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="05xxxxxxxx"
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>كلمة المرور:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="******"
              style={styles.input}
            />
          </div>

          {errorMsg && <div style={styles.error}>{errorMsg}</div>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Styles object for clean UI without external CSS files
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f3f4f6',
    fontFamily: 'Arial, sans-serif',
  },
  card: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
  },
  title: {
    marginBottom: '0.5rem',
    color: '#111827',
  },
  subtitle: {
    marginBottom: '2rem',
    color: '#6b7280',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'right',
  },
  label: {
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
    color: '#374151',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '1rem',
  },
  button: {
    padding: '0.75rem',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '1rem',
  },
  error: {
    color: '#dc2626',
    fontSize: '0.9rem',
    marginTop: '0.5rem',
  },
};

export default Login;
