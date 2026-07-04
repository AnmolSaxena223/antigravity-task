import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import gameReducer from './gameSlice';
import walletReducer from './walletSlice';
import uiReducer from './uiSlice';

// Create Redux store
export const store = configureStore({
  reducer: {
    auth: authReducer,
    game: gameReducer,
    wallet: walletReducer,
    ui: uiReducer
  }
});

// Configure standard helper hook types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
