import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import GlassCard from '../components/GlassCard';
import audioSynth from '../utils/audio';
import { ArrowLeft, Gift, Share2, Copy, Check, Info, Users } from 'lucide-react';

interface ReferralProps {
  onNavigate: (page: string) => void;
}

const Referral: React.FC<ReferralProps> = ({ onNavigate }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const copyCode = () => {
    audioSynth.playClick();
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    audioSynth.playClick();
    const shareText = `Play Ludo Supreme with me, win real cash! Register using my code ${user.referralCode} and get 20 Coins welcome bonus instantly. Join the Arena now!`;
    if (navigator.share) {
      navigator.share({
        title: 'Ludo Supreme Invitation',
        text: shareText,
        url: window.location.origin
      }).catch(console.error);
    } else {
      // Fallback: copy share message
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-2xl mx-auto relative flex flex-col justify-between">
      <div className="absolute top-[10%] left-[25%] w-60 h-60 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />

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
            Refer & Earn
          </h2>
        </div>

        {/* Hero banner */}
        <GlassCard className="p-6 bg-gradient-to-r from-pink-500/20 to-purple-600/20 border-pink-500/25 shadow-xl text-center space-y-4 mb-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-white/5 pointer-events-none" />
          <div className="inline-flex p-3 rounded-full bg-pink-500/10 text-pink-500 border border-pink-500/20 animate-float">
            <Gift size={32} />
          </div>
          <div>
            <h3 className="text-lg font-black dark:text-white">GET ₹30 BONUS COINS</h3>
            <p className="text-xs text-slate-850 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              Invite friends to the Arena. You get ₹30 and they get ₹20 instantly upon verified OTP registration!
            </p>
          </div>
        </GlassCard>

        {/* Share actions */}
        <GlassCard className="p-6 border-white/20 bg-white/10 dark:bg-black/35 shadow-lg space-y-5 mb-6">
          <div className="flex flex-col gap-1 text-center">
            <span className="text-[10px] font-bold text-slate-850 dark:text-slate-400 tracking-wider uppercase">
              YOUR PERSONAL INVITE CODE
            </span>
            
            <div className="flex items-center justify-between p-3.5 bg-white/10 dark:bg-black/40 border border-white/20 dark:border-white/15 rounded-2xl max-w-sm w-full mx-auto shadow-inner mt-2">
              <span className="text-2xl font-black tracking-wider text-slate-900 dark:text-white uppercase pl-2">
                {user.referralCode}
              </span>
              <button
                onClick={copyCode}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <button
            onClick={handleShare}
            className="w-full glass-btn bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white py-3 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/20"
          >
            <Share2 size={16} />
            Share Invitation Message
          </button>
        </GlassCard>

        {/* T&C Info Block */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-400 flex gap-3 leading-relaxed mb-6">
          <Info size={24} className="text-indigo-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-extrabold text-slate-900 dark:text-white block">Referral Terms:</span>
            <p>1. Referral codes must be typed during signup. Retroactive mapping is not supported.</p>
            <p>2. Bonus coins can be used as entry fees for multiplayer arenas but cannot be cashed out directly.</p>
          </div>
        </div>

        {/* Invited Logs summary */}
        <GlassCard className="p-4 bg-white/5 dark:bg-black/25 border-white/10 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-400">
          <span className="flex items-center gap-1.5"><Users size={16} className="text-pink-500" /> Invited Sign-ups count:</span>
          <span className="text-sm font-black dark:text-slate-200">{user.referralsCount} Verified</span>
        </GlassCard>

      </div>

    </div>
  );
};

export default Referral;
