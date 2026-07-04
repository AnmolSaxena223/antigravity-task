import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  theme: 'dark' | 'light';
  soundEnabled: boolean;
  soundVolume: number;
}

const initialState: UiState = {
  theme: (localStorage.getItem('theme') as 'dark' | 'light') || 'dark',
  soundEnabled: localStorage.getItem('soundEnabled') !== 'false',
  soundVolume: parseFloat(localStorage.getItem('soundVolume') || '0.5'),
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      state.theme = nextTheme;
      localStorage.setItem('theme', nextTheme);
      
      // Update HTML node class list
      const root = window.document.documentElement;
      if (nextTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    },
    setTheme: (state, action: PayloadAction<'dark' | 'light'>) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
      
      const root = window.document.documentElement;
      if (action.payload === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    },
    toggleSound: (state) => {
      state.soundEnabled = !state.soundEnabled;
      localStorage.setItem('soundEnabled', String(state.soundEnabled));
    },
    setSoundVolume: (state, action: PayloadAction<number>) => {
      state.soundVolume = action.payload;
      localStorage.setItem('soundVolume', String(action.payload));
    }
  }
});

export const { toggleTheme, setTheme, toggleSound, setSoundVolume } = uiSlice.actions;
export default uiSlice.reducer;
