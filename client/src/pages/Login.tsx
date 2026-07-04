import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { authStart, authSuccess, authFailure, clearError } from '../store/authSlice';
import { apiRequest } from '../services/api';
import GlassCard from '../components/GlassCard';
import ThemeToggle from '../components/ThemeToggle';
import SoundToggle from '../components/SoundToggle';
import audioSynth from '../utils/audio';
import { Phone, Lock, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

interface LoginProps {
  onNavigate: (page: string, data?: any) => void;
}

const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  React.useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('otp');
  const [validationError, setValidationError] = useState<string | null>(null);

  const validatePhone = (num: string) => {
    return /^\d{10,12}$/.test(num);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    audioSynth.playClick();
    setValidationError(null);
    dispatch(clearError());

    if (!phone) {
      return setValidationError('Phone number is required.');
    }
    if (!validatePhone(phone)) {
      return setValidationError('Please enter a valid phone number (10-12 digits).');
    }

    if (loginMethod === 'password') {
      if (!password) {
        return setValidationError('Password is required.');
      }
      
      // Dispatch API password login
      dispatch(authStart());
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password })
      });

      if (response.success && response.accessToken && response.user) {
        dispatch(authSuccess({ user: response.user, token: response.accessToken }));
        onNavigate('home');
      } else {
        dispatch(authFailure(response.message || 'Login failed. Check your password.'));
      }
    } else {
      // OTP Method: request OTP and redirect to OTP Verify screen
      dispatch(authStart());
      const response = await apiRequest('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone })
      });

      if (response.success) {
        dispatch(clearError()); // Clear login loading state
        onNavigate('otp-verification', { phone, mode: 'login' });
      } else {
        dispatch(authFailure(response.message || 'Failed to send OTP.'));
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      
      {/* Settings control buttons in upper corners */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <SoundToggle />
        <ThemeToggle />
      </div>

      {/* Decorative glows */}
      <div className="absolute top-[25%] left-[20%] w-60 h-60 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[25%] right-[20%] w-60 h-60 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />

      <GlassCard className="max-w-md w-full p-8 border-white/20 dark:bg-black/35 shadow-2xl relative overflow-hidden">
        
        {/* Aesthetic highlight bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 mb-3 animate-float">
            <Sparkles size={28} />
          </div>
          <h2 className="text-2xl font-extrabold tracking-wide dark:text-white">
            Welcome Arena
          </h2>
          <p className="text-sm text-slate-800 dark:text-slate-400 mt-1">
            Sign in to start matching & winning cash
          </p>
        </div>

        {/* Display Error Message Alerts */}
        {(error || validationError) && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-3 text-sm animate-pulse-slow">
            <ShieldAlert size={20} className="shrink-0" />
            <span>{validationError || error}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-5">
          {/* Phone Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              PHONE NUMBER
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800 dark:text-slate-400">
                <Phone size={18} />
              </span>
              <input
                type="tel"
                placeholder="Enter 10-digit phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-12 glass-input"
                maxLength={12}
                disabled={loading}
              />
            </div>
          </div>

          {/* Toggle Login Method tab style */}
          <div className="flex bg-white/5 dark:bg-black/20 p-1.5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => { audioSynth.playClick(); setLoginMethod('otp'); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginMethod === 'otp' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700 dark:text-slate-400 hover:bg-white/5'}`}
            >
              OTP Secure Login
            </button>
            <button
              type="button"
              onClick={() => { audioSynth.playClick(); setLoginMethod('password'); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginMethod === 'password' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700 dark:text-slate-400 hover:bg-white/5'}`}
            >
              Password Login
            </button>
          </div>

          {/* Password Field (Conditional) */}
          {loginMethod === 'password' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                PASSWORD
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800 dark:text-slate-400">
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  placeholder="Enter account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 glass-input"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full glass-btn glass-btn-primary py-3.5 mt-2 rounded-xl text-sm"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {loginMethod === 'otp' ? 'Request Secure OTP' : 'Sign In Account'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer links */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs">
          <span className="text-slate-650 dark:text-slate-400">Don't have an account yet? </span>
          <button
            onClick={() => { audioSynth.playClick(); onNavigate('register'); }}
            className="text-indigo-500 font-bold hover:underline"
          >
            Register Arena
          </button>
        </div>

      </GlassCard>
    </div>
  );
};

export default Login;
