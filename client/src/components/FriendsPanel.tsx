import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { apiRequest } from '../services/api';
import socketClient from '../services/socket';
import GlassCard from './GlassCard';
import audioSynth from '../utils/audio';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Check, 
  X, 
  Search, 
  Clock, 
  Loader,
  Copy,
  Share2,
  Ban,
  Unlock
} from 'lucide-react';

interface FriendsPanelProps {
  onClose: () => void;
  onNavigate: (page: string, data?: any) => void;
}

interface FriendType {
  _id: string;
  name: string;
  avatar: string;
  friendId: string;
  level: number;
  lastSeen: string;
  status: 'online' | 'offline';
}

interface RequestType {
  _id: string;
  sender: {
    _id: string;
    name: string;
    avatar: string;
    friendId: string;
  };
  status: 'pending';
}

interface SentRequestType {
  _id: string;
  receiver: {
    _id: string;
    name: string;
    avatar: string;
    friendId: string;
    level: number;
  };
  status: 'pending';
}

interface BlockedUserType {
  _id: string;
  name: string;
  avatar: string;
  friendId: string;
  level: number;
}

const FriendsPanel: React.FC<FriendsPanelProps> = ({ onClose, onNavigate }) => {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const [activeTab, setActiveTab] = useState<'friends' | 'add' | 'requests' | 'invites'>('friends');
  const [requestSubTab, setRequestSubTab] = useState<'incoming' | 'sent'>('incoming');
  
  const [friends, setFriends] = useState<FriendType[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<RequestType[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequestType[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserType[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchError, setSearchError] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Load all lists
  const loadData = async () => {
    try {
      const [friendsRes, incomingRes, sentRes, blockedRes] = await Promise.all([
        apiRequest('/friends/list'),
        apiRequest('/friends/requests'),
        apiRequest('/friends/sent-requests'),
        apiRequest('/friends/blocked')
      ]);

      if (friendsRes.success) {
        setFriends(friendsRes.friends);
      }
      if (incomingRes.success) {
        setIncomingRequests(incomingRes.requests);
      }
      if (sentRes.success) {
        setSentRequests(sentRes.requests);
      }
      if (blockedRes.success) {
        setBlockedUsers(blockedRes.blocked);
      }
    } catch (err) {
      console.error('Error loading friends details:', err);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to realtime socket updates
    const handleFriendOnline = ({ userId }: { userId: string }) => {
      setFriends(prev => prev.map(f => f._id === userId ? { ...f, status: 'online' } : f));
    };

    const handleFriendOffline = ({ userId }: { userId: string }) => {
      setFriends(prev => prev.map(f => f._id === userId ? { ...f, status: 'offline', lastSeen: new Date().toISOString() } : f));
    };

    const handleUpdate = () => {
      loadData();
    };

    socketClient.on('friend:online', handleFriendOnline);
    socketClient.on('friend:offline', handleFriendOffline);
    socketClient.on('friend_request:received', handleUpdate);
    socketClient.on('friend_request:accepted', handleUpdate);

    return () => {
      socketClient.off('friend:online', handleFriendOnline);
      socketClient.off('friend:offline', handleFriendOffline);
      socketClient.off('friend_request:received', handleUpdate);
      socketClient.off('friend_request:accepted', handleUpdate);
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearchError('');
    setSearchResult(null);

    try {
      const res = await apiRequest(`/friends/search?query=${encodeURIComponent(searchQuery.trim())}`);
      if (res.success && res.user) {
        setSearchResult(res.user);
      } else {
        setSearchError(res.message || 'No user found with that Friend ID or Username.');
      }
    } catch (err) {
      setSearchError('Error searching for user.');
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (userId: string) => {
    audioSynth.playClick();
    setActionLoading(userId);
    try {
      const res = await apiRequest('/friends/request', {
        method: 'POST',
        body: JSON.stringify({ recipientId: userId })
      });
      if (res.success) {
        setSearchResult(prev => prev ? { ...prev, isRequestSent: true } : null);
        loadData();
      } else {
        setSearchError(res.message || 'Failed to send request.');
      }
    } catch (err) {
      setSearchError('Failed to send friend request.');
    } finally {
      setActionLoading(null);
    }
  };

  const cancelRequest = async (requestId: string) => {
    audioSynth.playClick();
    setActionLoading(requestId);
    try {
      const res = await apiRequest('/friends/cancel-request', {
        method: 'POST',
        body: JSON.stringify({ requestId })
      });
      if (res.success) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const acceptRequest = async (requestId: string) => {
    audioSynth.playClick();
    setActionLoading(requestId);
    try {
      const res = await apiRequest('/friends/accept', {
        method: 'POST',
        body: JSON.stringify({ requestId })
      });
      if (res.success) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const rejectRequest = async (requestId: string) => {
    audioSynth.playClick();
    setActionLoading(requestId);
    try {
      const res = await apiRequest('/friends/reject', {
        method: 'POST',
        body: JSON.stringify({ requestId })
      });
      if (res.success) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    audioSynth.playClick();
    setActionLoading(friendId);
    try {
      const res = await apiRequest('/friends/remove', {
        method: 'POST',
        body: JSON.stringify({ friendId })
      });
      if (res.success) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const blockUser = async (targetUserId: string) => {
    if (!window.confirm('Are you sure you want to block this user?')) return;
    audioSynth.playClick();
    setActionLoading(targetUserId);
    try {
      const res = await apiRequest('/friends/block', {
        method: 'POST',
        body: JSON.stringify({ targetUserId })
      });
      if (res.success) {
        setSearchResult(prev => prev ? { ...prev, isBlocked: true, isFriend: false, isRequestSent: false, isRequestReceived: false } : null);
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const unblockUser = async (targetUserId: string) => {
    audioSynth.playClick();
    setActionLoading(targetUserId);
    try {
      const res = await apiRequest('/friends/unblock', {
        method: 'POST',
        body: JSON.stringify({ targetUserId })
      });
      if (res.success) {
        setSearchResult(prev => prev ? { ...prev, isBlocked: false } : null);
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const inviteToPlay = async (friendId: string) => {
    audioSynth.playClick();
    setActionLoading(friendId);
    try {
      const stateStr = localStorage.getItem('currentGameRoomId');
      if (!stateStr) {
        alert('You must host a private room match before inviting friends!');
        return;
      }

      const res = await apiRequest('/room/invite', {
        method: 'POST',
        body: JSON.stringify({ roomId: stateStr, friendId })
      });
      
      if (res.success) {
        alert('Invitation sent successfully!');
      } else {
        alert(res.message || 'Failed to send invite.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const formatLastSeen = (isoStr: string) => {
    if (!isoStr) return 'offline';
    const date = new Date(isoStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Share Message Builder
  const friendIdCode = currentUser?.friendId || 'FR-000000';
  const referralLink = `${window.location.origin}/register?ref=${friendIdCode}`;
  const shareMessage = `🎲 Join me on Antigravity Ludo!\n\nPlay Real Money Ludo with me.\n\nJoin using my invite link:\n${referralLink}`;

  const copyInviteLink = () => {
    audioSynth.playClick();
    navigator.clipboard.writeText(referralLink);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    audioSynth.playClick();
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  const shareViaTelegram = () => {
    audioSynth.playClick();
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  const shareViaFacebook = () => {
    audioSynth.playClick();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const shareViaMessenger = () => {
    audioSynth.playClick();
    window.open(`fb-messenger://share/?link=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const handleNativeShare = async () => {
    audioSynth.playClick();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Antigravity Ludo',
          text: 'Play Real Money Ludo with me!',
          url: referralLink
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      copyInviteLink();
    }
  };

  // Determine if user is hosting a waiting room currently
  const inLounge = !!localStorage.getItem('currentGameRoomId');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
      <GlassCard className="max-w-md w-full h-[580px] bg-slate-900 border-2 border-white/20 dark:border-white/10 shadow-2xl flex flex-col justify-between p-6 text-white relative animate-fade-in">
        
        {/* Close Button */}
        <button
          onClick={() => { audioSynth.playClick(); onClose(); }}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-400 hover:text-white transition-all active:scale-95"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-wide">Ludo Network</h3>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Manage network, blocks & referral links
            </p>
          </div>
        </div>

        {/* Outer Tabs */}
        <div className="flex border-b border-white/10 mb-4 text-xs font-bold text-slate-400">
          <button
            onClick={() => { audioSynth.playClick(); setActiveTab('friends'); }}
            className={`flex-1 pb-3 text-center transition-all ${
              activeTab === 'friends' ? 'text-indigo-400 border-b-2 border-indigo-400 font-black' : 'hover:text-slate-200'
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => { audioSynth.playClick(); setActiveTab('add'); }}
            className={`flex-1 pb-3 text-center transition-all ${
              activeTab === 'add' ? 'text-indigo-400 border-b-2 border-indigo-400 font-black' : 'hover:text-slate-200'
            }`}
          >
            Add Friend
          </button>
          <button
            onClick={() => { audioSynth.playClick(); setActiveTab('requests'); }}
            className={`flex-1 pb-3 text-center transition-all relative ${
              activeTab === 'requests' ? 'text-indigo-400 border-b-2 border-indigo-400 font-black' : 'hover:text-slate-200'
            }`}
          >
            Requests
            {incomingRequests.length > 0 && (
              <span className="absolute -top-1.5 right-1 w-4 h-4 bg-red-500 text-[9px] font-black text-white rounded-full flex items-center justify-center animate-pulse">
                {incomingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { audioSynth.playClick(); setActiveTab('invites'); }}
            className={`flex-1 pb-3 text-center transition-all ${
              activeTab === 'invites' ? 'text-indigo-400 border-b-2 border-indigo-400 font-black' : 'hover:text-slate-200'
            }`}
          >
            Invites
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto mb-4 min-h-0 pr-1 space-y-3">
          
          {/* Tab 1: Friends List */}
          {activeTab === 'friends' && (
            friends.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-450 py-12">
                <Users size={40} className="text-slate-600 opacity-40 mb-2" />
                <p className="text-xs font-bold text-slate-500">No friends added yet.</p>
                <p className="text-[10px] text-slate-650 mt-1">Search and connect with other users in the next tab.</p>
              </div>
            ) : (
              friends.map(friend => (
                <div 
                  key={friend._id}
                  className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center font-black text-sm text-indigo-300">
                        {friend.avatar.replace('avatar_', '')}
                      </div>
                      <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-slate-900 rounded-full ${
                        friend.status === 'online' ? 'bg-emerald-500' : 'bg-slate-500'
                      }`} />
                    </div>
                    {/* Details */}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-black tracking-wide">{friend.name}</h4>
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[8px] font-bold text-indigo-400">
                          LVL {friend.level}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 block font-semibold">
                        {friend.friendId} &bull; {friend.status === 'online' ? 'Online' : `Last seen ${formatLastSeen(friend.lastSeen)}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Invite Button */}
                    <button
                      onClick={() => inviteToPlay(friend._id)}
                      disabled={friend.status !== 'online' || !inLounge || actionLoading === friend._id}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all
                        ${friend.status === 'online' && inLounge
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 shadow'
                          : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                        }
                      `}
                      title={!inLounge ? 'You must be hosting a lobby to invite' : 'Invite Friend'}
                    >
                      {actionLoading === friend._id ? <Loader size={12} className="animate-spin" /> : 'Invite'}
                    </button>

                    {/* Block Button */}
                    <button
                      onClick={() => blockUser(friend._id)}
                      disabled={actionLoading === friend._id}
                      className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-all border border-white/5"
                      title="Block User"
                    >
                      <Ban size={12} />
                    </button>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeFriend(friend._id)}
                      disabled={actionLoading === friend._id}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl transition-all active:scale-95"
                      title="Remove Friend"
                    >
                      <UserMinus size={12} />
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {/* Tab 2: Add Friend / Search */}
          {activeTab === 'add' && (
            <div className="space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Friend ID (e.g. FR-123456) or Username"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !searchQuery.trim()}
                  className="px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl text-xs font-bold transition-all active:scale-95"
                >
                  {loading ? <Loader size={14} className="animate-spin" /> : 'Search'}
                </button>
              </form>

              {searchError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-semibold text-center">
                  {searchError}
                </div>
              )}

              {searchResult && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center font-black text-sm text-indigo-300">
                      {searchResult.avatar.replace('avatar_', '')}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-black">{searchResult.name}</h4>
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[8px] font-bold text-indigo-400">
                          LVL {searchResult.level}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-semibold block">{searchResult.friendId}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {searchResult.isBlocked ? (
                      <button
                        onClick={() => unblockUser(searchResult._id)}
                        disabled={actionLoading === searchResult._id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/35 text-red-450 border border-red-500/30 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all"
                      >
                        <Unlock size={11} /> Unblock
                      </button>
                    ) : searchResult.isFriend ? (
                      <span className="text-[9px] text-slate-550 border border-slate-700 px-3 py-1.5 rounded-xl font-bold bg-white/5">
                        Friends
                      </span>
                    ) : searchResult.isRequestSent ? (
                      <span className="flex items-center gap-1 text-[9px] text-slate-400 font-bold bg-white/5 px-3 py-1.5 border border-white/5 rounded-xl">
                        <Clock size={11} /> Sent
                      </span>
                    ) : searchResult.isRequestReceived ? (
                      <span className="text-[9px] text-indigo-455 bg-indigo-500/10 border border-indigo-500/25 px-3 py-1.5 rounded-xl font-bold">
                        Pending Accept
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => sendRequest(searchResult._id)}
                          disabled={actionLoading === searchResult._id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow"
                        >
                          {actionLoading === searchResult._id ? <Loader size={12} className="animate-spin" /> : <><UserPlus size={11} /> Add</>}
                        </button>
                        <button
                          onClick={() => blockUser(searchResult._id)}
                          className="p-2 bg-slate-800 text-slate-400 rounded-xl hover:bg-red-500/10 border border-white/5 hover:text-red-400"
                        >
                          <Ban size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Blocked Users Section */}
              <div className="pt-4 border-t border-white/10 space-y-2">
                <h5 className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Blocked Users ({blockedUsers.length})</h5>
                {blockedUsers.length === 0 ? (
                  <p className="text-[10px] text-slate-550 italic">No blocked users.</p>
                ) : (
                  blockedUsers.map(b => (
                    <div key={b._id} className="p-2.5 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-red-950/20 border border-red-900/30 flex items-center justify-center font-bold text-xs text-red-400">
                          {b.avatar.replace('avatar_', '')}
                        </div>
                        <div>
                          <span className="text-xs font-bold block">{b.name}</span>
                          <span className="text-[8px] text-slate-500 font-semibold">{b.friendId}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => unblockUser(b._id)}
                        disabled={actionLoading === b._id}
                        className="p-1 px-2.5 bg-white/5 hover:bg-white/15 text-slate-350 hover:text-white border border-white/10 rounded-lg text-[9px] font-bold transition-all"
                      >
                        Unblock
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Requests (splits into Incoming / Sent) */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <div className="flex bg-white/5 rounded-xl p-1 text-[10px] font-bold text-slate-400">
                <button
                  onClick={() => setRequestSubTab('incoming')}
                  className={`flex-1 py-1.5 text-center rounded-lg transition-all ${
                    requestSubTab === 'incoming' ? 'bg-indigo-600 text-white font-black' : 'hover:text-slate-200'
                  }`}
                >
                  Incoming ({incomingRequests.length})
                </button>
                <button
                  onClick={() => setRequestSubTab('sent')}
                  className={`flex-1 py-1.5 text-center rounded-lg transition-all ${
                    requestSubTab === 'sent' ? 'bg-indigo-600 text-white font-black' : 'hover:text-slate-200'
                  }`}
                >
                  Sent ({sentRequests.length})
                </button>
              </div>

              {requestSubTab === 'incoming' ? (
                incomingRequests.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-450 py-12">
                    <Clock size={36} className="text-slate-650 opacity-40 mb-2" />
                    <p className="text-xs font-bold text-slate-500">No incoming requests.</p>
                  </div>
                ) : (
                  incomingRequests.map(req => (
                    <div
                      key={req._id}
                      className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center font-black text-sm text-indigo-300">
                          {req.sender.avatar.replace('avatar_', '')}
                        </div>
                        <div>
                          <h4 className="text-xs font-black">{req.sender.name}</h4>
                          <span className="text-[9px] text-slate-450 font-semibold">{req.sender.friendId}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => acceptRequest(req._id)}
                          disabled={actionLoading === req._id}
                          className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all active:scale-95 shadow"
                          title="Accept Friend"
                        >
                          {actionLoading === req._id ? <Loader size={12} className="animate-spin" /> : <Check size={14} />}
                        </button>

                        <button
                          onClick={() => rejectRequest(req._id)}
                          disabled={actionLoading === req._id}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl transition-all active:scale-95"
                          title="Reject Request"
                        >
                          {actionLoading === req._id ? <Loader size={12} className="animate-spin" /> : <X size={14} />}
                        </button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                sentRequests.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-450 py-12">
                    <Clock size={36} className="text-slate-650 opacity-40 mb-2" />
                    <p className="text-xs font-bold text-slate-500">No sent requests.</p>
                  </div>
                ) : (
                  sentRequests.map(req => (
                    <div
                      key={req._id}
                      className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center font-black text-sm text-indigo-300">
                          {req.receiver.avatar.replace('avatar_', '')}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <h4 className="text-xs font-black">{req.receiver.name}</h4>
                            <span className="px-1 py-0.5 rounded bg-indigo-500/10 text-[8px] font-bold text-indigo-400">LVL {req.receiver.level}</span>
                          </div>
                          <span className="text-[9px] text-slate-450 font-semibold">{req.receiver.friendId}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => cancelRequest(req._id)}
                        disabled={actionLoading === req._id}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95"
                      >
                        Cancel
                      </button>
                    </div>
                  ))
                )
              )}
            </div>
          )}

          {/* Tab 4: Referral Invites */}
          {activeTab === 'invites' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl text-center space-y-2">
                <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-[9px] font-black tracking-wider text-indigo-300 uppercase border border-indigo-500/30">
                  Refer & Earn Arena
                </span>
                <h4 className="text-xs font-black text-indigo-150">Invite allies & play with friends</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Earn bonus coins for every verified signup, and automatically add them as friends!
                </p>
              </div>

              {/* Referral Code link card */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3.5">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 tracking-wider block uppercase mb-1">
                    YOUR PERMANENT INVITE LINK
                  </span>
                  <div className="flex items-center justify-between p-2.5 bg-black/35 border border-white/10 rounded-xl">
                    <span className="text-[10px] font-medium truncate text-indigo-300 font-mono pr-2">
                      {referralLink}
                    </span>
                    <button
                      onClick={copyInviteLink}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 shadow"
                    >
                      {inviteCopied ? 'Copied' : <><Copy size={11} /> Copy</>}
                    </button>
                  </div>
                </div>

                {/* Share Grid */}
                <div>
                  <span className="text-[9px] font-bold text-slate-400 tracking-wider block uppercase mb-2">
                    SHARE LINK VIA
                  </span>
                  <div className="grid grid-cols-5 gap-2">
                    <button
                      onClick={shareViaWhatsApp}
                      className="py-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] rounded-xl text-center text-[10px] font-black uppercase transition-all active:scale-95"
                    >
                      WA
                    </button>
                    <button
                      onClick={shareViaTelegram}
                      className="py-2.5 bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/30 text-[#0088cc] rounded-xl text-center text-[10px] font-black uppercase transition-all active:scale-95"
                    >
                      TG
                    </button>
                    <button
                      onClick={shareViaFacebook}
                      className="py-2.5 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30 text-[#1877F2] rounded-xl text-center text-[10px] font-black uppercase transition-all active:scale-95"
                    >
                      FB
                    </button>
                    <button
                      onClick={shareViaMessenger}
                      className="py-2.5 bg-[#0084FF]/10 hover:bg-[#0084FF]/20 border border-[#0084FF]/30 text-[#0084FF] rounded-xl text-center text-[10px] font-black uppercase transition-all active:scale-95"
                    >
                      MSGR
                    </button>
                    <button
                      onClick={handleNativeShare}
                      className="py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-xl text-center text-[10px] font-black uppercase transition-all active:scale-95 flex items-center justify-center gap-0.5"
                    >
                      <Share2 size={11} /> Share
                    </button>
                  </div>
                </div>
              </div>

              {/* Referral Statistics */}
              <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1.5 text-indigo-300">
                  <Users size={14} /> Total Referral Sign-ups:
                </span>
                <span className="text-white font-black text-sm">
                  {currentUser?.referralsCount || 0}
                </span>
              </div>
            </div>
          )}

        </div>
      </GlassCard>
    </div>
  );
};

export default FriendsPanel;
