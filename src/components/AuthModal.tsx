import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { X, Mail, KeyRound, Loader2, User as UserIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthView = 'main' | 'magic-link' | 'magic-link-sent' | 'login-password' | 'signup-password';

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signInWithGoogle, signInWithMagicLink, signInWithPassword, signUpWithPassword } = useAuth();
  
  const [view, setView] = useState<AuthView>('main');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleError = (err: any, defaultMsg: string) => {
    let msg = err?.message || (typeof err === 'string' ? err : defaultMsg);
    if (msg === '{}' || msg === '[]' || msg.includes('{}')) {
      msg = 'Email provider error. Please check your Supabase SMTP/Resend settings.';
    }
    setError(msg);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithMagicLink(email);
      setView('magic-link-sent');
    } catch (err: any) {
      handleError(err, 'Failed to send magic link.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithPassword(username, password);
      onClose();
    } catch (err: any) {
      handleError(err, 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      setError('Only @gmail.com accounts are allowed');
      setLoading(false);
      return;
    }

    try {
      await signUpWithPassword(email, password, username);
      // Depending on if email confirmation is required, we might close or show magic-link-sent
      onClose();
    } catch (err: any) {
      handleError(err, 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  };


  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      handleError(err, 'Google sign-in failed.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur-xl border border-white/20"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {error && (
              <div className="mb-6 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                {error}
              </div>
            )}

            {view === 'main' && (
              <div className="space-y-4">
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-tech font-bold text-white mb-2">Welcome to Auralis</h2>
                  <p className="text-sm text-zinc-400">Sign in or create an account</p>
                </div>
                
                <button
                  onClick={() => setView('login-password')}
                  className="w-full rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] py-3 text-black font-semibold hover:opacity-90 transition-opacity"
                >
                  Sign in with Email & Password
                </button>
                
                <button
                  onClick={() => setView('signup-password')}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-white font-semibold hover:bg-white/10 transition-colors"
                >
                  Create Account
                </button>

                                <button
                  onClick={() => setView('magic-link')}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-white font-semibold hover:bg-white/10 transition-colors"
                >
                  Sign in with Magic Link
                </button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#1a2332] px-2 text-zinc-500 rounded-full">Or continue with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-white hover:bg-white/10 transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                  Google
                </button>

              </div>
            )}

            {view === 'magic-link' && (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-tech font-bold text-white mb-2">Magic Link</h2>
                  <p className="text-sm text-zinc-400">We'll send a magic link to your email</p>
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-white placeholder:text-zinc-500 focus:border-[#D4AF37]/50 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] py-3 text-black font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send Link
                </button>
                <button
                  type="button"
                  onClick={() => setView('main')}
                  className="w-full text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Back
                </button>
              </form>
            )}

            {view === 'magic-link-sent' && (
              <div className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-[#D4AF37]/20 rounded-full flex items-center justify-center border border-[#D4AF37]/50">
                  <Mail className="w-8 h-8 text-[#D4AF37]" />
                </div>
                <div>
                  <h2 className="text-2xl font-tech font-bold text-white mb-2">Check your email</h2>
                  <p className="text-sm text-zinc-400">
                    We sent a sign in link to {email}. Follow the link to access your account.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setView('main')}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-white font-semibold hover:bg-white/10 transition-colors"
                >
                  Back to login
                </button>
              </div>
            )}

            {view === 'login-password' && (
              <form onSubmit={handleLoginWithPassword} className="space-y-4">
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-tech font-bold text-white mb-2">Sign In</h2>
                  <p className="text-sm text-zinc-400">Welcome back</p>
                </div>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username or Email"
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-white placeholder:text-zinc-500 focus:border-[#D4AF37]/50 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all"
                  />
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-white placeholder:text-zinc-500 focus:border-[#D4AF37]/50 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] py-3 text-black font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setView('main')}
                  className="w-full text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Back
                </button>
              </form>
            )}

            {view === 'signup-password' && (
              <form onSubmit={handleSignupWithPassword} className="space-y-4">
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-tech font-bold text-white mb-2">Create Account</h2>
                  <p className="text-sm text-zinc-400">Join Auralis today</p>
                </div>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-white placeholder:text-zinc-500 focus:border-[#D4AF37]/50 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Gmail address (@gmail.com)"
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-white placeholder:text-zinc-500 focus:border-[#D4AF37]/50 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all"
                  />
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-white placeholder:text-zinc-500 focus:border-[#D4AF37]/50 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] py-3 text-black font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => setView('main')}
                  className="w-full text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Back
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
