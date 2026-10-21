import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  BarChart3,
  CalendarDays,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Loader2,
  Lock,
  Mail,
  Music,
  ShieldCheck,
  TreePine,
} from 'lucide-react';

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha inválidos. Verifique os dados e tente novamente.',
  'auth/invalid-login-credentials': 'E-mail ou senha inválidos. Verifique os dados e tente novamente.',
  'auth/invalid-email': 'Endereço de e-mail inválido.',
  'auth/user-not-found': 'Usuário não encontrado.',
  'auth/wrong-password': 'Senha incorreta.',
  'auth/user-disabled': 'Usuário desativado. Contate o administrador.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'auth/network-request-failed': 'Falha de rede. Verifique sua conexão.',
  'auth/operation-not-allowed': 'Login por e-mail e senha não está habilitado. Contate o administrador.',
  'auth/missing-password': 'Informe sua senha.',
};

const FEATURES = [
  {
    icon: CalendarDays,
    title: 'Agendamentos por cliente',
    description: 'Organize múltiplos períodos de veiculação com datas, playlists e tipo de transmissão.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard em tempo real',
    description: 'Acompanhe validades, veiculações ativas e novos agendamentos da semana.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Gestão semanal e relatórios',
    description: 'Trate pendências da semana e exporte os dados em Excel ou CSV.',
  },
];

const getErrorCode = (error: unknown) => {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code: unknown }).code);
  }

  return '';
};

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      const code = getErrorCode(err);
      setError(LOGIN_ERROR_MESSAGES[code] ?? 'Falha no login. Verifique seu e-mail e senha.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Painel informativo da aplicação */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-900 to-green-950 p-12 lg:flex xl:w-[55%]">
        {/* Elementos decorativos de fundo */}
        <div className="absolute -right-24 top-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" aria-hidden="true" />
        <div className="absolute right-1/3 top-1/2 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <TreePine
          className="absolute -right-8 bottom-0 h-80 w-80 text-white/5"
          strokeWidth={1}
          aria-hidden="true"
        />

        <div className="relative z-10 flex items-center space-x-3">
          <div className="rounded-xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur">
            <Music className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">
              Agendador Natalinas
            </h2>
            <p className="text-sm text-white/70">Gestão de playlists sazonais</p>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold leading-tight text-white xl:text-4xl">
              Agendamento e gestão
              <br />
              de playlists natalinas
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-white/70">
              Centralize períodos de veiculação, acompanhe o status dos clientes e mantenha
              a operação da temporada organizada em um só lugar.
            </p>
          </div>

          <div className="space-y-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-start space-x-3">
                <div className="mt-0.5 shrink-0 rounded-lg bg-white/15 p-1.5 backdrop-blur">
                  <feature.icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{feature.title}</p>
                  <p className="text-sm text-white/70">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-white/60">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <p className="text-xs">Acesso restrito a usuários autorizados</p>
        </div>
      </aside>

      {/* Formulário de acesso */}
      <main className="relative flex w-full flex-col items-center justify-center px-6 py-12 sm:px-12 lg:w-1/2 xl:w-[45%]">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm space-y-6">
          {/* Identidade visual no mobile, onde o painel lateral não aparece */}
          <div className="flex flex-col items-center space-y-3 text-center lg:hidden">
            <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-2.5 ring-1 ring-primary/10">
              <Music className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Agendador Natalinas
              </h1>
              <p className="text-sm text-muted-foreground">Gestão de playlists sazonais</p>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Entrar na sua conta
            </h2>
            <p className="text-sm text-muted-foreground">
              Use suas credenciais para acessar o painel.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm font-medium text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-christmas shadow-christmas"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="flex items-center justify-center gap-1.5 text-muted-foreground lg:hidden">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <p className="text-xs">Acesso restrito a usuários autorizados</p>
          </div>
        </div>
      </main>
    </div>
  );
};
