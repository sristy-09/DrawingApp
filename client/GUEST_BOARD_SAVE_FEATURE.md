# Guest Board Save Feature

## Overview
When a guest user (not logged in) creates drawings on the board and then decides to log in or sign up, they are prompted to save their work to a new board.

## User Flow

### Scenario 1: Guest User Logs In
1. Guest user draws on the board (data saved to localStorage via Redux)
2. User clicks login and enters credentials
3. **Alert Dialog appears**: "Save Your Work?"
4. User has 3 options:
   - **Yes, Save Board**: Shows form to create new board
   - **No, Discard**: Clears localStorage and redirects to dashboard
   - **Cancel**: Closes dialog, stays on login page

### Scenario 2: Guest User Signs Up
1. Guest user draws on the board (data saved to localStorage via Redux)
2. User clicks signup and enters credentials
3. **Alert Dialog appears**: "Save Your Work?"
4. User has 3 options:
   - **Yes, Save Board**: Shows form to create new board
   - **No, Discard**: Clears localStorage and redirects to dashboard
   - **Cancel**: Closes dialog, stays on signup page

### Scenario 3: Guest User Uses Google OAuth
1. Guest user draws on the board (data saved to localStorage via Redux)
2. User clicks "Login with Google"
3. After OAuth authentication completes
4. **Alert Dialog appears**: "Save Your Work?"
5. User has 3 options:
   - **Yes, Save Board**: Shows form to create new board
   - **No, Discard**: Clears localStorage and redirects to dashboard
   - **Cancel**: Redirects to dashboard

## Board Creation Form
When user selects "Yes, Save Board", a form appears with:
- **Title** (required): Name for the board
- **Description** (optional): Board description
- **Make board public** (checkbox): Privacy setting

After submitting:
- New board is created in the backend with the guest canvas data
- Guest data is cleared from localStorage
- User is redirected to the newly created board

## Technical Implementation

### Components
- `SaveGuestBoardDialog.tsx`: Reusable dialog component for save/discard prompt and board creation form

### Hooks Updated
- `useLogin.ts`: Added guest data check before login
- `useSignup.ts`: Added guest data check before signup

### Components Updated
- `LoginPage.tsx`: Integrated SaveGuestBoardDialog
- `SignUpPage.tsx`: Integrated SaveGuestBoardDialog
- `AuthSuccess.tsx`: Added guest data check for Google OAuth flow

### Redux
- `boardSlice.ts`: Added `selectHasGuestData` helper function
- Guest data detection checks for non-empty canvas data in localStorage

## Data Flow
1. Guest draws → Redux dispatches `setCanvasData` → Saves to localStorage
2. User attempts login/signup → Check `localStorage.getItem('guestBoardData')`
3. If guest data exists → Show dialog
4. If user saves → Create board with `canvasData` from localStorage
5. Clear localStorage with `dispatch(clearBoardData())`
6. Redirect to new board or dashboard

## Edge Cases Handled
- Empty canvas (no objects drawn) → No prompt shown
- User cancels dialog → Can retry login/signup
- API errors during board creation → Alert shown to user
- Google OAuth flow → Dialog shown after authentication completes
