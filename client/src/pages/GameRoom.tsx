import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { clearGameSession, ChatMessage } from '../store/gameSlice';
import socketClient from '../services/socket';
import GameBoard from '../components/GameBoard';
import Dice from '../components/Dice';
import GlassCard from '../components/GlassCard';
import audioSynth from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  Trophy,
  ArrowLeft,
  Send,
  MessageSquare,
  Volume2,
  VolumeX,
  Zap,
  Smartphone,
  AlertTriangle,
  UserCheck
} from 'lucide-react';

interface GameRoomProps {
  onNavigate: (page: string) => void;
}

const CHAT_PRESETS = [
  'Good Luck! 🎮',
  'Nice Move! 👍',
  'Aha! Capture! 💥',
  'Oh No! 😭',
  'Well Played! 🏆',
  'Speed Up! ⏳'
];

const GameRoom: React.FC<GameRoomProps> = ({ onNavigate }) => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const soundEnabled = useSelector((state: RootState) => state.ui.soundEnabled);
  const { currentGame, chats, error } = useSelector((state: RootState) => state.game);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const chatsEndRef = useRef<HTMLDivElement | null>(null);

  // Sync turn timeout countdown
  useEffect(() => {
    setSecondsLeft(15);
  }, [currentGame?.turn, currentGame?.hasRolled]);

  useEffect(() => {
    if (secondsLeft <= 0 || currentGame?.status !== 'active') return;
    
    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, currentGame?.status]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatsEndRef.current) {
      chatsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chats]);

  // Track state changes to play specific sound effects synced with Socket updates
  const prevTokensRef = useRef<any>(null);
  useEffect(() => {
    if (!currentGame || currentGame.status !== 'active') return;

    if (prevTokensRef.current) {
      // Find if any capture or home-reached happened
      let captureHappened = false;
      let reachedHomeHappened = false;

      currentGame.players.forEach(p => {
        const prevP = prevTokensRef.current.find((prev: any) => prev.userId === p.userId);
        if (prevP) {
          p.tokens.forEach(t => {
            const prevT = prevP.tokens.find((pt: any) => pt.id === t.id);
            if (prevT) {
              // 1. Sent to yard (-1) from positive position (Captured!)
              if (t.position === -1 && prevT.position > -1) {
                captureHappened = true;
              }
              // 2. Reached home (56) from lower position
              if (t.position === 56 && prevT.position < 56) {
                reachedHomeHappened = true;
              }
            }
          });
        }
      });

      if (captureHappened) {
        audioSynth.playCapture();
      } else if (reachedHomeHappened) {
        audioSynth.playTokenHome();
      }
    }

    // Cache current tokens for next check
    prevTokensRef.current = currentGame.players.map(p => ({
      userId: p.userId,
      tokens: p.tokens.map(t => ({ id: t.id, position: t.position }))
    }));
  }, [currentGame]);

  // Trigger confetti burst on game completion
  useEffect(() => {
    if (currentGame && currentGame.status === 'completed') {
      audioSynth.playWinningFanfare();
      
      // Fire confetti cascade
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [currentGame?.status]);

  if (!currentGame || !user) return null;

  const myPlayer = currentGame.players.find(p => p.userId === user.id);
  const opponentPlayer = currentGame.players.find(p => p.userId !== user.id);

  const activePlayer = currentGame.players[currentGame.turnIndex];
  const isMyTurn = currentGame.turn === user.id;

  const handleRollDice = () => {
    socketClient.emit('game:roll');
  };

  const handleTokenMove = (tokenId: number) => {
    socketClient.emit('game:move', { tokenId });
  };

  const handleSendChat = (text: string) => {
    if (!text.trim()) return;
    audioSynth.playClick();
    
    // Send to socket
    socketClient.emit('game:chat', { message: text });

    // Append to local state Redux
    socketClient.emit('game:chat_local_append'); // trigger trigger helper trigger
    setChatText('');
  };

  const handleConfirmExit = () => {
    audioSynth.playClick();
    socketClient.emit('game:leave');
    dispatch(clearGameSession());
    onNavigate('home');
  };

  // Safe status labels
  const getTurnMessage = () => {
    if (currentGame.status === 'completed') {
      const isWinnerMe = currentGame.winner === user.id;
      return isWinnerMe ? '🎉 CONGRATULATIONS! YOU WON!' : '😞 GAME OVER! OPPONENT WON';
    }
    return isMyTurn ? "👉 IT'S YOUR TURN - ROLL DICE!" : `⌛ WAITING FOR OPPONENT...`;
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto flex flex-col md:flex-row gap-6 relative">
      
      {/* Upper background glows */}
      <div className="absolute top-[10%] left-[10%] w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Game Arena Column */}
      <div className="flex-1 flex flex-col items-center gap-4">
        
        {/* Header toolbar */}
        <div className="w-full flex items-center justify-between gap-4">
          <button
            onClick={() => { audioSynth.playClick(); setShowExitConfirm(true); }}
            className="p-2.5 rounded-xl bg-white/10 dark:bg-black/25 hover:bg-white/20 dark:hover:bg-black/35 border border-white/20 dark:border-white/10 text-slate-800 dark:text-white transition-all active:scale-95 shadow"
            title="Leave Match"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="glass-card px-4 py-1.5 flex items-center gap-2 text-xs font-extrabold border-indigo-500/20 text-indigo-500">
            <Trophy size={14} className="animate-bounce text-yellow-500" />
            Prize Pool: ₹{currentGame.prizePool.toFixed(1)}
          </div>

          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="p-2.5 rounded-xl bg-white/10 dark:bg-black/25 hover:bg-white/20 dark:hover:bg-black/35 border border-white/20 dark:border-white/10 text-slate-800 dark:text-white transition-all active:scale-95 shadow md:hidden"
          >
            <MessageSquare size={20} />
          </button>
        </div>

        {/* Dynamic status indicators bar */}
        <div className="w-full text-center py-2.5 rounded-xl bg-indigo-600/10 dark:bg-black/30 border border-white/10 flex items-center justify-between px-4">
          <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase dark:text-slate-200">
            {getTurnMessage()}
          </span>
          {currentGame.status === 'active' && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-500">
              <Zap size={14} className={`${secondsLeft <= 5 ? 'animate-bounce text-rose-500' : ''}`} />
              <span className={secondsLeft <= 5 ? 'text-rose-500 font-extrabold' : ''}>{secondsLeft}s Left</span>
            </div>
          )}
        </div>

        {/* LUDO GAMEBOARD RENDER */}
        <GameBoard
          players={currentGame.players}
          activeTurnUserId={currentGame.turn}
          myUserId={user.id}
          hasRolled={currentGame.hasRolled}
          diceValue={currentGame.diceValue}
          onTokenMove={handleTokenMove}
        />

        {/* Active user controller dashboard (Dice & profiles) */}
        {currentGame.status === 'active' && (
          <div className="w-full max-w-[500px] flex items-center justify-between gap-4 mt-2">
            
            {/* Player details profile display */}
            <div className="space-y-2">
              {/* My Profile */}
              {myPlayer && (
                <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all
                  ${isMyTurn ? 'bg-indigo-500/10 border-indigo-500/30 ring-2 ring-indigo-500/20' : 'bg-white/5 border-white/10'}
                `}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs bg-ludo-${myPlayer.color}`}>
                    {myPlayer.avatar.replace('avatar_', '')}
                  </div>
                  <div>
                    <span className="text-xs font-extrabold block text-slate-900 dark:text-slate-200">{myPlayer.name} (You)</span>
                    <span className="text-[9px] text-slate-800 dark:text-slate-400 block font-bold uppercase">Color: {myPlayer.color} | Skips: {myPlayer.skipCount}/3</span>
                  </div>
                </div>
              )}

              {/* Opponent profile */}
              {opponentPlayer && (
                <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all
                  ${!isMyTurn ? 'bg-indigo-500/10 border-indigo-500/30 ring-2 ring-indigo-500/20' : 'bg-white/5 border-white/10'}
                `}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs bg-ludo-${opponentPlayer.color}`}>
                    {opponentPlayer.avatar.replace('avatar_', '')}
                  </div>
                  <div>
                    <span className="text-xs font-extrabold block text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                      {opponentPlayer.name}
                      {opponentPlayer.isDisconnected && (
                        <span className="text-[8px] bg-red-500/10 text-red-500 px-1 py-0.2 rounded font-black uppercase tracking-wider animate-pulse">Offline</span>
                      )}
                    </span>
                    <span className="text-[9px] text-slate-800 dark:text-slate-400 block font-bold uppercase">Color: {opponentPlayer.color} | Skips: {opponentPlayer.skipCount}/3</span>
                  </div>
                </div>
              )}
            </div>

            {/* Central rolling dice tool */}
            <Dice
              value={currentGame.diceValue}
              isMyTurn={isMyTurn}
              hasRolled={currentGame.hasRolled}
              onRoll={handleRollDice}
            />

          </div>
        )}

      </div>

      {/* Real-time Chats and presets column (Sidebar for desktop, sliding panel for mobile) */}
      <div className={`
        w-full md:w-80 shrink-0 flex flex-col glass-card border-white/20 p-4 shadow-xl z-40 transition-all duration-300 md:static fixed bottom-0 right-0 left-0 top-[20%] md:translate-y-0
        ${chatOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
      `}>
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <h3 className="text-sm font-bold tracking-wider text-slate-800 dark:text-slate-400 flex items-center gap-1.5 uppercase">
            <MessageSquare size={16} className="text-indigo-500" />
            Arena Chats logs
          </h3>
          <button
            onClick={() => setChatOpen(false)}
            className="text-xs text-slate-700 dark:text-slate-400 hover:text-white font-bold md:hidden"
          >
            Minimize
          </button>
        </div>

        {/* Chats lists feed */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs max-h-[250px] md:max-h-none">
          {chats.length === 0 ? (
            <div className="text-center py-12 text-slate-700 dark:text-slate-500 italic font-semibold">
              No chats yet. Say hello!
            </div>
          ) : (
            chats.map((chat, idx) => {
              const isMsgMe = chat.userId === user.id;
              return (
                <div key={idx} className={`flex flex-col ${isMsgMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-[9px] text-slate-800 dark:text-slate-500 font-bold mb-0.5 px-1">{chat.name}</span>
                  <div className={`p-2.5 rounded-2xl max-w-[85%] font-medium leading-normal shadow-sm
                    ${isMsgMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/10 dark:bg-black/30 border border-white/10 rounded-tl-none'}
                  `}>
                    {chat.message}
                  </div>
                  <span className="text-[8px] text-slate-800 dark:text-slate-650 mt-0.5 px-1">{chat.timestamp}</span>
                </div>
              );
            })
          )}
          <div ref={chatsEndRef} />
        </div>

        {/* Quick presets buttons */}
        <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-white/10 mb-3">
          {CHAT_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => handleSendChat(preset)}
              className="py-1.5 text-[9px] font-bold text-slate-800 dark:text-slate-300 bg-white/5 dark:bg-black/25 hover:bg-white/10 dark:hover:bg-black/35 rounded-lg border border-white/5 hover:scale-105 active:scale-95 transition-all text-center truncate"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Text send input field */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type message..."
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendChat(chatText)}
            className="flex-1 glass-input py-2 text-xs"
          />
          <button
            onClick={() => handleSendChat(chatText)}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-95 flex items-center justify-center"
          >
            <Send size={14} />
          </button>
        </div>

      </div>

      {/* exit confirm modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <GlassCard className="max-w-sm w-full p-6 bg-slate-900 border-2 border-red-500 text-white text-center space-y-4">
            <AlertTriangle className="text-red-500 mx-auto w-12 h-12 animate-bounce" />
            <h3 className="text-lg font-black tracking-wide">LEAVE ACTIVE MATCH?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              If you leave this match now, it will count as an immediate defeat and your entry fee stake will be lost. Proceed?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { audioSynth.playClick(); setShowExitConfirm(false); }}
                className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold"
              >
                No, Stay Play
              </button>
              <button
                onClick={handleConfirmExit}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold shadow-md"
              >
                Yes, Leave Lose
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Winner Screen celebration overlay */}
      {currentGame.status === 'completed' && (
        <div className="fixed inset-0 z-[90] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <GlassCard className="max-w-md w-full p-8 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 border-indigo-500 shadow-2xl text-center space-y-6 text-white relative">
            
            <div className="relative inline-flex p-4 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 mb-2 animate-float">
              <Trophy size={48} className="fill-current" />
              <span className="absolute -inset-1 bg-yellow-500/20 rounded-full blur-sm animate-pulse-slow" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black tracking-widest text-yellow-500 uppercase">MATCH COMPLETED</h3>
              
              {currentGame.winner === user.id ? (
                <>
                  <span className="text-xs text-slate-300 block">Victory Chip Earned!</span>
                  <span className="text-4xl font-black block text-emerald-400 mt-2">
                    +₹{currentGame.prizePool.toFixed(1)}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xs text-slate-300 block">Defeat. Play more to win!</span>
                  <span className="text-xl font-bold block text-rose-500 mt-2">
                    Better luck next match
                  </span>
                </>
              )}
            </div>

            {/* Players summary */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2.5 text-xs text-slate-400">
              <div className="flex justify-between font-bold">
                <span>Room Code:</span>
                <span className="text-slate-200">{currentGame.roomId}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Entry fee Stake:</span>
                <span className="text-slate-200">₹{currentGame.entryFee} coins</span>
              </div>
              <div className="flex justify-between items-center font-bold">
                <span>Winner:</span>
                <span className="text-yellow-500 flex items-center gap-1">
                  <UserCheck size={14} />
                  {currentGame.players.find(p => p.userId === currentGame.winner)?.name || 'Winner'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                audioSynth.playClick();
                dispatch(clearGameSession());
                onNavigate('home');
              }}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs tracking-wider rounded-xl uppercase shadow-md active:scale-95 transition-all"
            >
              Return to Arena Dashboard
            </button>
          </GlassCard>
        </div>
      )}

    </div>
  );
};

export default GameRoom;
