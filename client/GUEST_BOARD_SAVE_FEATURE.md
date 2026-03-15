# Guest Board Save Feature

## Overview
When a guest user (not logged in) creates drawings on the board and then decides to log in or sign up, they are prompted to save their work to a new board. The guest canvas data is saved to the database and loaded when the user navigates to the newly created board.

## User Flow

### Scenario 1: Guest User Logs In
1. Guest user draws on the board (data saved to localStorage via Redux)
2. User clicks login and enters credentials
3. **Alert Dialog appears**: "Save Your Work?"
4. User has 3 options:
   - **Yes, Save Board**: Shows form to create new board
   - **No, Discard**: Clears localStorage and redirects to dashboard
   - **Cancel**: Closes dialog, stays on login page
5. If user saves:
   - Board is created in database with guest canvas data
   - User is redirected to the new board
   - Canvas data is loaded from database and displayed

### Scenario 2: Guest User Signs Up
1. Guest user draws on the board (data saved to localStorage via Redux)
2. User clicks signup and enters credentials
3. **Alert Dialog appears**: "Save Your Work?"
4. User has 3 options:
   - **Yes, Save Board**: Shows form to create new board
   - **No, Discard**: Clears localStorage and redirects to dashboard
   - **Cancel**: Closes dialog, stays on signup page
5. If user saves:
   - User account is created
   - Board is created in database with guest canvas data
   - User is redirected to the new board
   - Canvas data is loaded from database and displayed

### Scenario 3: Guest User Uses Google OAuth
1. Guest user draws on the board (data saved to localStorage via Redux)
2. User clicks "Login with Google"
3. After OAuth authentication completes
4. **Alert Dialog appears**: "Save Your Work?"
5. User has 3 options:
   - **Yes, Save Board**: Shows form to create new board
   - **No, Discard**: Clears localStorage and redirects to dashboard
   - **Cancel**: Redirects to dashboard
6. If user saves:
   - Board is created in database with guest canvas data
   - User is redirected to the new board
   - Canvas data is loaded from database and displayed

## Board Creation Form
When user selects "Yes, Save Board", a form appears with:
- **Title** (required): Name for the board
- **Description** (optional): Board description
- **Make board public** (checkbox): Privacy setting

After submitting:
- New board is created in the backend with the guest canvas data
- Guest data is cleared from localStorage
- User is redirected to the newly created board
- **Canvas data is automatically loaded from the database**

## Technical Implementation

### Backend Changes
**File: `server/controllers/boardController.js`**
- Updated `createBoard` function to accept `canvasData` and `thumbnail` from request body
- Canvas data is now saved to the database when creating a new board

### Components
- `SaveGuestBoardDialog.tsx`: Reusable dialog component for save/discard prompt and board creation form

### Hooks Updated
- `useLogin.ts`: Added guest data check before login, sends canvasData to backend
- `useSignup.ts`: Added guest data check before signup, sends canvasData to backend

### Components Updated
- `LoginPage.tsx`: Integrated SaveGuestBoardDialog
- `SignUpPage.tsx`: Integrated SaveGuestBoardDialog
- `AuthSuccess.tsx`: Added guest data check for Google OAuth flow, sends canvasData to backend

### Redux
- `boardSlice.ts`: Added `selectHasGuestData` helper function
- Guest data detection checks for non-empty canvas data in localStorage

### Canvas Loading
**File: `client/src/features/board/hooks/useBoard.ts`**
- When authenticated user navigates to a board, canvas data is loaded from backend
- `loadFromJson` is called with the canvas data from the API response
- This ensures guest drawings are displayed after board creation

## Data Flow
1. Guest draws → Redux dispatches `setCanvasData` → Saves to localStorage
2. User attempts login/signup → Check `localStorage.getItem('guestBoardData')`
3. If guest data exists → Show dialog
4. If user saves → Create board with `canvasData` from localStorage
5. Backend saves canvas data to MongoDB
6. User redirected to `/board/:id`
7. Frontend loads board data from backend API
8. Canvas data is loaded and rendered using `loadFromJson`
9. Clear localStorage with `dispatch(clearBoardData())`

## Edge Cases Handled
- Empty canvas (no objects drawn) → No prompt shown
- User cancels dialog → Can retry login/signup
- API errors during board creation → Alert shown to user
- Google OAuth flow → Dialog shown after authentication completes
- Canvas data persistence → Data is saved to database and loaded when board opens

## Testing the Feature
1. Open the app without logging in (guest mode)
2. Draw something on the canvas
3. Click login/signup
4. Verify dialog appears asking to save work
5. Click "Yes, Save Board"
6. Fill in board details and submit
7. Verify you're redirected to the new board
8. **Verify your drawings are displayed on the canvas**
9. Refresh the page
10. **Verify drawings persist (loaded from database)**
