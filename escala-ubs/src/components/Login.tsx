import { useState } from 'react';
import { LogIn, User, Lock, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  
  // --- ESTADOS DE SEGURANÇA ---
  const [tentativas, setTentativas] = useState(0);
  const [bloqueado, setBloqueado] = useState(false);
  const [senhaTemporaria, setSenhaTemporaria] = useState('');
  const MAX_TENTATIVAS = 5; 

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const userClean = usuario.toLowerCase().trim();
    let logado = false;

    if (userClean === 'admin') {
      if (senha === '123456' || (senhaTemporaria && senha === senhaTemporaria)) {
        logado = true;
        onLoginSuccess({ nome: 'Gestor', perfil: 'ADMIN' });
      }
    } else if (userClean === 'infosaude') {
      if (senha === 'salux2026' || (senhaTemporaria && senha === senhaTemporaria)) {
        logado = true;
        onLoginSuccess({ nome: 'Equipe InfoSaúde', perfil: 'Tecnico' });
      }
    }

    if (logado) {
      setTentativas(0);
      setBloqueado(false);
      setSenhaTemporaria('');
    } else {
      const novosErros = tentativas + 1;
      setTentativas(novosErros);
      
      if (novosErros >= MAX_TENTATIVAS) {
        setBloqueado(true);
        const novaTemp = Math.random().toString(36).substring(2, 8).toUpperCase();
        setSenhaTemporaria(novaTemp);
      } else {
        alert(`❌ Senha incorreta! Você tem mais ${MAX_TENTATIVAS - novosErros} tentativa(s).`);
      }
    }
  };

  const resetarTela = () => {
    setTentativas(0);
    setBloqueado(false);
    setSenha('');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020817', backgroundImage: 'radial-gradient(circle at top right, #0a1930, #020817)', fontFamily: 'inherit' }}>
      {/* 👇 CAIXA PRINCIPAL: Aumentei o width, padding e mudei a sombra 👇 */}
      <div style={{ background: 'white', padding: '60px 50px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 100px rgba(0, 76, 232, 0.1)', width: '480px', transition: 'all 0.3s' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '45px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '-15px 0 10px 0' }}>
            <img 
              src="/logo-onfield.png" 
              alt="ONFIELD" 
              style={{ width: '100%', maxWidth: '280px', objectFit: 'contain', transform: 'scale(1.4)' }} 
            />
          </div>
          
          <h2 style={{ color: '#0f172a', margin: '15px 0 8px 0', fontSize: '24px', fontWeight: '700' }}>Bem-vindo de volta!</h2>
          <p style={{ margin: 0, fontSize: '15px', color: '#64748b' }}>Faça login para acessar sua conta</p>
        </div>

        {bloqueado ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'center' }}>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '15px', borderRadius: '8px', color: '#b91c1c' }}>
              <ShieldAlert size={32} style={{ margin: '0 auto 10px auto' }} />
              <h4 style={{ margin: '0 0 5px 0' }}>Acesso Bloqueado</h4>
              <p style={{ margin: 0, fontSize: '12px' }}>Você excedeu o limite de tentativas.</p>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '15px', borderRadius: '8px', color: '#166534' }}>
              <CheckCircle2 size={24} style={{ margin: '0 auto 10px auto' }} />
              <p style={{ margin: '0 0 10px 0', fontSize: '12px' }}>Um alerta foi enviado ao Administrador.</p>
              <p style={{ margin: 0, fontSize: '11px', color: '#15803d' }}>Sua senha temporária para acesso é:</p>
              <div style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '3px', margin: '10px 0', color: '#16a34a', background: 'white', padding: '10px', borderRadius: '6px', border: '1px dashed #4ade80' }}>
                {senhaTemporaria}
              </div>
            </div>

            <button onClick={resetarTela} style={{ background: '#004ce8', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontFamily: 'inherit' }}>
              <LogIn size={18} /> Voltar para o Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>Usuário</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', backgroundColor: '#f8fafc', transition: 'border 0.2s, background-color 0.2s' }}>
                <User size={20} color="#64748b" style={{ marginRight: '12px' }} />
                <input 
                  type="text" 
                  placeholder="Digite seu usuário" 
                  value={usuario} 
                  onChange={e => setUsuario(e.target.value)} 
                  style={{ border: 'none', outline: 'none', width: '100%', backgroundColor: 'transparent', color: '#0f172a', fontSize: '15px', fontFamily: 'inherit' }} 
                  required 
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>Senha</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', backgroundColor: '#f8fafc', transition: 'border 0.2s, background-color 0.2s' }}>
                <Lock size={20} color="#64748b" style={{ marginRight: '12px' }} />
                <input 
                  type="password" 
                  placeholder="Digite sua senha" 
                  value={senha} 
                  onChange={e => setSenha(e.target.value)} 
                  style={{ border: 'none', outline: 'none', width: '100%', backgroundColor: 'transparent', color: '#0f172a', fontSize: '15px', fontFamily: 'inherit' }} 
                  required 
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', padding: '0 4px' }}>
               <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', cursor: 'pointer' }}>
                 <input type="checkbox" style={{ accentColor: '#004ce8', width: '16px', height: '16px' }} /> Lembrar-me
               </label>
               <span style={{ color: '#004ce8', fontWeight: '600', cursor: 'pointer' }}>Esqueci minha senha</span>
            </div>
            
            {tentativas > 0 && (
              <span style={{ fontSize: '13px', color: '#ef4444', textAlign: 'center', fontWeight: 'bold' }}>
                Tentativa {tentativas} de {MAX_TENTATIVAS}
              </span>
            )}

            <button type="submit" style={{ background: '#004ce8', color: 'white', border: 'none', padding: '16px', borderRadius: '10px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '10px', transition: 'background 0.2s, transform 0.1s', fontFamily: 'inherit', boxShadow: '0 4px 14px 0 rgba(0, 76, 232, 0.39)' }}>
              Entrar
            </button>
          </form>
        )}

      </div>
    </div>
  );
}