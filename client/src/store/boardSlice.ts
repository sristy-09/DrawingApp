import { createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';

interface BoardState {
  canvasData: string | null;
  isGuest: boolean;
}

const initialState: BoardState = {
  canvasData: null,
  isGuest: false,
};

const boardSlice = createSlice({
  name: 'board',
  initialState,
  reducers: {
    setCanvasData: (state, action: PayloadAction<string>) => {
      state.canvasData = action.payload;
      
      // Persist to localStorage if guest
      if (state.isGuest) {
        localStorage.setItem('guestBoardData', action.payload);
      }
    },
    
    setIsGuest: (state, action: PayloadAction<boolean>) => {
      state.isGuest = action.payload;
      
      // Clear localStorage when user logs in
      if (!action.payload) {
        localStorage.removeItem('guestBoardData');
        state.canvasData = null;
      }
    },
    
    clearBoardData: (state) => {
      state.canvasData = null;
      localStorage.removeItem('guestBoardData');
    },
    
    loadGuestBoardData: (state) => {
      const savedData = localStorage.getItem('guestBoardData');
      if (savedData && state.isGuest) {
        state.canvasData = savedData;
      }
    },
  },
});

export const { setCanvasData, setIsGuest, clearBoardData, loadGuestBoardData } = boardSlice.actions;
export default boardSlice.reducer;
