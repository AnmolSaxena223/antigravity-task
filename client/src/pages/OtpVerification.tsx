import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { authStart, authSuccess, authFailure, clearError } from '../store/authSlice';
import { apiRequest } from '../services/api';
import GlassCard from '../components/GlassCard';
import ThemeToggle from '../components/ThemeToggle';
import SoundToggle from '../components/SoundToggle';
import audioSynth from '../utils/audio';
import { KeyRound, ArrowRight, ShieldAlert, Timer } from 'lucide-react';

interface OtpVerificationProps {
  data: { email: string; mode: string }; // Email and mode ('login' or 'register')
  onNavigate: (page: string, data?: any) => void;
}

const OtpVerification: React.FC<OtpVerificationProps> = ({ data, onNavigate }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  
  const email = data?.email || '';
  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [validationError, setValidationError] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Clear any stuck error/loading states and auto-focus first box on mount
  useEffect(() => {
    dispatch(clearError());
    // Use a tiny timeout to ensure DOM is fully painted and focus works reliably
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [dispatch]);

  // Count down timer for resend SMS cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleInputChange = (value: string, index: number) => {
    // Keep only numbers
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue) {
      const newOtp = [...otpArray];
      newOtp[index] = '';
      setOtpArray(newOtp);
      return;
    }

    const newOtp = [...otpArray];
    newOtp[index] = cleanValue.slice(-1);
    setOtpArray(newOtp);

    // Auto-focus next input
    if (index < 5 && cleanValue) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // Handle backspace back-focus
    if (e.key === 'Backspace') {
      if (!otpArray[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const cleanData = pastedData.replace(/\D/g, '').slice(0, 6);
    if (!cleanData) return;

    const newOtp = [...otpArray];
    for (let i = 0; i < 6; i++) {
      if (i < cleanData.length) {
        newOtp[i] = cleanData[i];
      }
    }
    setOtpArray(newOtp);

    // Focus the box matching the length of the pasted data, up to the last box
    const focusIndex = Math.min(cleanData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    audioSynth.playClick();
    setValidationError(null);
    dispatch(clearError());

    const otpCode = otpArray.join('');
    if (otpCode.length !== 6) {
      return setValidationError('Please enter all 6 digits of the OTP.');
    }

    dispatch(authStart());
    const response = await apiRequest('/auth/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp: otpCode })
    });

    if (response.success && response.accessToken && response.user) {
      dispatch(authSuccess({ user: response.user, token: response.accessToken }));
      audioSynth.playWinningFanfare();
      onNavigate('home');
    } else {
      dispatch(authFailure(response.message || 'OTP verification failed. Check the code.'));
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    audioSynth.playClick();
    dispatch(clearError());
    setValidationError(null);
    setOtpArray(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();

    const response = await apiRequest('/auth/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email })
    });

    if (response.success) {
      setResendCooldown(30);
    } else {
      setValidationError(response.message || 'Failed to resend OTP.');
    }
  };

  const isOtpComplete = otpArray.join('').length === 6;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <SoundToggle />
        <ThemeToggle />
      </div>

      <div className="absolute top-[25%] left-[25%] w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <GlassCard className="max-w-md w-full p-8 border-white/20 dark:bg-black/35 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 to-indigo-600" />

        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 mb-3">
            <KeyRound size={28} />
          </div>
          <h2 className="text-2xl font-extrabold tracking-wide dark:text-white">
            Verify Email
          </h2>
          <p className="text-sm text-slate-800 dark:text-slate-400 mt-1.5">
            We sent a secure code to <span className="font-bold text-indigo-500">{email}</span>
          </p>
        </div>

        {/* Console OTP hint warning to ease local check */}
        <div className="mb-5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-600 dark:text-indigo-400 text-center font-bold">
          💡 For local testing, check your terminal console where the OTP is printed!
        </div>

        {/* Display validation error */}
        {(error || validationError) && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-3 text-sm">
            <ShieldAlert size={20} className="shrink-0" />
            <span>{validationError || error}</span>
          </div>
        )}

        <form onSubmit={handleVerifySubmit} className="space-y-6">
          
          {/* OTP Number Cells Grid */}
          <div className="flex justify-between gap-2 max-w-xs mx-auto">
            {otpArray.map((digit, idx) => (
              <input
                key={idx}
                type="text"
                ref={(el) => { inputRefs.current[idx] = el; }}
                value={digit}
                onChange={(e) => handleInputChange(e.target.value, idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                onPaste={handlePaste}
                className="w-10 h-12 sm:w-12 sm:h-14 text-center font-bold text-lg sm:text-xl glass-input px-0 focus:ring-indigo-500/30"
                maxLength={6}
                pattern="\d*"
                inputMode="numeric"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !isOtpComplete}
            className="w-full glass-btn glass-btn-primary py-3.5 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Confirm Verification
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Resend actions timer */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center flex flex-col items-center gap-2">
          {resendCooldown > 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-400 font-semibold">
              <Timer size={14} className="animate-spin text-indigo-500" />
              <span>Resend code in {resendCooldown} seconds</span>
            </div>
          ) : (
            <button
              onClick={handleResendOtp}
              className="text-indigo-500 hover:text-indigo-400 font-extrabold text-sm hover:underline"
            >
              Resend OTP
            </button>
          )}

          <button
            onClick={() => { audioSynth.playClick(); onNavigate('login'); }}
            className="text-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs hover:underline mt-2"
          >
            ← Back to Login
          </button>
        </div>

      </GlassCard>
    </div>
  );
};

export default OtpVerification;
