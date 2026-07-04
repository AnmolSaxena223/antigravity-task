import React from 'react';
import GlassCard from '../components/GlassCard';
import audioSynth from '../utils/audio';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

interface PrivacyPolicyProps {
  onNavigate: (page: string) => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-2xl mx-auto relative flex flex-col justify-between">
      <div className="absolute top-[10%] left-[20%] w-60 h-60 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => { audioSynth.playClick(); onNavigate('home'); }}
            className="p-2.5 rounded-xl bg-white/10 dark:bg-black/20 hover:bg-white/20 dark:hover:bg-black/35 border border-white/20 dark:border-white/10 text-slate-800 dark:text-white transition-all active:scale-95 shadow"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-extrabold tracking-wide dark:text-white">
            Privacy Policy
          </h2>
        </div>

        <GlassCard className="p-6 border-white/20 bg-white/10 dark:bg-black/35 shadow-xl text-xs sm:text-sm font-medium leading-relaxed space-y-4 text-slate-850 dark:text-slate-300">
          <div className="flex items-center gap-2 mb-2 text-indigo-500 font-extrabold text-sm border-b border-white/15 pb-2">
            <ShieldAlert size={18} />
            DATA PRIVACY & COOKIE SECURE POLICIES
          </div>
          
          <p>
            Welcome to Ludo Supreme. We respect your privacy and are committed to protecting your personal data.
          </p>
          
          <span className="font-extrabold text-slate-900 dark:text-white block mt-3">1. Information We Collect</span>
          <p>
            We collect your phone number to authenticate sessions. Financial data processed through payment gateway webhooks is validated cryptographically.
          </p>

          <span className="font-extrabold text-slate-900 dark:text-white block mt-3">2. How We Use Cookies</span>
          <p>
            We store secure JWT HTTPOnly cookies (refreshToken) on your device to maintain your authorization state securely.
          </p>

          <span className="font-extrabold text-slate-900 dark:text-white block mt-3">3. Data Security</span>
          <p>
            All connection exchanges, game state roll histories, and wallet updates are encrypted with 256-bit SSL tunnels to prevent NoSQL injection and XSS exploits.
          </p>
        </GlassCard>
      </div>

    </div>
  );
};

export default PrivacyPolicy;
