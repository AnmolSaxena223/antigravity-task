import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Transaction {
  _id: string;
  type: 'deposit' | 'withdrawal' | 'game_fee' | 'game_win' | 'referral_bonus' | 'cashback';
  amount: number;
  balanceType: 'deposit' | 'win' | 'bonus';
  status: 'pending' | 'completed' | 'failed' | 'rejected';
  paymentGateway: 'razorpay' | 'stripe' | 'system';
  paymentId?: string;
  description?: string;
  createdAt: string;
}

interface WalletState {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  pendingDeposit: {
    id: string;
    amount: number;
    paymentId: string;
    gateway: string;
  } | null;
}

const initialState: WalletState = {
  transactions: [],
  loading: false,
  error: null,
  pendingDeposit: null,
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    walletActionStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    walletActionFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    setTransactions: (state, action: PayloadAction<Transaction[]>) => {
      state.loading = false;
      state.transactions = action.payload;
    },
    initiateDepositSuccess: (state, action: PayloadAction<any>) => {
      state.loading = false;
      state.pendingDeposit = action.payload;
    },
    clearPendingDeposit: (state) => {
      state.pendingDeposit = null;
    },
    clearWalletError: (state) => {
      state.error = null;
    }
  }
});

export const {
  walletActionStart,
  walletActionFailure,
  setTransactions,
  initiateDepositSuccess,
  clearPendingDeposit,
  clearWalletError
} = walletSlice.actions;

export default walletSlice.reducer;
