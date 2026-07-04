import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { toggleSound } from '../store/uiSlice';
import { Volume2, VolumeX } from 'lucide-react';
import audioSynth from '../utils/audio';

const SoundToggle: React.FC = () => {
  const dispatch = useDispatch();
  const soundEnabled = useSelector((state: RootState) => state.ui.soundEnabled);

  const handleToggle = () => {
    dispatch(toggleSound());
    // Play sound immediately if turned on to demonstrate it works
    setTimeout(() => {
      audioSynth.playClick();
    }, 50);
  };

  return (
    <button
      onClick={handleToggle}
      className="p-2.5 rounded-xl bg-white/10 dark:bg-black/20 hover:bg-white/20 dark:hover:bg-black/35 border border-white/25 dark:border-white/10 text-slate-800 dark:text-slate-100 hover:scale-105 active:scale-95 transition-all duration-300 shadow-md"
      aria-label="Toggle sound"
    >
      {soundEnabled ? <Volume2 size={20} className="text-emerald-500" /> : <VolumeX size={20} className="text-red-500" />}
    </button>
  );
};

export default SoundToggle;
