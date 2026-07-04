import React from 'react';
import { GamePlayer, PlayerToken } from '../store/gameSlice';
import audioSynth from '../utils/audio';

interface GameBoardProps {
  players: GamePlayer[];
  activeTurnUserId?: string;
  myUserId?: string;
  hasRolled: boolean;
  diceValue?: number;
  onTokenMove: (tokenId: number) => void;
}

// 15x15 Coordinate maps for common track cells (0-51)
const COMMON_TRACK_COORDS: Record<number, [number, number]> = {
  0: [6, 1], 1: [6, 2], 2: [6, 3], 3: [6, 4], 4: [6, 5],
  5: [5, 6], 6: [4, 6], 7: [3, 6], 8: [2, 6], 9: [1, 6], 10: [0, 6],
  11: [0, 7],
  12: [0, 8],
  13: [1, 8], 14: [2, 8], 15: [3, 8], 16: [4, 8], 17: [5, 8],
  18: [6, 9], 19: [6, 10], 20: [6, 11], 21: [6, 12], 22: [6, 13], 23: [6, 14],
  24: [7, 14],
  25: [8, 14],
  26: [8, 13], 27: [8, 12], 28: [8, 11], 29: [8, 10], 30: [8, 9],
  31: [9, 8], 32: [10, 8], 33: [11, 8], 34: [12, 8], 35: [13, 8], 36: [14, 8],
  37: [14, 7],
  38: [14, 6],
  39: [13, 6], 40: [12, 6], 41: [11, 6], 42: [10, 6], 43: [9, 6],
  44: [8, 5], 45: [8, 4], 46: [8, 3], 47: [8, 2], 48: [8, 1], 49: [8, 0],
  50: [7, 0],
  51: [6, 0]
};

// Start cells on common track
const START_CELLS = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39
};

// Safe zones on the common track (indices)
const SAFE_CELLS_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

// Home paths for each color (steps 51-55)
const HOME_PATH_COORDS: Record<'red' | 'green' | 'yellow' | 'blue', Record<number, [number, number]>> = {
  red: {
    51: [7, 1], 52: [7, 2], 53: [7, 3], 54: [7, 4], 55: [7, 5]
  },
  green: {
    51: [1, 7], 52: [2, 7], 53: [3, 7], 54: [4, 7], 55: [5, 7]
  },
  yellow: {
    51: [7, 13], 52: [7, 12], 53: [7, 11], 54: [7, 10], 55: [7, 9]
  },
  blue: {
    51: [13, 7], 52: [12, 7], 53: [11, 7], 54: [10, 7], 55: [9, 7]
  }
};

// Final home endpoints (step 56)
const HOME_COORDS: Record<'red' | 'green' | 'yellow' | 'blue', [number, number]> = {
  red: [7, 6],
  green: [6, 7],
  yellow: [7, 8],
  blue: [8, 7]
};

// Yard positions for tokens in base (-1 position)
const BASE_COORDS: Record<'red' | 'green' | 'yellow' | 'blue', Record<number, [number, number]>> = {
  red: {
    0: [2, 2], 1: [2, 3], 2: [3, 2], 3: [3, 3]
  },
  green: {
    0: [2, 11], 1: [2, 12], 2: [3, 11], 3: [3, 12]
  },
  yellow: {
    0: [11, 11], 1: [11, 12], 2: [12, 11], 3: [12, 12]
  },
  blue: {
    0: [11, 2], 1: [11, 3], 2: [12, 2], 3: [12, 3]
  }
};

const GameBoard: React.FC<GameBoardProps> = ({
  players,
  activeTurnUserId,
  myUserId,
  hasRolled,
  diceValue = 1,
  onTokenMove
}) => {
  const isMyTurn = activeTurnUserId === myUserId;

  /**
   * Helper to map color to classes
   */
  const getColorClass = (color: string) => {
    switch (color) {
      case 'red': return 'bg-ludo-red text-white';
      case 'green': return 'bg-ludo-green text-white';
      case 'yellow': return 'bg-ludo-yellow text-slate-800';
      case 'blue': return 'bg-ludo-blue text-white';
      default: return 'bg-slate-400';
    }
  };

  /**
   * Determines if a token is movable in the current game context
   */
  const isTokenMovable = (playerColor: string, token: PlayerToken, userId: string) => {
    if (!isMyTurn || userId !== myUserId || !hasRolled || !diceValue) return false;

    // Must roll 6 to release from yard
    if (token.position === -1) {
      return diceValue === 6;
    }

    // Cannot move finished tokens
    if (token.position === 56) return false;

    // Cannot overshoot home
    return token.position + diceValue <= 56;
  };

  /**
   * Calculates 15x15 row/col grid cell position based on color and step count
   */
  const getTokenCoords = (color: 'red' | 'green' | 'yellow' | 'blue', token: PlayerToken): [number, number] => {
    const step = token.position;

    if (step === -1) {
      return BASE_COORDS[color][token.id];
    }
    if (step === 56) {
      return HOME_COORDS[color];
    }
    if (step >= 51 && step <= 55) {
      return HOME_PATH_COORDS[color][step];
    }

    // Calculate common track cell
    const startCell = START_CELLS[color];
    const cellIdx = (startCell + step) % 52;
    return COMMON_TRACK_COORDS[cellIdx];
  };

  // Compile list of tokens positioned on the board
  interface PlacedToken {
    playerId: string;
    color: 'red' | 'green' | 'yellow' | 'blue';
    tokenId: number;
    step: number;
    coords: [number, number];
    movable: boolean;
    label: string;
  }

  const placedTokens: PlacedToken[] = [];
  players.forEach(p => {
    p.tokens.forEach(t => {
      placedTokens.push({
        playerId: p.userId,
        color: p.color,
        tokenId: t.id,
        step: t.position,
        coords: getTokenCoords(p.color, t),
        movable: isTokenMovable(p.color, t, p.userId),
        label: p.name.slice(0, 1).toUpperCase()
      });
    });
  });

  // Group tokens occupying the same grid coordinates to render stack offsets
  const cellGroups: Record<string, PlacedToken[]> = {};
  placedTokens.forEach(token => {
    const key = `${token.coords[0]}_${token.coords[1]}`;
    if (!cellGroups[key]) {
      cellGroups[key] = [];
    }
    cellGroups[key].push(token);
  });

  const handleTokenClick = (token: PlacedToken) => {
    if (!token.movable) return;
    audioSynth.playTokenMove();
    onTokenMove(token.tokenId);
  };

  /**
   * Helper to check if a specific grid cell represents a safe cell
   */
  const isGridCellSafe = (row: number, col: number) => {
    // Star coords from COMMON_TRACK_COORDS mapping
    const safeCoords = [
      [6, 1], [2, 6], [1, 8], [6, 12], [8, 13], [12, 8], [13, 6], [8, 2]
    ];
    return safeCoords.some(c => c[0] === row && c[1] === col);
  };

  return (
    <div className="w-full max-w-[550px] aspect-square rounded-3xl overflow-hidden glass-card p-3 shadow-2xl relative border-indigo-500/20 dark:border-white/10 select-none">
      {/* 15x15 Layout Grid */}
      <div className="grid grid-cols-15 grid-rows-15 w-full h-full gap-[2px] bg-slate-400/20 dark:bg-slate-900/40 relative">
        
        {/* Render 15x15 cells backgrounds */}
        {Array.from({ length: 15 }).map((_, row) => 
          Array.from({ length: 15 }).map((_, col) => {
            let cellColorClass = 'bg-white/5 dark:bg-black/10';
            
            // 1. Red Yard Zone (0-5 row, 0-5 col)
            if (row < 6 && col < 6) {
              cellColorClass = 'bg-ludo-red/10 border-ludo-red/20';
            }
            // 2. Green Yard Zone (0-5 row, 9-14 col)
            else if (row < 6 && col > 8) {
              cellColorClass = 'bg-ludo-green/10 border-ludo-green/20';
            }
            // 3. Yellow Yard Zone (9-14 row, 9-14 col)
            else if (row > 8 && col > 8) {
              cellColorClass = 'bg-ludo-yellow/10 border-ludo-yellow/20';
            }
            // 4. Blue Yard Zone (9-14 row, 0-5 col)
            else if (row > 8 && col < 6) {
              cellColorClass = 'bg-ludo-blue/10 border-ludo-blue/20';
            }

            // Home paths highlight
            // Red home stretch (Row 7, Columns 1 to 5)
            if (row === 7 && col >= 1 && col <= 5) cellColorClass = 'bg-ludo-red/80 shadow-lg';
            // Green home stretch (Column 7, Rows 1 to 5)
            if (col === 7 && row >= 1 && row <= 5) cellColorClass = 'bg-ludo-green/80 shadow-lg';
            // Yellow home stretch (Row 7, Columns 9 to 13)
            if (row === 7 && col >= 9 && col <= 13) cellColorClass = 'bg-ludo-yellow/80 shadow-lg';
            // Blue home stretch (Column 7, Rows 9 to 13)
            if (col === 7 && row >= 9 && row <= 13) cellColorClass = 'bg-ludo-blue/80 shadow-lg';

            // Start highlights on path
            if (row === 6 && col === 1) cellColorClass = 'bg-ludo-red/40 border-2 border-ludo-red';
            if (row === 1 && col === 8) cellColorClass = 'bg-ludo-green/40 border-2 border-ludo-green';
            if (row === 8 && col === 13) cellColorClass = 'bg-ludo-yellow/40 border-2 border-ludo-yellow';
            if (row === 13 && col === 6) cellColorClass = 'bg-ludo-blue/40 border-2 border-ludo-blue';

            // Center home triangle quadrants
            if (row >= 6 && row <= 8 && col >= 6 && col <= 8) {
              cellColorClass = 'bg-slate-300 dark:bg-slate-800/80';
            }

            return (
              <div
                key={`${row}_${col}`}
                className={`ludo-grid-cell transition-all duration-300 border border-slate-500/10 ${cellColorClass}`}
                style={{ gridRowStart: row + 1, gridColumnStart: col + 1 }}
              >
                {/* Safe Star icon indicator */}
                {isGridCellSafe(row, col) && (
                  <span className="text-[10px] sm:text-xs opacity-40 font-bold dark:text-white text-slate-800">⭐</span>
                )}
              </div>
            );
          })
        )}

        {/* Center triangle visual dividers (SVG overlaid) */}
        <div className="absolute inset-0 grid grid-cols-15 grid-rows-15 pointer-events-none">
          <div className="col-start-7 col-end-10 row-start-7 row-end-10 bg-slate-900 border-2 border-white/20 relative flex items-center justify-center">
            {/* Split home triangle using custom CSS clip path */}
            <div className="absolute top-0 left-0 w-0 h-0 border-t-[36px] border-t-ludo-green border-r-[36px] border-r-transparent" />
            <div className="absolute top-0 right-0 w-0 h-0 border-r-[36px] border-r-ludo-yellow border-b-[36px] border-b-transparent" />
            <div className="absolute bottom-0 right-0 w-0 h-0 border-b-[36px] border-b-ludo-blue border-l-[36px] border-l-transparent" />
            <div className="absolute bottom-0 left-0 w-0 h-0 border-l-[36px] border-l-ludo-red border-t-[36px] border-t-transparent" />
            <div className="z-10 w-4 h-4 rounded-full bg-slate-950 border border-white/40 shadow-md" />
          </div>
        </div>

        {/* Render base yard box illustrations */}
        {/* Top-Left Red Base */}
        <div className="absolute top-[4.5%] left-[4.5%] w-[31%] h-[31%] rounded-2xl bg-ludo-red/80 border-2 border-white/20 shadow-lg flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-xs border border-white/30" />
        </div>
        {/* Top-Right Green Base */}
        <div className="absolute top-[4.5%] right-[4.5%] w-[31%] h-[31%] rounded-2xl bg-ludo-green/80 border-2 border-white/20 shadow-lg flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-xs border border-white/30" />
        </div>
        {/* Bottom-Right Yellow Base */}
        <div className="absolute bottom-[4.5%] right-[4.5%] w-[31%] h-[31%] rounded-2xl bg-ludo-yellow/80 border-2 border-white/20 shadow-lg flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-xs border border-white/30" />
        </div>
        {/* Bottom-Left Blue Base */}
        <div className="absolute bottom-[4.5%] left-[4.5%] w-[31%] h-[31%] rounded-2xl bg-ludo-blue/80 border-2 border-white/20 shadow-lg flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-xs border border-white/30" />
        </div>

        {/* Place Tokens inside grid cells */}
        {Object.entries(cellGroups).map(([cellKey, tokens]) => {
          const [rowStr, colStr] = cellKey.split('_');
          const row = parseInt(rowStr, 10);
          const col = parseInt(colStr, 10);

          return (
            <div
              key={cellKey}
              className="absolute flex items-center justify-center pointer-events-none z-20"
              style={{
                top: `${(row / 15) * 100}%`,
                left: `${(col / 15) * 100}%`,
                width: `${100 / 15}%`,
                height: `${100 / 15}%`,
              }}
            >
              {/* If multiple tokens share cell, display with offsets */}
              <div className="relative w-full h-full flex items-center justify-center">
                {tokens.map((token, index) => {
                  const total = tokens.length;
                  
                  // Compute dynamic offset values
                  let offsetX = 0;
                  let offsetY = 0;
                  
                  if (total > 1) {
                    const radius = 5; // px offset radius
                    const angle = (index * 2 * Math.PI) / total;
                    offsetX = Math.cos(angle) * radius;
                    offsetY = Math.sin(angle) * radius;
                  }

                  const activeColorGlow = {
                    red: 'glow-red border-red-300 shadow-red-500/50',
                    green: 'glow-green border-green-300 shadow-green-500/50',
                    yellow: 'glow-yellow border-yellow-200 shadow-yellow-400/50',
                    blue: 'glow-blue border-blue-300 shadow-blue-500/50',
                  }[token.color];

                  return (
                    <button
                      key={`${token.color}_${token.tokenId}`}
                      onClick={() => handleTokenClick(token)}
                      disabled={!token.movable}
                      style={{
                        transform: `translate(${offsetX}px, ${offsetY}px)`,
                      }}
                      className={`
                        w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white flex items-center justify-center shadow-md select-none transition-all duration-300 pointer-events-auto
                        ${token.movable ? 'cursor-pointer hover:scale-125 ring-4 ring-white animate-bounce shadow-lg z-30' : 'cursor-not-allowed opacity-90 z-20'}
                        ${getColorClass(token.color)}
                        ${token.movable ? activeColorGlow : ''}
                      `}
                    >
                      {/* Token visual core */}
                      <div className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-white/40 border border-black/10 flex items-center justify-center shadow-inner text-[8px] sm:text-[9px] font-bold text-slate-800">
                        {token.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
};

export default GameBoard;
