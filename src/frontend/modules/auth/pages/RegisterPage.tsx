import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Rocket, Terminal } from 'lucide-react';
import { useAuthStore } from '../auth.store';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { api } from '../../../lib/api';
import { getAppOrigin } from '../../../lib/url';

const launchSteps = [
  'Create your first project automatically',
  'Issue a ready-to-copy API key',
  'Seed a sample endpoint for testing',
  'Track requests, billing and activation',
];

function getOnboardingPayload(payload: any) {
  if (payload.onboarding) {
    return payload.onboarding;
  }

  if (payload.project && payload.apiKey) {
    return {
      project: payload.project,
      apiKey: payload.apiKey,
      apiKeyMasked: payload.apiKey,
      endpointPath: '/public/sample_items',
      apiKeyHeader: 'x-api-key',
    };
  }

  return null;
}

export function RegisterPage() {
  const [name, setName] = useState('Usuario Teste');
  const [email, setEmail] = useState('teste@backforge.local');
  const [password, setPassword] = useState('12345678');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const appOrigin = getAppOrigin();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { user, accessToken } = response.data;
      const onboarding = getOnboardingPayload(response.data);
      setAuth(user, accessToken, onboarding);
      navigate('/overview');
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.20),_transparent_28%),linear-gradient(180deg,_#140c08_0%,_#1b110c_44%,_#0e0907_100%)] text-orange-50">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-400/60 bg-orange-500 text-sm font-bold text-[#1f1108] shadow-[0_12px_30px_rgba(249,115,22,0.35)]">B</div>
          <div>
            <div className="text-sm font-semibold tracking-[0.24em] text-orange-200">BACKFORGE</div>
            <div className="text-xs text-orange-100/70">Backend-as-a-Service for SaaS builders</div>
          </div>
        </Link>

        <Button variant="outline" asChild>
          <Link to="/login">Login</Link>
        </Button>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-8 lg:grid-cols-[minmax(0,1.08fr)_420px] lg:items-center">
        <section className="space-y-7">
          <div className="inline-flex items-center rounded-full border border-orange-400/35 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-orange-200 shadow-sm">
            Launch Today
          </div>

          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight text-orange-50 text-balance">
              Build your backend in seconds.
              <br />
              No setup. No complexity.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-orange-100/80">
              Sign up and BACKFORGE creates the starter project, first API key, sample endpoint and activation dashboard for you.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {launchSteps.map((step) => (
              <div key={step} className="flex items-center gap-3 rounded-2xl border border-orange-400/25 bg-orange-500/8 px-4 py-4 text-sm font-medium text-orange-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/18 text-orange-300">
                  <Check className="h-4 w-4" />
                </div>
                {step}
              </div>
            ))}
          </div>

          <Card className="border-orange-400/35 bg-[#130c09] text-orange-50 shadow-[0_24px_60px_rgba(0,0,0,0.38)]">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-300/80">
                <Terminal className="h-4 w-4 text-orange-400" />
                First request
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all text-sm leading-7">
                <code>{`curl -H "x-api-key: YOUR_KEY" ${appOrigin}/public/sample_items`}</code>
              </pre>
            </CardContent>
          </Card>
        </section>

        <Card className="overflow-hidden border-orange-400/35 bg-[#1a110d]/95 text-orange-50 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
          <CardHeader className="space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/18 text-orange-300">
              <Rocket className="h-6 w-6" />
            </div>
            <CardTitle className="text-3xl">Create account</CardTitle>
            <CardDescription className="text-orange-100/70">
              Local demo fields are already filled in.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error ? (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
                  {error}
                </div>
              ) : null}

              <div className="space-y-2">
                <label className="text-sm font-medium text-orange-50">Full name</label>
                <Input value={name} onChange={(event) => setName(event.target.value)} required />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-orange-50">Email</label>
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-orange-50">Password</label>
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>

              <Button className="w-full gap-2" type="submit" disabled={loading}>
                {loading ? 'Creating workspace...' : 'Start for free'}
                <ArrowRight className="h-4 w-4" />
              </Button>

              <p className="text-center text-sm text-orange-100/70">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-orange-300 hover:underline">
                  Login
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
