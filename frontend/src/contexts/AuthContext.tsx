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

interface AuthContextData {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Re-hidratação: Busca o usuário e token do localStorage ao carregar a página
  useEffect(() => {
    const loadStorageData = () => {
      const storedToken = localStorage.getItem('@ibiferti:token');
      const storedUser = localStorage.getItem('@ibiferti:user');

      if (storedToken && storedUser) {
        setUser(JSON.parse(storedUser));
      }
      
      // O interceptor do axios em api.ts já vai pegar o token do localStorage
      // automaticamente para as próximas requisições.
      
      setIsLoading(false);
    };

    loadStorageData();
  }, []);

  // ─── Funções de Autenticação ────────────────────────────────────────────────

  const login = async (email: string, senha: string) => {
    // A rota /api/auth/login foi a que criamos no backend Express
    const response = await api.post('/auth/login', { email, senha });

    const { token, usuario } = response.data;

    // Salva os dados no navegador
    localStorage.setItem('@ibiferti:token', token);
    localStorage.setItem('@ibiferti:user', JSON.stringify(usuario));

    // Atualiza o estado global da aplicação
    setUser(usuario);
  };

  const logout = () => {
    // Limpa o navegador e o estado
    localStorage.removeItem('@ibiferti:token');
    localStorage.removeItem('@ibiferti:user');
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
        logout,
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