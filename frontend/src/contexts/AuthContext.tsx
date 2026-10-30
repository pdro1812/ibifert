// frontend/src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../services/api';

// ─── Tipagens ─────────────────────────────────────────────────────────────────

interface User {
  id: string;
  nome: string;
  email: string;
  role: string;
}

export interface RegisterData {
  nome: string;
  email: string;
  senha: string;
  cidade: string;
  estado: string;
  telefone?: string;
}

interface AuthContextData {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, senha: string) => Promise<User>;
  cadastrar: (data: RegisterData) => Promise<User>;
  logout: () => Promise<void>;
  excluirConta: (senha: string) => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Re-hidratação: o token fica num cookie httpOnly (o JavaScript não o lê),
  // então pergunta ao backend quem é o usuário da sessão atual.
  useEffect(() => {
    api.get<{ usuario: User }>('/auth/me')
      .then((response) => setUser(response.data.usuario))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  // ─── Funções de Autenticação ────────────────────────────────────────────────

  const login = async (email: string, senha: string) => {
    // O backend grava o cookie de sessão na resposta
    const response = await api.post<{ usuario: User }>('/auth/login', { email, senha });
    setUser(response.data.usuario);
    return response.data.usuario;
  };

  const cadastrar = async (data: RegisterData) => {
    // O cadastro já deixa o usuário logado (cookie de sessão na resposta)
    const response = await api.post<{ usuario: User }>('/auth/register', data);
    setUser(response.data.usuario);
    return response.data.usuario;
  };

  const logout = async () => {
    setUser(null);
    try {
      await api.post('/auth/logout');
    } catch {
      // sem conexão: o cookie expira sozinho; o estado local já foi limpo
    }
  };

  const excluirConta = async (senha: string) => {
    await api.delete('/auth/conta', { data: { senha } });
    setUser(null);
  };

  // ─── Retorno do Provider ────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        login,
        cadastrar,
        logout,
        excluirConta,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook Customizado ─────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return context;
}
