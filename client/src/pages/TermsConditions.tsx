import React from 'react';
import GlassCard from '../components/GlassCard';
import audioSynth from '../utils/audio';
import { ArrowLeft, BookOpen } from 'lucide-react';

interface TermsConditionsProps {
  onNavigate: (page: string) => void;
}

const TermsConditions: React.FC<TermsConditionsProps> = ({ onNavigate }) => {
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
            Terms Conditions
          </h2>
        </div>

        <GlassCard className="p-6 border-white/20 bg-white/10 dark:bg-black/35 shadow-xl text-xs sm:text-sm font-medium leading-relaxed space-y-4 text-slate-850 dark:text-slate-300">
          <div className="flex items-center gap-2 mb-2 text-indigo-500 font-extrabold text-sm border-b border-white/15 pb-2">
            <BookOpen size={18} />
            TERMS OF SERVICE AGREEMENTS
          </div>
          
          <p>
            By accessing Ludo Supreme game room services, you agree to comply with the rules outlined below.
          </p>
          
          <span className="font-extrabold text-slate-900 dark:text-white block mt-3">1. Account Eligibility</span>
          <p>
            Users must complete OTP mobile verification. Only one account per physical phone is permitted.
          </p>

          <span className="font-extrabold text-slate-900 dark:text-white block mt-3">2. Game Loop Conduct</span>
          <p>
            Any cheat injections, turn timeouts stalls, or intentional socket disconnections to dodge fees are strictly checked. Opponents get auto-defeats after 3 consecutive missed turn roll/move skips.
          </p>

          <span className="font-extrabold text-slate-900 dark:text-white block mt-3">3. Payout Withdrawals</span>
          <p>
            Winning balances can be cashed out after secure validation check reviews. Admin audits reserves rights to withhold funds pending security checks of match log replays.
          </p>
        </GlassCard>
      </div>

    </div>
  );
};

export default TermsConditions;
