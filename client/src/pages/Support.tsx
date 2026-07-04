import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import GlassCard from '../components/GlassCard';
import audioSynth from '../utils/audio';
import { ArrowLeft, HelpCircle, Mail, PhoneCall, Send, CheckCircle2 } from 'lucide-react';

interface SupportProps {
  onNavigate: (page: string) => void;
}

const Support: React.FC<SupportProps> = ({ onNavigate }) => {
  const user = useSelector((state: RootState) => state.auth.user);

  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    audioSynth.playClick();
    setLoading(true);

    // Mock sending ticket
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setSubject('');
      setMessage('');
      setTimeout(() => setSuccess(false), 4000);
    }, 1500);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-xl mx-auto relative flex flex-col justify-between">
      <div className="absolute top-[10%] left-[20%] w-60 h-60 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

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
            Help Support Desk
          </h2>
        </div>

        {/* Success message banner */}
        {success && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-3 text-sm animate-pulse">
            <CheckCircle2 size={20} />
            <span>Support ticket submitted successfully! We will email you shortly.</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {/* Quick contact list */}
          <div className="grid grid-cols-2 gap-4">
            <GlassCard className="p-4 flex flex-col items-center justify-center text-center bg-white/5 dark:bg-black/20 border-white/10 dark:border-white/5">
              <Mail className="text-indigo-500 mb-2" size={24} />
              <span className="text-xs font-bold block dark:text-white">Email Help Desk</span>
              <span className="text-[10px] text-slate-700 dark:text-slate-400 mt-1 font-semibold select-all">support@ludosupreme.com</span>
            </GlassCard>

            <GlassCard className="p-4 flex flex-col items-center justify-center text-center bg-white/5 dark:bg-black/20 border-white/10 dark:border-white/5">
              <PhoneCall className="text-emerald-500 mb-2" size={24} />
              <span className="text-xs font-bold block dark:text-white">Helpline desk</span>
              <span className="text-[10px] text-slate-700 dark:text-slate-400 mt-1 font-semibold select-all">+1-800-LUDO-SUPREME</span>
            </GlassCard>
          </div>

          {/* Form */}
          <GlassCard className="p-6 border-white/20 bg-white/10 dark:bg-black/35 shadow-xl">
            <h3 className="text-sm font-bold tracking-wider text-slate-850 dark:text-slate-400 uppercase mb-4 text-center">
              CREATE SUPPORT TICKET
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">Your Contact Email</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input text-sm py-2.5"
                  required
                  disabled={loading}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">Dispute Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Payment transaction pending, game freeze"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full glass-input text-sm py-2.5"
                  required
                  disabled={loading}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">Detailed Message</label>
                <textarea
                  placeholder="Explain your issue in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full glass-input text-sm py-2.5 h-24 resize-none"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full glass-btn glass-btn-primary py-3 rounded-xl text-sm"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={16} />
                    Submit Support Ticket
                  </>
                )}
              </button>
            </form>
          </GlassCard>
        </div>
      </div>

    </div>
  );
};

export default Support;
