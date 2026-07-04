import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { toggleTheme } from '../store/uiSlice';
import { Sun, Moon } from 'lucide-react';
import audioSynth from '../utils/audio';

const ThemeToggle: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useSelector((state: RootState) => state.ui.theme);

  const handleToggle = () => {
    audioSynth.playClick();
    dispatch(toggleTheme());
  };

  return (
    <button
      onClick={handleToggle}
      className="p-2.5 rounded-xl bg-white/10 dark:bg-black/20 hover:bg-white/20 dark:hover:bg-black/35 border border-white/25 dark:border-white/10 text-slate-800 dark:text-amber-400 hover:scale-105 active:scale-95 transition-all duration-300 shadow-md"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} className="text-indigo-600" />}
    </button>
  );
};

export default ThemeToggle;
