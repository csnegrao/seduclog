import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'REQUESTER' });
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password, form.role);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao autenticar');
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f7fafc',
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '32px',
          width: '360px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <h1 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '1.4rem', color: '#2d3748' }}>
          📦 SeducLog
        </h1>
        <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
          {['login', 'register'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: '8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: mode === m ? 'bold' : 'normal',
                borderBottom: mode === m ? '2px solid #3182ce' : '2px solid transparent',
                marginBottom: '-2px',
                color: mode === m ? '#3182ce' : '#718096',
              }}
            >
              {m === 'login' ? 'Entrar' : 'Cadastrar'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mode === 'register' && (
            <>
              <input
                placeholder="Nome"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                style={inputStyle}
              />
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                style={inputStyle}
              >
                <option value="REQUESTER">Solicitante</option>
                <option value="WAREHOUSE_OPERATOR">Operador de Armazém</option>
                <option value="DRIVER">Motorista</option>
                <option value="ADMIN">Admin</option>
              </select>
            </>
          )}
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Senha"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            style={inputStyle}
          />
          {error && <p style={{ color: '#e53e3e', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
          <button
            type="submit"
            style={{
              background: '#3182ce',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.95rem',
            }}
          >
            {mode === 'login' ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: '10px 12px',
  border: '1px solid #cbd5e0',
  borderRadius: '8px',
  fontSize: '0.9rem',
  outline: 'none',
};
