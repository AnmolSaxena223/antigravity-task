import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { toggleTheme, toggleSound, setSoundVolume } from '../store/uiSlice';
import { logoutSuccess } from '../store/authSlice';
import { clearGameSession } from '../store/gameSlice';
import { apiRequest } from '../services/api';
import socketClient from '../services/socket';
import GlassCard from '../components/GlassCard';
import audioSynth from '../utils/audio';
import { ArrowLeft, Volume2, VolumeX, Sun, Moon, LogOut, Info, Settings as SettingsIcon } from 'lucide-react';

interface SettingsProps {
  onNavigate: (page: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
  const dispatch = useDispatch();
  const theme = useSelector((state: RootState) => state.ui.theme);
  const soundEnabled = useSelector((state: RootState) => state.ui.soundEnabled);
  const soundVolume = useSelector((state: RootState) => state.ui.soundVolume);

  const handleToggleTheme = () => {
    audioSynth.playClick();
    dispatch(toggleTheme());
  };

  const handleToggleSound = () => {
    dispatch(toggleSound());
    setTimeout(() => {
      audioSynth.playClick();
    }, 50);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    dispatch(setSoundVolume(vol));
  };

  const handleLogout = async () => {
    audioSynth.playClick();
    await apiRequest('/auth/logout', { method: 'POST' });
    socketClient.disconnect();
    dispatch(clearGameSession());
    dispatch(logoutSuccess());
    onNavigate('login');
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-xl mx-auto relative flex flex-col justify-between">
      <div className="absolute top-[10%] left-[20%] w-60 h-60 bg-slate-500/5 rounded-full blur-3xl pointer-events-none" />

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
            App Settings
          </h2>
        </div>

        <GlassCard className="p-6 border-white/20 bg-white/10 dark:bg-black/35 shadow-xl space-y-6">
          
          <div className="text-center">
            <div className="inline-flex p-3 rounded-2xl bg-slate-500/10 text-slate-700 dark:text-slate-300 mb-2">
              <SettingsIcon size={28} />
            </div>
            <h3 className="text-lg font-extrabold dark:text-white">Personalization Bench</h3>
            <p className="text-xs text-slate-800 dark:text-slate-400 mt-1">Configure audio parameters and dark settings</p>
          </div>

          <div className="space-y-5">
            {/* Theme selector */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10">
              <div>
                <span className="text-xs font-extrabold block dark:text-slate-200">Dark/Light Mode Theme</span>
                <span className="text-[10px] text-slate-800 dark:text-slate-400 font-bold block mt-0.5">Toggle interface design variables</span>
              </div>
              <button
                onClick={handleToggleTheme}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-slate-800 dark:text-amber-400 border border-white/10 shadow active:scale-95 transition-all"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} className="text-indigo-600" />}
              </button>
            </div>

            {/* Sound toggle & slider */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold block dark:text-slate-200">Synthesized Sound Effects</span>
                  <span className="text-[10px] text-slate-800 dark:text-slate-400 font-bold block mt-0.5">Enable/Disable roll/move beeps</span>
                </div>
                <button
                  onClick={handleToggleSound}
                  className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-slate-800 dark:text-slate-100 border border-white/10 shadow active:scale-95 transition-all"
                >
                  {soundEnabled ? <Volume2 size={18} className="text-emerald-500" /> : <VolumeX size={18} className="text-rose-500" />}
                </button>
              </div>

              {soundEnabled && (
                <div className="flex items-center gap-3 pt-2.5 border-t border-white/5">
                  <span className="text-[9px] font-bold text-slate-800 dark:text-slate-400 uppercase tracking-wider shrink-0">VOLUME</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={soundVolume}
                    onChange={handleVolumeChange}
                    className="flex-1 accent-indigo-500 h-1 bg-white/10 rounded-lg outline-none"
                  />
                  <span className="text-[10px] font-black text-slate-800 dark:text-slate-300 w-8 text-right">
                    {Math.round(soundVolume * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Version panel */}
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-400">
              <Info size={18} className="text-indigo-500 shrink-0" />
              <div>
                <span className="font-extrabold text-slate-900 dark:text-white">Ludo Supreme Engine v1.0.0</span>
                <p className="text-[10px] mt-0.5 leading-normal">Fully synchronized real-time engine running on authorization JWT cookies.</p>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full glass-btn bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-3 rounded-xl text-xs flex items-center justify-center gap-1.5"
            >
              <LogOut size={16} />
              Sign Out Account
            </button>

          </div>

        </GlassCard>
      </div>

    </div>
  );
};

export default Settings;
