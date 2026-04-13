/**
 * LoginPage — Split-screen editorial welcome.
 *
 * Left panel: warm teal brand panel with headline + trust signals.
 * Right panel: auth form on cream background.
 *
 * Fills the viewport confidently — no floating empty space.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, Shield, BarChart3, MessageCircle, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { BreathingDot } from '../components/ui/BreathingCircle'

type Tab = 'login' | 'register'

export function LoginPage() {
  const { login, register } = useAuth()
  const [tab, setTab] = useState<Tab>('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [clinicianCode, setClinicianCode] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'patient' | 'clinician'>('patient')
  const [inviteCode, setInviteCode] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'login') {
        await login({ email, password })
      } else {
        const result = await register({
          email, password, full_name: fullName, role,
          clinician_code: inviteCode || undefined,
        })
        if (result.user.clinician_code) {
          setClinicianCode(result.user.clinician_code)
        }
      }
    } catch (err: unknown) {
      const e = err instanceof Object ? err as Record<string, unknown> : {}
      setError((e.detail as string) || (e.message as string) || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Clinician code display
  if (clinicianCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background geo-pattern p-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md card-warm p-10 text-center"
        >
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-display text-2xl text-foreground mb-3">Your Clinician Code</h2>
          <p className="text-muted-foreground font-body mb-6 leading-relaxed">
            Share this code with your patients so they can connect with you during registration.
          </p>
          <div className="bg-primary/5 border border-primary/15 rounded-xl py-5 px-8 mb-6">
            <span className="text-4xl font-mono font-bold tracking-[0.4em] text-primary">
              {clinicianCode}
            </span>
          </div>
          <button onClick={() => setClinicianCode(null)} className="btn-primary w-full text-base py-3">
            Continue to Dashboard
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel — Brand + trust signals */}
      <motion.div
        className="lg:w-[55%] bg-gradient-to-br from-[hsl(175,45%,28%)] to-[hsl(175,40%,22%)] text-white p-10 lg:p-20 xl:p-24 flex flex-col justify-between relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Subtle geometric overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        {/* Logo + headline */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-display tracking-[0.15em] text-white/90">DepScreen</span>
          </div>

          <h1 className="font-display text-5xl lg:text-6xl xl:text-7xl leading-[1.2] mb-8 font-light" style={{ letterSpacing: '0.03em', wordSpacing: '0.08em' }}>
            Mind spaces,<br />
            gently measured.
          </h1>
          <p className="text-white/70 font-body text-lg lg:text-xl leading-relaxed tracking-normal max-w-2xl">
            A supportive screening companion that helps you and your clinician
            understand your mental health — at your own pace, on your own terms.
          </p>
        </div>

        {/* Trust signals */}
        <div className="relative z-10 mt-12 lg:mt-0">
          <div className="grid grid-cols-2 gap-4 max-w-md">
            {[
              { icon: Shield, text: 'Clinically grounded in DSM-5 criteria' },
              { icon: BarChart3, text: 'Track your progress over time' },
              { icon: MessageCircle, text: 'AI-powered support between sessions' },
              { icon: Clock, text: 'Screen anytime, anywhere' },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
              >
                <item.icon className="w-4 h-4 text-white/50 mt-0.5 shrink-0" />
                <span className="text-sm text-white/60 font-body leading-snug">{item.text}</span>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-8">
            <BreathingDot className="bg-white/40" />
            <span className="text-xs text-white/40 font-body">
              Confidential · Evidence-based · Always here
            </span>
          </div>
        </div>
      </motion.div>

      {/* Right panel — Form */}
      <div className="lg:w-[48%] bg-background flex flex-col">
        {/* Safety banner */}
        <div className="safety-banner">
          Screening tool only — not a diagnostic instrument. In Bahrain, call <strong>999</strong> for emergencies.
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <motion.div
            className="w-full max-w-[420px]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Tabs */}
            <div className="flex mb-8 bg-muted rounded-xl p-1.5">
              <button
                onClick={() => { setTab('login'); setError('') }}
                className={`flex-1 py-2.5 text-sm font-medium font-body rounded-lg transition-all duration-200 ${
                  tab === 'login' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setTab('register'); setError('') }}
                className={`flex-1 py-2.5 text-sm font-medium font-body rounded-lg transition-all duration-200 ${
                  tab === 'register' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-body"
              >
                {error}
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {tab === 'register' && (
                <>
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium mb-2 text-foreground font-body">
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      type="text" required className="input py-3"
                      placeholder="Your full name"
                      value={fullName} onChange={e => setFullName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground font-body">I am a</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['patient', 'clinician'] as const).map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`py-3.5 rounded-xl border text-sm text-center transition-all duration-200 capitalize font-body ${
                            role === r
                              ? 'border-primary bg-primary/5 text-primary font-medium shadow-sm'
                              : 'border-border text-muted-foreground hover:border-primary/30'
                          }`}
                        >
                          {r === 'patient' ? 'Patient' : 'Clinical Professional'}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2 text-foreground font-body">
                  Email
                </label>
                <input
                  id="email"
                  type="email" required className="input py-3"
                  placeholder="you@email.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2 text-foreground font-body">
                  Password
                </label>
                <input
                  id="password"
                  type="password" required className="input py-3"
                  placeholder={tab === 'register' ? 'Min 8 characters' : '••••••••'}
                  minLength={tab === 'register' ? 8 : undefined}
                  value={password} onChange={e => setPassword(e.target.value)}
                />
              </div>

              {tab === 'register' && role === 'patient' && (
                <div>
                  <label htmlFor="inviteCode" className="block text-sm font-medium mb-2 text-foreground font-body">
                    Clinician Code{' '}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <input
                    id="inviteCode"
                    type="text" className="input py-3 font-mono tracking-[0.25em] uppercase text-center"
                    placeholder="ABC123"
                    maxLength={6}
                    value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  />
                  <p className="text-xs text-muted-foreground mt-2 font-body leading-relaxed">
                    Your therapist will provide this code to link your accounts.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-base mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <BreathingDot />
                    {tab === 'login' ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : (
                  tab === 'login' ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>

            {/* Crisis resource */}
            <p className="text-xs text-muted-foreground text-center mt-8 leading-relaxed font-body">
              If you're in crisis, call{' '}
              <strong className="text-foreground">999</strong>{' '}
              or contact Shamsaha at{' '}
              <strong className="text-foreground whitespace-nowrap">17651421</strong>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
