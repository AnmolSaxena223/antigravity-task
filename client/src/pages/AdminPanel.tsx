import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import GlassCard from '../components/GlassCard';
import audioSynth from '../utils/audio';
import {
  ArrowLeft,
  Users,
  Trophy,
  Activity,
  UserX,
  UserCheck,
  CheckCircle,
  XCircle,
  HelpCircle,
  ShieldCheck,
  DollarSign
} from 'lucide-react';

interface AdminPanelProps {
  onNavigate: (page: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'withdrawals' | 'games'>('stats');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manual balance adjustments form state
  const [selectedUserForAdjust, setSelectedUserForAdjust] = useState<any | null>(null);
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustBalType, setAdjustBalType] = useState<'deposit' | 'win' | 'bonus'>('deposit');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const [rejectWithdrawalId, setRejectWithdrawalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadStats = async () => {
    setLoading(true);
    const res = await apiRequest('/admin/stats');
    setLoading(false);
    if (res.success) setStats(res.stats);
    else setErrorMsg(res.message || 'Failed to load stats');
  };

  const loadUsers = async () => {
    setLoading(true);
    const res = await apiRequest('/admin/users?limit=30');
    setLoading(false);
    if (res.success) setUsers(res.users || []);
  };

  const loadWithdrawals = async () => {
    setLoading(true);
    const res = await apiRequest('/admin/withdrawals');
    setLoading(false);
    if (res.success) setWithdrawals(res.withdrawals || []);
  };

  const loadGames = async () => {
    setLoading(true);
    const res = await apiRequest('/admin/games');
    setLoading(false);
    if (res.success) setGames(res.games || []);
  };

  useEffect(() => {
    if (activeTab === 'stats') loadStats();
    else if (activeTab === 'users') loadUsers();
    else if (activeTab === 'withdrawals') loadWithdrawals();
    else if (activeTab === 'games') loadGames();
  }, [activeTab]);

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    audioSynth.playClick();
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    setLoading(true);
    const res = await apiRequest('/admin/user-status', {
      method: 'PUT',
      body: JSON.stringify({ userId, status: nextStatus })
    });
    setLoading(false);
    if (res.success) {
      loadUsers();
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForAdjust) return;
    audioSynth.playClick();
    setLoading(true);

    const res = await apiRequest('/admin/adjust-balance', {
      method: 'POST',
      body: JSON.stringify({
        userId: selectedUserForAdjust._id,
        type: adjustType,
        balanceType: adjustBalType,
        amount: parseFloat(adjustAmount),
        reason: adjustReason
      })
    });

    setLoading(false);
    if (res.success) {
      setSelectedUserForAdjust(null);
      setAdjustAmount('');
      setAdjustReason('');
      loadUsers();
    }
  };

  const handleApproveWithdrawal = async (transactionId: string) => {
    audioSynth.playClick();
    setLoading(true);
    const res = await apiRequest('/admin/approve-withdrawal', {
      method: 'POST',
      body: JSON.stringify({ transactionId })
    });
    setLoading(false);
    if (res.success) {
      loadWithdrawals();
    }
  };

  const handleRejectWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectWithdrawalId) return;
    audioSynth.playClick();
    setLoading(true);

    const res = await apiRequest('/admin/reject-withdrawal', {
      method: 'POST',
      body: JSON.stringify({
        transactionId: rejectWithdrawalId,
        reason: rejectReason
      })
    });

    setLoading(false);
    if (res.success) {
      setRejectWithdrawalId(null);
      setRejectReason('');
      loadWithdrawals();
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto relative flex flex-col justify-between">
      
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { audioSynth.playClick(); onNavigate('home'); }}
              className="p-2.5 rounded-xl bg-white/10 dark:bg-black/20 hover:bg-white/20 dark:hover:bg-black/35 border border-white/20 dark:border-white/10 text-slate-800 dark:text-white transition-all active:scale-95 shadow"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-xl font-extrabold tracking-wide dark:text-white flex items-center gap-2">
              <ShieldCheck className="text-indigo-500" />
              Admin Portal
            </h2>
          </div>
          
          {loading && (
            <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex bg-white/5 dark:bg-black/25 p-1 rounded-xl border border-white/10 mb-6 flex-wrap gap-1">
          <button
            onClick={() => { audioSynth.playClick(); setActiveTab('stats'); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'stats' ? 'bg-indigo-600 text-white shadow' : 'text-slate-800 dark:text-slate-400 hover:bg-white/5'}`}
          >
            Overview
          </button>
          <button
            onClick={() => { audioSynth.playClick(); setActiveTab('users'); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow' : 'text-slate-800 dark:text-slate-400 hover:bg-white/5'}`}
          >
            User Accounts
          </button>
          <button
            onClick={() => { audioSynth.playClick(); setActiveTab('withdrawals'); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'withdrawals' ? 'bg-indigo-600 text-white shadow' : 'text-slate-800 dark:text-slate-400 hover:bg-white/5'}`}
          >
            Withdrawal Claims
          </button>
          <button
            onClick={() => { audioSynth.playClick(); setActiveTab('games'); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'games' ? 'bg-indigo-600 text-white shadow' : 'text-slate-800 dark:text-slate-400 hover:bg-white/5'}`}
          >
            Games Audits
          </button>
        </div>

        {/* TAB CONTENTS */}

        {/* 1. Overview Tab */}
        {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <GlassCard className="p-4 bg-white/5 dark:bg-black/20 border-white/10">
              <span className="text-[10px] font-bold text-slate-850 dark:text-slate-400 block uppercase">Total Users</span>
              <span className="text-2xl font-black block mt-1 text-slate-900 dark:text-white flex items-center gap-1">
                <Users size={18} className="text-indigo-500" />
                {stats.totalUsers}
              </span>
            </GlassCard>

            <GlassCard className="p-4 bg-white/5 dark:bg-black/20 border-white/10">
              <span className="text-[10px] font-bold text-slate-850 dark:text-slate-400 block uppercase">Total Matches</span>
              <span className="text-2xl font-black block mt-1 text-slate-900 dark:text-white flex items-center gap-1">
                <Trophy size={18} className="text-yellow-500" />
                {stats.totalGames}
              </span>
            </GlassCard>

            <GlassCard className="p-4 bg-white/5 dark:bg-black/20 border-white/10">
              <span className="text-[10px] font-bold text-slate-850 dark:text-slate-400 block uppercase">Active Matches</span>
              <span className="text-2xl font-black block mt-1 text-slate-900 dark:text-white flex items-center gap-1">
                <Activity size={18} className="text-emerald-500 animate-pulse" />
                {stats.activeGames}
              </span>
            </GlassCard>

            <GlassCard className="p-4 bg-white/5 dark:bg-black/20 border-white/10 col-span-2 md:col-span-1">
              <span className="text-[10px] font-bold text-slate-850 dark:text-slate-400 block uppercase">Admin Comm Revenue</span>
              <span className="text-2xl font-black block mt-1 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <DollarSign size={18} />
                ₹{stats.platformRevenue.toFixed(1)}
              </span>
            </GlassCard>

            <GlassCard className="p-4 bg-white/5 dark:bg-black/20 border-white/10">
              <span className="text-[10px] font-bold text-slate-850 dark:text-slate-400 block uppercase">Total Deposits</span>
              <span className="text-xl font-extrabold block mt-1 text-slate-900 dark:text-white">₹{stats.totalDeposits}</span>
            </GlassCard>

            <GlassCard className="p-4 bg-white/5 dark:bg-black/20 border-white/10">
              <span className="text-[10px] font-bold text-slate-850 dark:text-slate-400 block uppercase">Total Payouts</span>
              <span className="text-xl font-extrabold block mt-1 text-slate-900 dark:text-white">₹{stats.totalWithdrawals}</span>
            </GlassCard>

            <GlassCard className="p-4 bg-white/5 dark:bg-black/20 border-white/10 col-span-2">
              <span className="text-[10px] font-bold text-slate-850 dark:text-slate-400 block uppercase">Pending Payouts Claims</span>
              <span className={`text-xl font-black block mt-1 ${stats.pendingWithdrawalsCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-500'}`}>
                {stats.pendingWithdrawalsCount} Pending Claim requests
              </span>
            </GlassCard>
          </div>
        )}

        {/* 2. User management Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {users.map((u) => (
              <GlassCard key={u._id} className="p-4 bg-white/5 dark:bg-black/20 border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <span className="text-xs sm:text-sm font-extrabold block dark:text-slate-200">{u.name} (Phone: {u.phone})</span>
                  <span className="text-[10px] text-slate-850 dark:text-slate-45px block mt-0.5 uppercase">
                    Balance: Dep: ₹{u.balance.deposit} | Win: ₹{u.balance.win} | Bonus: ₹{u.balance.bonus}
                  </span>
                  <span className="text-[9px] text-slate-800 dark:text-slate-500 block font-semibold mt-0.5">
                    Stats: Played: {u.gameStats.played} | Won: {u.gameStats.won} | Lost: {u.gameStats.lost}
                  </span>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => { audioSynth.playClick(); setSelectedUserForAdjust(u); }}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 text-xs font-bold"
                  >
                    Adjust balance
                  </button>

                  <button
                    onClick={() => handleToggleUserStatus(u._id, u.status)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border
                      ${u.status === 'active' 
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20' 
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'
                      }
                    `}
                  >
                    {u.status === 'active' ? <UserX size={12} /> : <UserCheck size={12} />}
                    {u.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* 3. Withdrawal requests Tab */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-4">
            {withdrawals.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-700 dark:text-slate-55px">
                No withdrawals request logged.
              </div>
            ) : (
              withdrawals.map((w) => (
                <GlassCard key={w._id} className="p-4 bg-white/5 dark:bg-black/20 border-white/10 flex flex-col justify-between gap-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-white/5 pb-2">
                    <div>
                      <span className="text-xs sm:text-sm font-extrabold block dark:text-slate-200">
                        User: {w.userId?.name || 'Unknown'} (Phone: {w.userId?.phone || 'Unknown'})
                      </span>
                      <span className="text-[10px] text-slate-800 dark:text-slate-500 font-bold block mt-0.5">
                        Claim amount: <b className="text-rose-500 font-black text-sm">₹{w.amount}</b> | Status: <b className="text-indigo-500">{w.status}</b>
                      </span>
                    </div>
                    {w.status === 'pending' && (
                      <div className="flex gap-2 mt-2 sm:mt-0 shrink-0">
                        <button
                          onClick={() => handleApproveWithdrawal(w._id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1"
                        >
                          <CheckCircle size={12} /> Approve
                        </button>
                        <button
                          onClick={() => { audioSynth.playClick(); setRejectWithdrawalId(w._id); }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1"
                        >
                          <XCircle size={12} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-800 dark:text-slate-45px italic leading-relaxed">
                    Payout bank/UPI details: {w.description}
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        )}

        {/* 4. Games audits Tab */}
        {activeTab === 'games' && (
          <div className="space-y-4">
            {games.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-700 dark:text-slate-55px">
                No game session logs recorded.
              </div>
            ) : (
              games.map((g) => (
                <GlassCard key={g._id} className="p-4 bg-white/5 dark:bg-black/20 border-white/10 flex flex-col justify-between gap-3 text-xs leading-normal">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="font-extrabold dark:text-slate-200">Room: {g.roomId} | Fee: ₹{g.entryFee} coins</span>
                    <span className={`font-black uppercase px-2 py-0.5 rounded ${g.status === 'completed' ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-500'}`}>
                      {g.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-800 dark:text-slate-400 font-semibold">
                    <div>
                      Players: {g.players.map((p: any) => `${p.name} (${p.color})`).join(', ')}
                    </div>
                    <div className="text-right">
                      Winner: <b className="text-yellow-500">{g.winner?.name || 'Unspecified'}</b>
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        )}

      </div>

      {/* 1. Modal Balance dispute adjust */}
      {selectedUserForAdjust && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <GlassCard className="max-w-md w-full p-6 bg-slate-900 border border-indigo-500 text-white relative">
            <h3 className="text-base font-extrabold mb-4">
              Wallet Balance Manual Adjust: {selectedUserForAdjust.name}
            </h3>

            <form onSubmit={handleAdjustBalance} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400">TYPE</label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as any)}
                    className="w-full glass-input bg-slate-800 text-white text-xs py-2"
                  >
                    <option value="credit">Credit (+)</option>
                    <option value="debit">Debit (-)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400">WALLET TARGET</label>
                  <select
                    value={adjustBalType}
                    onChange={(e) => setAdjustBalType(e.target.value as any)}
                    className="w-full glass-input bg-slate-800 text-white text-xs py-2"
                  >
                    <option value="deposit">Deposit Wallet</option>
                    <option value="win">Winnings Wallet</option>
                    <option value="bonus">Bonus Wallet</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400">AMOUNT (INR)</label>
                <input
                  type="number"
                  placeholder="Enter adjustment amount"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full glass-input py-2 text-xs"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400">REASON DESCRIPTION</label>
                <input
                  type="text"
                  placeholder="e.g. Customer support balance dispute refund"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full glass-input py-2 text-xs"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { audioSynth.playClick(); setSelectedUserForAdjust(null); }}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  Apply Change
                </button>
              </div>

            </form>
          </GlassCard>
        </div>
      )}

      {/* 2. Modal Withdrawal rejection message */}
      {rejectWithdrawalId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <GlassCard className="max-w-sm w-full p-6 bg-slate-900 border border-red-500 text-white relative">
            <h3 className="text-base font-extrabold mb-4">Reject Payout Request</h3>

            <form onSubmit={handleRejectWithdrawalSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400">REJECTION REASON</label>
                <input
                  type="text"
                  placeholder="e.g. Invalid bank credentials, suspicious wins"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full glass-input text-xs py-2"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { audioSynth.playClick(); setRejectWithdrawalId(null); }}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md"
                >
                  Confirm Reject
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;
