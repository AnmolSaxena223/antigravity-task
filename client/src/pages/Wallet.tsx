import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { updateBalances } from '../store/authSlice';
import { apiRequest } from '../services/api';
import GlassCard from '../components/GlassCard';
import audioSynth from '../utils/audio';
import {
  ArrowLeft,
  PlusCircle,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  History,
  Building,
  CreditCard,
  CheckCircle,
  XCircle,
  Filter
} from 'lucide-react';

interface WalletProps {
  onNavigate: (page: string) => void;
}

interface TransactionItem {
  _id: string;
  type: string;
  amount: number;
  balanceType: string;
  status: string;
  paymentGateway: string;
  paymentId?: string;
  description?: string;
  createdAt: string;
}

// Razorpay Script Loader Helper
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const Wallet: React.FC<WalletProps> = ({ onNavigate }) => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  
  // Bank details for withdrawal
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [upiId, setUpiId] = useState('');

  // Filters state
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchWalletDetails = async () => {
    setLoading(true);
    const response = await apiRequest('/wallet/data');
    setLoading(false);
    
    if (response.success) {
      setTransactions(response.transactions || []);
      if (response.balance) {
        dispatch(updateBalances(response.balance));
      }
    }
  };

  useEffect(() => {
    fetchWalletDetails();
  }, []);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    audioSynth.playClick();
    setStatusMsg(null);

    const amt = parseFloat(depositAmount);
    if (!amt || amt < 10 || amt > 50000) {
      return setStatusMsg({ type: 'error', text: 'Enter a valid amount between ₹10 and ₹50,000.' });
    }

    setLoading(true);
    // Call the dedicated Razorpay order creation endpoint
    const response = await apiRequest('/payment/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount: amt })
    });
    setLoading(false);

    if (!response.success) {
      return setStatusMsg({ type: 'error', text: response.message || 'Failed to initialize payment order.' });
    }

    setShowDepositModal(false);
    setDepositAmount('');

    // Dynamically load the checkout script and open the gateway
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      return setStatusMsg({ type: 'error', text: 'Failed to load Razorpay payment client. Try again.' });
    }

    const options = {
      key: response.keyId,
      amount: response.amount * 100, // paise
      currency: response.currency || 'INR',
      name: 'Ludo Arena',
      description: 'Wallet Deposit Add Cash',
      order_id: response.orderId,
      handler: async (rzpRes: any) => {
        setLoading(true);
        // Verify payment cryptographically on backend
        const verifyRes = await apiRequest('/payment/verify', {
          method: 'POST',
          body: JSON.stringify({
            razorpay_payment_id: rzpRes.razorpay_payment_id,
            razorpay_order_id: rzpRes.razorpay_order_id,
            razorpay_signature: rzpRes.razorpay_signature
          })
        });
        setLoading(false);

        if (verifyRes.success) {
          setStatusMsg({ type: 'success', text: 'Payment successful! Wallet credited.' });
          // Automatically refresh wallet details/balances
          fetchWalletDetails();
        } else {
          setStatusMsg({ type: 'error', text: verifyRes.message || 'Payment signature verification failed.' });
        }
        setTimeout(() => setStatusMsg(null), 5000);
      },
      prefill: {
        name: user?.name || '',
        contact: user?.phone || ''
      },
      theme: {
        color: '#6366f1' // purple/indigo
      },
      modal: {
        ondismiss: () => {
          setStatusMsg({ type: 'error', text: 'Payment checkout cancelled.' });
          setTimeout(() => setStatusMsg(null), 4000);
        }
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    audioSynth.playClick();
    setStatusMsg(null);

    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) {
      return setStatusMsg({ type: 'error', text: 'Enter a valid amount.' });
    }

    if (!user || user.balance.win < amt) {
      return setStatusMsg({ type: 'error', text: 'Insufficient win balance for this payout.' });
    }

    if (!upiId && (!bankAccount || !bankIfsc)) {
      return setStatusMsg({ type: 'error', text: 'Please fill UPI ID or bank details.' });
    }

    setLoading(true);
    const response = await apiRequest('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({
        amount: amt,
        bankDetails: {
          account: bankAccount || undefined,
          ifsc: bankIfsc || undefined,
          upi: upiId || undefined
        }
      })
    });
    setLoading(false);

    if (response.success) {
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setBankAccount('');
      setBankIfsc('');
      setUpiId('');
      setStatusMsg({ type: 'success', text: 'Withdrawal request submitted! Processing.' });
      fetchWalletDetails();
    } else {
      setStatusMsg({ type: 'error', text: response.message || 'Withdrawal submission failed.' });
    }
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const getTxTypeStyle = (type: string) => {
    switch (type) {
      case 'deposit': return { text: 'Deposit Added', color: 'text-indigo-600 dark:text-indigo-400', icon: <TrendingUp size={16} /> };
      case 'withdrawal': return { text: 'Payout Cashout', color: 'text-rose-500', icon: <TrendingDown size={16} /> };
      case 'game_fee': return { text: 'Match Entry Fee', color: 'text-slate-855 dark:text-slate-300', icon: <TrendingDown size={16} /> };
      case 'game_win': return { text: 'Game Winner Prize', color: 'text-emerald-600 dark:text-emerald-400', icon: <TrendingUp size={16} /> };
      case 'referral_bonus': return { text: 'Referral Rewards', color: 'text-purple-600 dark:text-purple-400', icon: <TrendingUp size={16} /> };
      default: return { text: 'Cashback Credit', color: 'text-indigo-500', icon: <TrendingUp size={16} /> };
    }
  };

  const getTxStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400';
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      case 'rejected': return 'bg-red-500/10 text-red-600 dark:text-red-400';
      default: return 'bg-red-500/10 text-red-600 dark:text-red-400';
    }
  };

  if (!user) return null;

  const combinedBalance = user.balance.deposit + user.balance.win + user.balance.bonus;

  // Filtered transactions computed client-side
  const filteredTransactions = transactions.filter((tx) => {
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    return matchesType && matchesStatus;
  });

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-2xl mx-auto relative transition-colors duration-300">
      
      {/* Upper background glows */}
      <div className="absolute top-[10%] right-[10%] w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => { audioSynth.playClick(); onNavigate('home'); }}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-black/20 hover:bg-slate-200 dark:hover:bg-black/35 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white transition-all duration-300 active:scale-95 shadow"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-extrabold tracking-wide text-slate-900 dark:text-white">
          Wallet Ledger
        </h2>
      </div>

      {/* Status banner */}
      {statusMsg && (
        <div className={`mb-5 p-4 rounded-xl border flex items-center gap-3 text-sm animate-pulse transition-all duration-300
          ${statusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-655 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'}
        `}>
          {statusMsg.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Balances Main Card */}
      <GlassCard className="p-6 bg-gradient-to-tr from-indigo-900 via-slate-900 to-indigo-950 border-indigo-500/20 shadow-2xl mb-6 relative overflow-hidden text-white rounded-2xl">
        <div className="space-y-4">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">
              TOTAL AVAILABLE BALANCE
            </span>
            <div className="text-4xl font-black mt-1">₹{combinedBalance.toFixed(2)}</div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10 text-center">
            <div>
              <span className="text-[9px] font-bold text-slate-400 block uppercase">Deposit</span>
              <span className="text-base font-extrabold">₹{user.balance.deposit}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-emerald-400 block uppercase">Winnings</span>
              <span className="text-base font-extrabold text-emerald-400">₹{user.balance.win}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-indigo-400 block uppercase">Bonus</span>
              <span className="text-base font-extrabold text-indigo-300">₹{user.balance.bonus}</span>
            </div>
          </div>

          {/* Quick Transaction Action buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={() => { audioSynth.playClick(); setShowDepositModal(true); }}
              className="flex-1 glass-btn bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 text-xs shadow-md shadow-emerald-600/20"
            >
              <PlusCircle size={16} />
              Add Cash
            </button>
            <button
              onClick={() => { audioSynth.playClick(); setShowWithdrawModal(true); }}
              className="flex-1 glass-btn bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl py-3 text-xs"
            >
              <ArrowUpRight size={16} />
              Withdraw Win
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Transactions History Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-sm font-bold tracking-wider text-slate-800 dark:text-slate-400 uppercase flex items-center gap-2">
          <History size={16} className="text-indigo-500" />
          TRANSACTION HISTORY
        </h3>

        {/* Filters Trigger indicator */}
        <div className="flex items-center gap-1.5 text-xs text-slate-550 dark:text-slate-405 font-bold">
          <Filter size={14} />
          Filters Enabled
        </div>
      </div>

      {/* Filters Selectors Dropdowns */}
      <div className="grid grid-cols-2 gap-3 mb-6 p-4 rounded-2xl bg-slate-100 dark:bg-black/15 border border-slate-200 dark:border-white/5 transition-all">
        <div>
          <label className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs text-slate-850 dark:text-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500/50"
          >
            <option value="all">All Transactions</option>
            <option value="deposit">Deposits Only</option>
            <option value="withdrawal">Payouts / Withdrawals</option>
            <option value="game_fee">Ludo Game Entry Fees</option>
            <option value="game_win">Ludo Game Wins</option>
            <option value="referral_bonus">Referral Coins</option>
          </select>
        </div>

        <div>
          <label className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs text-slate-850 dark:text-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500/50"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed Successfully</option>
            <option value="pending">Pending Processing</option>
            <option value="failed">Failed Transactions</option>
            <option value="rejected">Rejected Withdrawals</option>
          </select>
        </div>
      </div>

      {/* Transaction list */}
      <div className="space-y-3 transition-all duration-350">
        {loading && filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <span className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <GlassCard className="p-8 text-center bg-white/5 dark:bg-black/10 border-slate-200 dark:border-white/10">
            <span className="text-sm text-slate-550 dark:text-slate-450 font-semibold block">
              No matching transactions found.
            </span>
          </GlassCard>
        ) : (
          filteredTransactions.map((tx) => {
            const txType = getTxTypeStyle(tx.type);
            const isDebit = ['withdrawal', 'game_fee'].includes(tx.type);

            return (
              <GlassCard key={tx._id} className="p-4 bg-white/40 dark:bg-black/20 border-slate-200/50 dark:border-white/10 hover:bg-white dark:hover:bg-black/30 flex items-center justify-between gap-4 transition-all duration-200 hover:scale-[1.01] hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl bg-slate-100 dark:bg-black/25 ${txType.color}`}>
                    {txType.icon}
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-extrabold block text-slate-800 dark:text-slate-200">
                      {txType.text}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-500 font-semibold block mt-0.5">
                      {new Date(tx.createdAt).toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-450 font-semibold block mt-0.5">
                      Order ID: {tx.paymentId || 'N/A'}
                    </span>
                    {tx.description && (
                      <span className="text-[9px] text-slate-550 dark:text-slate-400 italic block truncate max-w-[200px] sm:max-w-xs mt-0.5">
                        {tx.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-base font-black block ${isDebit ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {isDebit ? '-' : '+'}₹{tx.amount}
                  </span>
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider mt-1 inline-block ${getTxStatusBadge(tx.status)}`}>
                    {tx.status}
                  </span>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>

      {/* 1. Deposit cash popup modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <GlassCard className="max-w-sm w-full p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/30 text-slate-850 dark:text-white relative shadow-2xl">
            <h3 className="text-lg font-extrabold mb-4 flex items-center gap-2">
              <PlusCircle className="text-emerald-500" />
              Add Deposit Coins
            </h3>
            
            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-slate-550 dark:text-slate-400">AMOUNT (INR)</label>
                <input
                  type="number"
                  placeholder="Enter amount (₹10 - ₹50,000)"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full glass-input text-slate-900 dark:text-slate-100 placeholder-slate-400"
                  min={10}
                  max={50000}
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { audioSynth.playClick(); setShowDepositModal(false); }}
                  className="flex-1 glass-btn bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 py-2.5 rounded-xl text-xs text-slate-850 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 glass-btn bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-xl text-xs text-white shadow-md shadow-emerald-500/20"
                >
                  Proceed
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* 2. Withdrawal request popup modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <GlassCard className="max-w-md w-full p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/30 text-slate-850 dark:text-white relative shadow-2xl">
            <h3 className="text-lg font-extrabold mb-2 flex items-center gap-2">
              <ArrowUpRight className="text-rose-500" />
              Withdraw Winnings Cash
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-semibold">
              Withdraw limit from winnings wallet: ₹{user.balance.win}. Minimum ₹100.
            </p>
            
            <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold text-slate-550 dark:text-slate-400">WITHDRAW AMOUNT (₹)</label>
                <input
                  type="number"
                  placeholder="Minimum ₹100"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full glass-input text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm"
                  min={100}
                  max={user.balance.win}
                  required
                />
              </div>

              <div className="border-t border-slate-200 dark:border-white/10 pt-3">
                <span className="text-[10px] font-extrabold text-indigo-650 dark:text-indigo-400 block mb-2 uppercase tracking-wider">Payout Destination (Fill One)</span>
                
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1"><CreditCard size={12} /> UPI ID (PhonePe/GPay/Paytm)</label>
                    <input
                      type="text"
                      placeholder="username@upi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full glass-input text-slate-900 dark:text-slate-100 text-xs py-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1"><Building size={12} /> Bank Account No</label>
                      <input
                        type="text"
                        placeholder="1234567890"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        className="w-full glass-input text-slate-900 dark:text-slate-100 text-xs py-2"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Bank IFSC Code</label>
                      <input
                        type="text"
                        placeholder="SBIN0001234"
                        value={bankIfsc}
                        onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                        className="w-full glass-input text-slate-900 dark:text-slate-100 text-xs py-2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => { audioSynth.playClick(); setShowWithdrawModal(false); }}
                  className="flex-1 glass-btn bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 py-2.5 text-xs text-slate-850 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 glass-btn bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs text-white shadow-md shadow-indigo-500/25"
                >
                  Request Cashout
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

    </div>
  );
};

export default Wallet;
