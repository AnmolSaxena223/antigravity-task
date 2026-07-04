import React, { useState, useEffect } from 'react';
import audioSynth from '../utils/audio';

interface DiceProps {
  value?: number;
  isMyTurn: boolean;
  hasRolled: boolean;
  onRoll: () => void;
  disabled?: boolean;
}

const Dice: React.FC<DiceProps> = ({
  value = 5,
  isMyTurn,
  hasRolled,
  onRoll,
  disabled = false
}) => {
  const [rolling, setRolling] = useState(false);
  const [displayVal, setDisplayVal] = useState(value);

  useEffect(() => {
    if (value !== displayVal) {
      // Trigger rolling animation
      setRolling(true);
      audioSynth.playDiceRoll();

      // Cycle numbers during roll
      const interval = setInterval(() => {
        setDisplayVal(Math.floor(Math.random() * 6) + 1);
      }, 70);

      // Stop roll animation
      const timeout = setTimeout(() => {
        clearInterval(interval);
        setRolling(false);
        setDisplayVal(value);
      }, 600);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [value]);

  const handleRollClick = () => {
    if (disabled || rolling || !isMyTurn || hasRolled) return;
    onRoll();
  };

  const renderDots = (num: number) => {
    const dotPositions: Record<number, string[]> = {
      1: ['col-start-2 row-start-2'],
      2: ['col-start-1 row-start-1', 'col-start-3 row-start-3'],
      3: ['col-start-1 row-start-1', 'col-start-2 row-start-2', 'col-start-3 row-start-3'],
      4: [
        'col-start-1 row-start-1', 'col-start-3 row-start-1',
        'col-start-1 row-start-3', 'col-start-3 row-start-3'
      ],
      5: [
        'col-start-1 row-start-1', 'col-start-3 row-start-1',
        'col-start-2 row-start-2',
        'col-start-1 row-start-3', 'col-start-3 row-start-3'
      ],
      6: [
        'col-start-1 row-start-1', 'col-start-3 row-start-1',
        'col-start-1 row-start-2', 'col-start-3 row-start-2',
        'col-start-1 row-start-3', 'col-start-3 row-start-3'
      ],
    };

    const activeDots = dotPositions[num] || dotPositions[1];

    return (
      <div className="grid grid-cols-3 grid-rows-3 w-12 h-12 gap-1.5 p-1">
        {activeDots.map((pos, idx) => (
          <div
            key={idx}
            className={`w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-white shadow-sm self-center justify-self-center ${pos}`}
          />
        ))}
      </div>
    );
  };

  const isRollable = isMyTurn && !hasRolled && !rolling && !disabled;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleRollClick}
        disabled={!isRollable}
        className={`w-20 h-20 rounded-2xl glass-card flex items-center justify-center transition-all duration-300 relative select-none
          ${rolling ? 'animate-dice-roll' : ''}
          ${isRollable 
            ? 'cursor-pointer hover:scale-110 active:scale-95 border-indigo-400 bg-white/20 dark:bg-white/10 ring-4 ring-indigo-500/30 dark:ring-indigo-400/20' 
            : 'cursor-not-allowed opacity-80 border-white/10 bg-white/5 dark:bg-black/10'
          }
        `}
      >
        {/* Subtle highlight ring if it's the active player's turn */}
        {isRollable && (
          <span className="absolute inset-0 rounded-2xl border-2 border-indigo-500 animate-ping opacity-35" />
        )}
        
        {/* 3D Dice Face */}
        <div className="bg-slate-100/95 dark:bg-slate-950/90 w-16 h-16 rounded-xl border border-white/20 dark:border-white/5 shadow-inner flex items-center justify-center">
          {renderDots(displayVal)}
        </div>
      </button>

      {/* Helpful Hint Labels */}
      {isRollable && (
        <span className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 animate-pulse-slow">
          YOUR TURN - ROLL!
        </span>
      )}
    </div>
  );
};

export default Dice;
