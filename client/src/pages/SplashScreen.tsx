import React, { useEffect } from 'react';
import audioSynth from '../utils/audio';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    // Play splash sound on first interaction
    const handleInteract = () => {
      audioSynth.playClick();
      document.removeEventListener('click', handleInteract);
    };
    document.addEventListener('click', handleInteract);

    const timer = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleInteract);
    };
  }, [onFinish]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative select-none">
      
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[20%] left-[15%] w-72 h-72 rounded-full bg-indigo-600/20 blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-[20%] right-[15%] w-72 h-72 rounded-full bg-violet-600/20 blur-3xl animate-pulse-slow" />

      {/* Main Glassmorphic Container */}
      <div className="glass-card max-w-sm w-full mx-4 p-8 flex flex-col items-center gap-8 border-white/20 bg-white/10 dark:bg-black/35 shadow-2xl animate-float">
        
        {/* Floating Logo */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          {/* Pulsing Back Glow */}
          <div className="absolute inset-0 bg-indigo-500/20 rounded-3xl blur-md animate-ping" />
          
          {/* Ludo Boards Visual Representation */}
          <div className="grid grid-cols-2 gap-1 w-24 h-24 p-2 rounded-2xl bg-white/25 dark:bg-black/40 border border-white/30 backdrop-blur-sm shadow-md rotate-12">
            <div className="rounded-md bg-ludo-red shadow-sm animate-pulse" />
            <div className="rounded-md bg-ludo-green shadow-sm animate-pulse" />
            <div className="rounded-md bg-ludo-blue shadow-sm animate-pulse" />
            <div className="rounded-md bg-ludo-yellow shadow-sm animate-pulse" />
          </div>
          
          {/* Little overlapping floating 3D dice */}
          <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-900 border border-white/40 shadow-lg flex items-center justify-center rotate-45 animate-bounce-slow">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-white" />
          </div>
        </div>

        {/* Title & Slogan */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 bg-clip-text text-transparent dark:from-white dark:to-slate-300">
            LUDO SUPREME
          </h1>
          <p className="text-xs font-semibold tracking-widest text-indigo-500/80 dark:text-indigo-400/70 mt-1 uppercase">
            Realtime Skill Arena
          </p>
        </div>

        {/* Loading Spinner / Progress Bar */}
        <div className="w-full flex flex-col items-center gap-2">
          <div className="w-48 h-1.5 bg-white/10 dark:bg-black/20 rounded-full overflow-hidden border border-white/15 dark:border-white/5 relative">
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full animate-[loading_2.2s_ease-in-out_forwards]" 
              style={{ width: '0%' }}
            />
          </div>
          <span className="text-[10px] tracking-widest text-slate-800 dark:text-slate-400 uppercase font-semibold">
            Connecting Secure Session...
          </span>
        </div>

      </div>

      {/* Embedded CSS animation for loading progress bar */}
      <style>{`
        @keyframes loading {
          0% { width: 0%; }
          30% { width: 25%; }
          60% { width: 75%; }
          100% { width: 100%; }
        }
      `}</style>

    </div>
  );
};

export default SplashScreen;
