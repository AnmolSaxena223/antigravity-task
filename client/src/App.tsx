import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './store';
import { setTheme } from './store/uiSlice';
import { apiRequest } from './services/api';
import socketClient from './services/socket';
import audioSynth from './utils/audio';
import { X } from 'lucide-react';

// Import Screens
import SplashScreen from './pages/SplashScreen';
import Login from './pages/Login';
import Register from './pages/Register';
import OtpVerification from './pages/OtpVerification';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Wallet from './pages/Wallet';
import CreateRoom from './pages/CreateRoom';
import JoinRoom from './pages/JoinRoom';
import GameRoom from './pages/GameRoom';
import MatchHistory from './pages/MatchHistory';
import Leaderboard from './pages/Leaderboard';
import Referral from './pages/Referral';
import Settings from './pages/Settings';
import Support from './pages/Support';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import AdminPanel from './pages/AdminPanel';
import LobbyRoom from './pages/LobbyRoom';

interface AppNotification {
  id: string;
  type: 'friend_request' | 'invite' | 'online' | 'match_started';
  title: string;
  message: string;
  data?: any;
}

const App: React.FC = () => {
  const dispatch = useDispatch();
  
  // Get variables from Redux Store
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const theme = useSelector((state: RootState) => state.ui.theme);

  // Router States
  const [page, setPage] = useState<string>('splash');
  const [navData, setNavData] = useState<any>(null);
  
  // Real-time Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Socket notification listeners
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    const addNotification = (notif: Omit<AppNotification, 'id'>) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newNotif = { ...notif, id };
      setNotifications(prev => [...prev, newNotif]);

      // Play system chime sound
      audioSynth.playClick();

      // Auto dismiss informational toasts after 4 seconds
      if (notif.type === 'online' || notif.type === 'match_started') {
        setTimeout(() => {
          dismissNotification(id);
        }, 4000);
      }
    };

    const handleFriendRequest = (data: { requestId: string; sender: { name: string } }) => {
      addNotification({
        type: 'friend_request',
        title: '👥 Friend Request',
        message: `${data.sender.name} wants to be friends!`,
        data: { requestId: data.requestId }
      });
    };

    const handleRoomInvite = (data: { inviteId: string; roomId: string; entryFee: number; inviter: { name: string } }) => {
      addNotification({
        type: 'invite',
        title: '🎲 Game Invitation',
        message: `${data.inviter.name} invited you to play! (Stake: ₹${data.entryFee})`,
        data: { roomId: data.roomId, inviteId: data.inviteId }
      });
    };

    const handleFriendOnlineStatus = (data: { userId: string; name: string }) => {
      addNotification({
        type: 'online',
        title: '⚡ Friend Online',
        message: `${data.name} is now online.`
      });
    };

    const handleGameStartedNotif = (gameSession: any) => {
      addNotification({
        type: 'match_started',
        title: '🏆 Match Started!',
        message: `Ludo match room ${gameSession.roomId} has begun!`
      });
    };

    socketClient.on('friend_request:received', handleFriendRequest);
    socketClient.on('invite:received', handleRoomInvite);
    socketClient.on('friend:online', handleFriendOnlineStatus);
    socketClient.on('game:started', handleGameStartedNotif);

    return () => {
      socketClient.off('friend_request:received', handleFriendRequest);
      socketClient.off('invite:received', handleRoomInvite);
      socketClient.off('friend:online', handleFriendOnlineStatus);
      socketClient.off('game:started', handleGameStartedNotif);
    };
  }, [isAuthenticated]);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleAcceptFriend = async (notifId: string, requestId: string) => {
    dismissNotification(notifId);
    try {
      await apiRequest('/friends/accept', {
        method: 'POST',
        body: JSON.stringify({ requestId })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectFriend = async (notifId: string, requestId: string) => {
    dismissNotification(notifId);
    try {
      await apiRequest('/friends/reject', {
        method: 'POST',
        body: JSON.stringify({ requestId })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinInviteRoom = async (notifId: string, roomId: string) => {
    dismissNotification(notifId);
    handleNavigate('lobby', { roomId, autoJoin: true });
  };

  const handleDeclineInvite = async (notifId: string, inviteId: string) => {
    dismissNotification(notifId);
    try {
      await apiRequest('/room/decline-invite', {
        method: 'POST',
        body: JSON.stringify({ inviteId })
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Parse invite link on app mount
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/(invite|room)\/([a-zA-Z0-9\-]+)$/);
    if (match) {
      const type = match[1];
      const inviteRoomId = match[2];
      console.log(`[App] Parsed link type: ${type}, ID:`, inviteRoomId);
      
      if (type === 'invite') {
        // Direct friend/referral invite link
        localStorage.setItem('pendingReferralCode', inviteRoomId);
      } else if (type === 'room') {
        // Direct room lobby join link
        localStorage.setItem('pendingInviteRoomId', inviteRoomId);
      }
      
      // Clean URL pathname so user is clean on splash/login
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  // Redirect to lobby if user becomes authenticated and has a pending invite link
  useEffect(() => {
    if (page === 'splash') return;
    
    if (isAuthenticated) {
      const pendingRoomId = localStorage.getItem('pendingInviteRoomId');
      if (pendingRoomId) {
        localStorage.removeItem('pendingInviteRoomId');
        handleNavigate('lobby', { roomId: pendingRoomId, autoJoin: true });
      }
    }
  }, [isAuthenticated, page]);

  // Initialize theme class
  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      body.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      body.classList.add('light');
    }
  }, [theme]);

  // Navigate function wrapper
  const handleNavigate = (targetPage: string, data: any = null) => {
    setPage(targetPage);
    setNavData(data);
  };

  // Auth Guard redirects
  useEffect(() => {
    if (page === 'splash') return;
    
    if (isAuthenticated) {
      // If user is authenticated and is on auth screens, push to home
      if (['login', 'register', 'otp-verification'].includes(page)) {
        setPage('home');
      }
    } else {
      // If not authenticated and tries visiting protected screens, push to login
      if (!['splash', 'login', 'register', 'otp-verification', 'privacy-policy', 'terms-conditions'].includes(page)) {
        setPage('login');
      }
    }
  }, [isAuthenticated, page]);

  // Visual screen router
  const renderPage = () => {
    switch (page) {
      case 'splash':
        return <SplashScreen onFinish={() => handleNavigate(isAuthenticated ? 'home' : 'login')} />;
      case 'login':
        return <Login onNavigate={handleNavigate} />;
      case 'register':
        return <Register onNavigate={handleNavigate} />;
      case 'otp-verification':
        return <OtpVerification data={navData} onNavigate={handleNavigate} />;
      case 'home':
        return <Home onNavigate={handleNavigate} />;
      case 'profile':
        return <Profile onNavigate={handleNavigate} />;
      case 'wallet':
        return <Wallet onNavigate={handleNavigate} />;
      case 'create-room':
        return <CreateRoom data={navData} onNavigate={handleNavigate} />;
      case 'join-room':
        return <JoinRoom onNavigate={handleNavigate} />;
      case 'game-room':
        return <GameRoom onNavigate={handleNavigate} />;
      case 'match-history':
        return <MatchHistory onNavigate={handleNavigate} />;
      case 'leaderboard':
        return <Leaderboard onNavigate={handleNavigate} />;
      case 'referral':
        return <Referral onNavigate={handleNavigate} />;
      case 'settings':
        return <Settings onNavigate={handleNavigate} />;
      case 'support':
        return <Support onNavigate={handleNavigate} />;
      case 'privacy-policy':
        return <PrivacyPolicy onNavigate={handleNavigate} />;
      case 'terms-conditions':
        return <TermsConditions onNavigate={handleNavigate} />;
      case 'admin-panel':
        return <AdminPanel onNavigate={handleNavigate} />;
      case 'lobby':
        return <LobbyRoom data={navData} onNavigate={handleNavigate} />;
      default:
        return <Login onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="w-full min-h-screen select-none transition-colors duration-300 relative">
      {renderPage()}

      {/* Floating Glassmorphism Notification System */}
      <div className="fixed top-4 right-4 z-[9999] pointer-events-none max-w-sm w-full space-y-3 p-4">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className="pointer-events-auto p-4 bg-slate-900/90 dark:bg-black/90 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col gap-2.5 transition-all animate-bounce-slow"
            style={{
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            }}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider">{notif.title}</h4>
                <p className="text-xs text-slate-200 font-semibold leading-relaxed mt-1">{notif.message}</p>
              </div>
              <button 
                onClick={() => dismissNotification(notif.id)}
                className="text-slate-500 hover:text-slate-300 p-0.5 rounded-lg hover:bg-white/5 transition-all"
              >
                <X size={12} />
              </button>
            </div>
            
            {/* Interactive Actions */}
            {notif.type === 'friend_request' && (
              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => handleAcceptFriend(notif.id, notif.data.requestId)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRejectFriend(notif.id, notif.data.requestId)}
                  className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95"
                >
                  Reject
                </button>
              </div>
            )}

            {notif.type === 'invite' && (
              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => handleJoinInviteRoom(notif.id, notif.data.roomId)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
                >
                  Join Match
                </button>
                <button
                  onClick={() => handleDeclineInvite(notif.id, notif.data.inviteId)}
                  className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all border border-white/5 active:scale-95"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
