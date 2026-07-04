import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setGameSession } from '../store/gameSlice';
import { apiRequest } from '../services/api';
import socketClient from '../services/socket';
import GlassCard from '../components/GlassCard';
import FriendsPanel from '../components/FriendsPanel';
import audioSynth from '../utils/audio';
import {
  ArrowLeft,
  Users,
  Copy,
  Check,
  Play,
  Shield,
  Trash2,
  Share2,
  CheckCircle,
  AlertTriangle,
  LogOut,
  UserPlus,
  QrCode,
  X
} from 'lucide-react';

interface LobbyRoomProps {
  data: { roomId: string; autoJoin?: boolean };
  onNavigate: (page: string, data?: any) => void;
}

interface LobbyPlayer {
  userId: string;
  name: string;
  avatar: string;
  color: 'red' | 'green' | 'yellow' | 'blue';
  isReady: boolean;
}

interface InvitedFriend {
  _id: string;
  name: string;
  avatar: string;
  friendId: string;
  level: number;
  status: 'waiting' | 'accepted' | 'declined' | 'joined';
}

interface LobbyData {
  roomId: string;
  hostId: string;
  entryFee: number;
  maxPlayers: number;
  players: LobbyPlayer[];
  status: string;
  invites?: InvitedFriend[];
}

const LobbyRoom: React.FC<LobbyRoomProps> = ({ data, onNavigate }) => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const currentGame = useSelector((state: RootState) => state.game.currentGame);

  const [lobby, setLobby] = useState<LobbyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const roomId = data?.roomId;
  const isHost = lobby?.hostId === currentUser?._id;

  // Build Share Items
  const localURL = window.location.origin; // e.g. http://localhost:5173
  const inviteLink = `${localURL}/room/${roomId}`;
  const shareMessage = `🎲 Join my Ludo Match!\n\nPlay Real Money Ludo with me.\n\nJoin using my invite link:\n${inviteLink}`;

  // Fetch Lobby Details
  const fetchLobby = async (join = false) => {
    try {
      setLoading(true);
      setError(null);

      let res;
      if (join) {
        res = await apiRequest('/room/join', {
          method: 'POST',
          body: JSON.stringify({ roomId })
        });
      } else {
        res = await apiRequest(`/room/details/${roomId}`);
      }

      if (res.success && res.room) {
        setLobby(res.room);
        localStorage.setItem('currentGameRoomId', res.room.roomId);
        // Bind socket to lobby room channel
        socketClient.emit('room:join_lobby', { roomId: res.room.roomId });
      } else {
        setError(res.message || 'Failed to connect to the lobby.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const refreshDetails = async () => {
    try {
      const res = await apiRequest(`/room/details/${roomId}`);
      if (res.success && res.room) {
        setLobby(res.room);
      }
    } catch (err) {
      console.error('Failed to refresh lobby details:', err);
    }
  };

  useEffect(() => {
    if (roomId) {
      fetchLobby(!!data.autoJoin);
    }

    // Socket listeners for real-time lobby updates
    const handleRoomJoined = () => {
      refreshDetails();
      audioSynth.playClick();
    };

    const handleRoomLeft = (payload: { leftUserId: string }) => {
      if (payload.leftUserId === currentUser?._id) {
        onNavigate('home');
        return;
      }
      refreshDetails();
    };

    const handleRoomKicked = (payload: { roomId: string }) => {
      if (payload.roomId === roomId) {
        alert('You have been kicked from the lobby by the host.');
        onNavigate('home');
      }
    };

    const handleRoomReady = () => {
      refreshDetails();
    };

    const handleHostTransferred = (payload: { newHostId: string }) => {
      setLobby(prev => prev ? { ...prev, hostId: payload.newHostId } : null);
      refreshDetails();
    };

    const handleInviteDeclined = () => {
      refreshDetails();
    };

    const handleGameStarted = (gameSession: any) => {
      dispatch(setGameSession(gameSession));
      onNavigate('game-room');
    };

    socketClient.on('room:joined', handleRoomJoined);
    socketClient.on('room:left', handleRoomLeft);
    socketClient.on('room:kicked', handleRoomKicked);
    socketClient.on('room:ready', handleRoomReady);
    socketClient.on('room:host_transferred', handleHostTransferred);
    socketClient.on('invite:declined', handleInviteDeclined);
    socketClient.on('game:started', handleGameStarted);

    return () => {
      socketClient.off('room:joined', handleRoomJoined);
      socketClient.off('room:left', handleRoomLeft);
      socketClient.off('room:kicked', handleRoomKicked);
      socketClient.off('room:ready', handleRoomReady);
      socketClient.off('room:host_transferred', handleHostTransferred);
      socketClient.off('invite:declined', handleInviteDeclined);
      socketClient.off('game:started', handleGameStarted);
      localStorage.removeItem('currentGameRoomId');
    };
  }, [roomId]);

  // Handle game redirects if game session is already active in store
  useEffect(() => {
    if (currentGame && currentGame.status === 'active' && currentGame.roomId === roomId) {
      onNavigate('game-room');
    }
  }, [currentGame, roomId, onNavigate]);

  const handleCopyLink = () => {
    audioSynth.playClick();
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleReady = async () => {
    if (!lobby || isHost) return;
    audioSynth.playClick();

    const currentPlayer = lobby.players.find(p => p.userId === currentUser?._id);
    const nextReadyState = !currentPlayer?.isReady;

    try {
      const res = await apiRequest('/room/toggle-ready', {
        method: 'POST',
        body: JSON.stringify({ roomId, isReady: nextReadyState })
      });
      if (res.success && res.room) {
        setLobby(res.room);
      }
    } catch (err) {
      console.error('Error toggling ready status:', err);
    }
  };

  const handleStartGame = async () => {
    if (!isHost) return;
    audioSynth.playClick();

    try {
      const res = await apiRequest('/room/start-match', {
        method: 'POST',
        body: JSON.stringify({ roomId })
      });
      if (!res.success) {
        alert(res.message || 'Failed to start match.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeaveRoom = async () => {
    audioSynth.playClick();
    try {
      await apiRequest('/room/leave', {
        method: 'POST',
        body: JSON.stringify({ roomId })
      });
      onNavigate('home');
    } catch (err) {
      console.error(err);
      onNavigate('home');
    }
  };

  const handleKickPlayer = async (targetUserId: string) => {
    audioSynth.playClick();
    try {
      const res = await apiRequest('/room/kick', {
        method: 'POST',
        body: JSON.stringify({ roomId, targetUserId })
      });
      if (res.success) {
        refreshDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTransferHost = async (targetUserId: string) => {
    audioSynth.playClick();
    try {
      const res = await apiRequest('/room/transfer-host', {
        method: 'POST',
        body: JSON.stringify({ roomId, targetUserId })
      });
      if (res.success) {
        refreshDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNativeShare = async () => {
    audioSynth.playClick();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ludo Waiting Lounge Invite',
          text: shareMessage,
          url: inviteLink
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      handleCopyLink();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white bg-slate-950">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide">Syncing waiting lounge...</p>
      </div>
    );
  }

  if (error || !lobby) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center text-center text-white bg-slate-950 max-w-md mx-auto">
        <AlertTriangle className="text-red-500 mb-4" size={48} />
        <h3 className="text-lg font-black mb-2">Lounge Error</h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">{error || 'Could not load private lobby.'}</p>
        <button
          onClick={() => { audioSynth.playClick(); onNavigate('home'); }}
          className="w-full glass-btn bg-indigo-600 py-3 rounded-xl text-sm font-black uppercase"
        >
          Return Home
        </button>
      </div>
    );
  }

  const allReady = lobby.players.length >= 2 && lobby.players.every(p => p.isReady);
  const maxCap = lobby.maxPlayers || 4;

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-xl mx-auto relative flex flex-col justify-between text-white">
      {/* Background Blur */}
      <div className="absolute top-[10%] left-[25%] w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLeaveRoom}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all duration-300 active:scale-95 shadow"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-lg font-extrabold tracking-wide">Waiting Lounge</h2>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">
                Stake: ₹{lobby.entryFee} coins &bull; {maxCap} Players
              </span>
            </div>
          </div>
          
          <button
            onClick={() => { audioSynth.playClick(); setShowFriends(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-black uppercase tracking-wider transition-all active:scale-95"
          >
            <UserPlus size={14} />
            Invite Friends
          </button>
        </div>

        {/* Room Code Info */}
        <GlassCard className="p-5 border-white/20 bg-white/10 dark:bg-black/35 shadow-xl space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-slate-400 block uppercase">ROOM INVITE CODE</span>
              <span className="text-2xl font-black tracking-widest text-white">{lobby.roomId}</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { audioSynth.playClick(); setShowQrModal(true); }}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all"
                title="Generate QR Code"
              >
                <QrCode size={16} />
              </button>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold transition-all"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? 'Link Copied' : 'Copy link'}
              </button>
            </div>
          </div>

          {/* Social Shares */}
          <div className="pt-3 border-t border-white/10">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
              Share Lounge Invite via
            </span>
            <div className="grid grid-cols-6 gap-1.5">
              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => audioSynth.playClick()}
                className="py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] rounded-xl text-center text-[9px] font-black uppercase transition-all"
              >
                WA
              </a>
              {/* Telegram */}
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => audioSynth.playClick()}
                className="py-2 bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/30 text-[#0088cc] rounded-xl text-center text-[9px] font-black uppercase transition-all"
              >
                TG
              </a>
              {/* Facebook */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => audioSynth.playClick()}
                className="py-2 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30 text-[#1877F2] rounded-xl text-center text-[9px] font-black uppercase transition-all"
              >
                FB
              </a>
              {/* Messenger */}
              <a
                href={`fb-messenger://share/?link=${encodeURIComponent(inviteLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => audioSynth.playClick()}
                className="py-2 bg-[#0084FF]/10 hover:bg-[#0084FF]/20 border border-[#0084FF]/30 text-[#0084FF] rounded-xl text-center text-[9px] font-black uppercase transition-all"
              >
                MSGR
              </a>
              {/* Native share API */}
              <button
                onClick={handleNativeShare}
                className="py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-xl text-center text-[9px] font-black uppercase transition-all"
              >
                Share
              </button>
              {/* Copy Direct */}
              <button
                onClick={handleCopyLink}
                className="py-2 bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/30 text-slate-350 rounded-xl text-center text-[9px] font-black uppercase transition-all"
              >
                Copy
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Players List Grid */}
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
            JOINED WARRIORS ({lobby.players.length}/{maxCap})
          </span>

          <div className="space-y-2.5">
            {lobby.players.map((player) => {
              const isCurrentUser = player.userId === currentUser?._id;
              const isPlayerHost = player.userId === lobby.hostId;

              return (
                <div
                  key={player.userId}
                  className={`p-3.5 bg-white/5 border rounded-2xl flex items-center justify-between transition-all
                    ${isCurrentUser ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-white/10'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    {/* Color Flag + Avatar */}
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center font-black text-sm text-indigo-200">
                        {player.avatar.replace('avatar_', '')}
                      </div>
                      <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900
                        ${player.color === 'red' ? 'bg-red-500' : ''}
                        ${player.color === 'green' ? 'bg-emerald-500' : ''}
                        ${player.color === 'yellow' ? 'bg-amber-400' : ''}
                        ${player.color === 'blue' ? 'bg-blue-500' : ''}
                      `} />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black">{player.name}</span>
                        {isCurrentUser && <span className="text-[9px] text-slate-400">(You)</span>}
                        {isPlayerHost && <Shield size={10} className="text-yellow-500" />}
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider block mt-0.5
                        ${player.isReady ? 'text-emerald-400' : 'text-amber-500 animate-pulse'}
                      `}>
                        {player.isReady ? 'Ready' : 'Not Ready'}
                      </span>
                    </div>
                  </div>

                  {/* Host Controls for other players */}
                  {isHost && !isCurrentUser && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleTransferHost(player.userId)}
                        className="px-2.5 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/25 text-yellow-500 text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Make Host
                      </button>
                      <button
                        onClick={() => handleKickPlayer(player.userId)}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-500 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, maxCap - lobby.players.length) }).map((_, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-white/5 border border-dashed border-white/10 rounded-2xl flex items-center justify-between opacity-55"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-dashed border-white/20 rounded-xl flex items-center justify-center font-black text-slate-650">
                    ?
                  </div>
                  <span className="text-xs font-bold text-slate-500 italic">Empty slot</span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { audioSynth.playClick(); setShowFriends(true); }}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-400 text-[9px] font-black uppercase tracking-wider transition-all"
                  >
                    Invite Friend
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-450 hover:text-white transition-all"
                    title="Share Room Invite"
                  >
                    <Share2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invited Friend Invitation Logs */}
        {lobby.invites && lobby.invites.length > 0 && (
          <div className="mt-5 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              INVITATION HISTORY ({lobby.invites.length})
            </span>
            <div className="space-y-1.5">
              {lobby.invites.map((invite) => (
                <div key={invite._id} className="p-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between opacity-80">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-950/20 border border-indigo-900/35 flex items-center justify-center text-xs text-indigo-300 font-bold">
                      {invite.avatar.replace('avatar_', '')}
                    </div>
                    <div>
                      <span className="text-xs font-bold block">
                        {invite.name}{' '}
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-[8px] font-bold text-indigo-400">
                          LVL {invite.level}
                        </span>
                      </span>
                      <span className="text-[8px] text-slate-500 block font-semibold">{invite.friendId}</span>
                    </div>
                  </div>
                  <div>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wide
                      ${invite.status === 'joined' ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400' : ''}
                      ${invite.status === 'accepted' ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400' : ''}
                      ${invite.status === 'declined' ? 'bg-red-600/10 border-red-500/20 text-red-400' : ''}
                      ${invite.status === 'waiting' ? 'bg-white/5 border-white/10 text-slate-400 animate-pulse' : ''}
                    `}>
                      {invite.status === 'waiting' ? 'Waiting...' : invite.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Primary Actions Panel */}
      <div className="mt-8 space-y-3">
        {isHost ? (
          <div className="space-y-2">
            <button
              onClick={handleStartGame}
              disabled={!allReady}
              className={`w-full py-4 rounded-xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98
                ${allReady
                  ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500 shadow-indigo-600/35 border-t border-white/20'
                  : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                }
              `}
            >
              <Play size={16} className={allReady ? 'fill-current' : ''} />
              Start Match Lounge
            </button>
            {!allReady && (
              <span className="text-[10px] text-amber-500 font-bold tracking-wide uppercase text-center block animate-pulse">
                * Match requires at least 2 players, and all joined players must be Ready.
              </span>
            )}
          </div>
        ) : (
          <button
            onClick={handleToggleReady}
            className={`w-full py-4 rounded-xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all border shadow-lg active:scale-98
              ${lobby.players.find(p => p.userId === currentUser?._id)?.isReady
                ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-500/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-indigo-600/20'
              }
            `}
          >
            <CheckCircle size={16} />
            {lobby.players.find(p => p.userId === currentUser?._id)?.isReady ? 'Im Ready!' : 'Ready Up'}
          </button>
        )}

        <button
          onClick={handleLeaveRoom}
          className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5"
        >
          <LogOut size={14} />
          Leave Lobby Room
        </button>
      </div>

      {/* Friends Network Panel Drawer */}
      {showFriends && (
        <FriendsPanel 
          onClose={() => setShowFriends(false)} 
          onNavigate={onNavigate} 
        />
      )}

      {/* QR Code generator Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <GlassCard className="max-w-sm w-full p-6 bg-slate-900 border-2 border-white/20 text-center space-y-4 text-white relative animate-scale-up">
            <button
              onClick={() => { audioSynth.playClick(); setShowQrModal(false); }}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
            <h4 className="text-sm font-black uppercase tracking-wider text-indigo-400">Lounge QR Code</h4>
            <p className="text-[10px] text-slate-400">Scan this QR code with another device to join this waiting lounge instantly.</p>
            
            <div className="bg-white p-3 rounded-2xl inline-block shadow-inner mx-auto my-2">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteLink)}`}
                alt="Lobby QR Code"
                className="w-[180px] h-[180px]"
              />
            </div>

            <div className="pt-2">
              <button
                onClick={handleCopyLink}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all active:scale-95 shadow"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Link Copied' : 'Copy Lobby Link'}
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default LobbyRoom;
