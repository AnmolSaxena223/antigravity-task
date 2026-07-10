import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { updateProfileSuccess } from '../store/authSlice';
import { apiRequest } from '../services/api';
import GlassCard from '../components/GlassCard';
import audioSynth from '../utils/audio';
import { ArrowLeft, User, Mail, Save, Calendar, CheckCircle } from 'lucide-react';

interface ProfileProps {
  onNavigate: (page: string) => void;
}

const AVAILABLE_AVATARS = ['avatar_1', 'avatar_2', 'avatar_3', 'avatar_4', 'avatar_5', 'avatar_6'];

const Profile: React.FC<ProfileProps> = ({ onNavigate }) => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || 'avatar_1');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    audioSynth.playClick();
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const response = await apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, avatar })
    });

    setLoading(false);
    if (response.success && response.user) {
      dispatch(updateProfileSuccess(response.user));
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(response.message || 'Failed to update profile.');
    }
  };

  const winRatio = user.gameStats.played > 0 
    ? Math.round((user.gameStats.won / user.gameStats.played) * 100) 
    : 0;

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-2xl mx-auto flex flex-col justify-between">
      
      {/* Decorative Glows */}
      <div className="absolute top-[10%] left-[20%] w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Navigation Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => { audioSynth.playClick(); onNavigate('home'); }}
            className="p-2.5 rounded-xl bg-white/10 dark:bg-black/20 hover:bg-white/20 dark:hover:bg-black/35 border border-white/20 dark:border-white/10 text-slate-800 dark:text-white transition-all duration-300 active:scale-95 shadow"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-extrabold tracking-wide dark:text-white">
            Profile Arena
          </h2>
        </div>

        {/* Display Status Messages */}
        {successMsg && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-3 text-sm animate-pulse">
            <CheckCircle size={20} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Profile Details Form */}
        <GlassCard className="p-6 border-white/20 bg-white/10 dark:bg-black/35 shadow-lg mb-6">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            
            {/* Avatar Selector */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-xs font-bold tracking-wider text-slate-850 dark:text-slate-400 uppercase">
                CHOOSE CHIP AVATAR
              </span>
              <div className="flex flex-wrap justify-center gap-3">
                {AVAILABLE_AVATARS.map((avId) => {
                  const isSelected = avatar === avId;
                  return (
                    <button
                      key={avId}
                      type="button"
                      onClick={() => { audioSynth.playClick(); setAvatar(avId); }}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border transition-all duration-300 relative
                        ${isSelected 
                          ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white scale-110 border-indigo-400 shadow-md ring-4 ring-indigo-500/20' 
                          : 'bg-white/10 dark:bg-black/25 text-slate-800 dark:text-slate-300 border-white/10 dark:border-white/5 hover:bg-white/15'
                        }
                      `}
                    >
                      {avId.replace('avatar_', '')}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email Display (Readonly) */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-850 dark:text-slate-45px uppercase tracking-wider">
                  REGISTERED EMAIL
                </span>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800 dark:text-slate-400">
                    <Mail size={16} />
                  </span>
                  <input
                    type="text"
                    value={user.email}
                    readOnly
                    className="w-full pl-12 glass-input py-2.5 text-sm cursor-not-allowed opacity-60 bg-white/5"
                  />
                </div>
              </div>

              {/* Name field */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-850 dark:text-slate-45px uppercase tracking-wider">
                  PLAYER NAME
                </span>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800 dark:text-slate-400">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 glass-input py-2.5 text-sm"
                    maxLength={20}
                    disabled={loading}
                  />
                </div>
              </div>
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
                  <Save size={16} />
                  Save Updates
                </>
              )}
            </button>

          </form>
        </GlassCard>

        {/* Gameplay Stats grid */}
        <h3 className="text-sm font-bold tracking-wider text-slate-850 dark:text-slate-400 uppercase mb-3 ml-1">
          GAME STATISTICS
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <GlassCard className="p-4 flex flex-col items-center justify-center text-center bg-white/5 dark:bg-black/20 border-white/10 dark:border-white/5">
            <span className="text-2xl font-black text-slate-800 dark:text-white">{user.gameStats.played}</span>
            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-400 tracking-wide uppercase mt-1">Played</span>
          </GlassCard>

          <GlassCard className="p-4 flex flex-col items-center justify-center text-center bg-white/5 dark:bg-black/20 border-white/10 dark:border-white/5">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{user.gameStats.won}</span>
            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-400 tracking-wide uppercase mt-1">Won</span>
          </GlassCard>

          <GlassCard className="p-4 flex flex-col items-center justify-center text-center bg-white/5 dark:bg-black/20 border-white/10 dark:border-white/5">
            <span className="text-2xl font-black text-red-500">{user.gameStats.lost}</span>
            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-400 tracking-wide uppercase mt-1">Lost</span>
          </GlassCard>

          <GlassCard className="p-4 flex flex-col items-center justify-center text-center bg-white/5 dark:bg-black/20 border-white/10 dark:border-white/5">
            <span className="text-2xl font-black text-indigo-500 dark:text-indigo-400">{winRatio}%</span>
            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-400 tracking-wide uppercase mt-1">Win Ratio</span>
          </GlassCard>
        </div>

        {/* Audit Details */}
        <GlassCard className="p-4 bg-white/5 dark:bg-black/25 border-white/10 dark:border-white/5 flex flex-col gap-2.5 text-xs text-slate-800 dark:text-slate-400 font-semibold mb-6">
          <div className="flex justify-between">
            <span>Invite Code:</span>
            <span className="font-extrabold text-indigo-500">{user.referralCode}</span>
          </div>
          <div className="flex justify-between">
            <span>Friends Invited:</span>
            <span className="font-extrabold text-slate-800 dark:text-slate-200">{user.referralsCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Joined On:</span>
            <span className="font-bold flex items-center gap-1">
              <Calendar size={12} />
              {new Date(user.createdAt || Date.now()).toLocaleDateString()}
            </span>
          </div>
        </GlassCard>
      </div>

    </div>
  );
};

export default Profile;
