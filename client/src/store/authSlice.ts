import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserStats {
  played: number;
  won: number;
  lost: number;
}

export interface UserBalance {
  deposit: number;
  win: number;
  bonus: number;
}

export interface UserProfile {
  id: string;
  _id?: string;
  friendId?: string;
  phone: string;
  name: string;
  email?: string;
  avatar: string;
  balance: UserBalance;
  referralCode: string;
  referralsCount: number;
  gameStats: UserStats;
  role: 'user' | 'admin';
  createdAt?: string;
}


interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    authSuccess: (state, action: PayloadAction<{ user: UserProfile; token: string }>) => {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    authFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateProfileSuccess: (state, action: PayloadAction<UserProfile>) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    updateBalances: (state, action: PayloadAction<UserBalance>) => {
      if (state.user) {
        state.user.balance = action.payload;
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    logoutSuccess: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    clearError: (state) => {
      state.error = null;
      state.loading = false;
    }
  }
});

export const {
  authStart,
  authSuccess,
  authFailure,
  updateProfileSuccess,
  updateBalances,
  logoutSuccess,
  clearError
} = authSlice.actions;

export default authSlice.reducer;
