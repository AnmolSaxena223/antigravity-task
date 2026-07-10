import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { authStart, authFailure, clearError } from '../store/authSlice';
import { apiRequest } from '../services/api';
import GlassCard from '../components/GlassCard';
import ThemeToggle from '../components/ThemeToggle';
import SoundToggle from '../components/SoundToggle';
import audioSynth from '../utils/audio';
import { User, Mail, Gift, Lock, ArrowRight, ShieldAlert } from 'lucide-react';

interface RegisterProps {
  onNavigate: (page: string, data?: any) => void;
}

const Register: React.FC<RegisterProps> = ({ onNavigate }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(() => {
    return localStorage.getItem('pendingReferralCode') || '';
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  React.useEffect(() => {
    dispatch(clearError());
    localStorage.removeItem('pendingReferralCode');
  }, [dispatch]);

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    audioSynth.playClick();
    setValidationError(null);
    dispatch(clearError());

    if (!name) {
      return setValidationError('Name is required.');
    }
    if (!email) {
      return setValidationError('Email address is required.');
    }
    if (!validateEmail(email)) {
      return setValidationError('Please enter a valid email address.');
    }
    if (!password) {
      return setValidationError('Password is required.');
    }
    if (password.length < 6) {
      return setValidationError('Password must be at least 6 characters long.');
    }

    dispatch(authStart());
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password,
        referralCode: referralCode || undefined
      })
    });

    if (response.success) {
      dispatch(clearError());
      onNavigate('otp-verification', { email, mode: 'register' });
    } else {
      dispatch(authFailure(response.message || 'Registration failed. Try again.'));
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <SoundToggle />
        <ThemeToggle />
      </div>

      <div className="absolute top-[20%] right-[15%] w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] left-[15%] w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      <GlassCard className="max-w-md w-full p-8 border-white/20 dark:bg-black/35 shadow-2xl relative overflow-hidden my-6">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500" />

        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold tracking-wide dark:text-white">
            Register Account
          </h2>
          <p className="text-sm text-slate-800 dark:text-slate-400 mt-1">
            Get 20 Bonus Coins instantly on verification
          </p>
        </div>

        {/* Display validation error */}
        {(error || validationError) && (
          <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-3 text-sm">
            <ShieldAlert size={20} className="shrink-0" />
            <span>{validationError || error}</span>
          </div>
        )}

        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold tracking-wider text-slate-700 dark:text-slate-300">
              FULL NAME *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800 dark:text-slate-400">
                <User size={16} />
              </span>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 glass-input py-2.5 text-sm"
                disabled={loading}
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold tracking-wider text-slate-700 dark:text-slate-300">
              EMAIL ADDRESS *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800 dark:text-slate-400">
                <Mail size={16} />
              </span>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 glass-input py-2.5 text-sm"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold tracking-wider text-slate-700 dark:text-slate-300">
              PASSWORD *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800 dark:text-slate-400">
                <Lock size={16} />
              </span>
              <input
                type="password"
                placeholder="Create password for fast logins"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 glass-input py-2.5 text-sm"
                disabled={loading}
              />
            </div>
          </div>

          {/* Referral Code */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold tracking-wider text-slate-700 dark:text-slate-300">
              INVITE REFERRAL CODE (OPTIONAL)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800 dark:text-slate-400">
                <Gift size={16} />
              </span>
              <input
                type="text"
                placeholder="Enter code for extra bonus"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="w-full pl-12 glass-input py-2.5 text-sm"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full glass-btn glass-btn-primary py-3 mt-4 rounded-xl text-sm"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Register & Verify OTP
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/10 text-center text-xs">
          <span className="text-slate-650 dark:text-slate-400">Already registered? </span>
          <button
            onClick={() => { audioSynth.playClick(); onNavigate('login'); }}
            className="text-indigo-500 font-bold hover:underline"
          >
            Login here
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

export default Register;
