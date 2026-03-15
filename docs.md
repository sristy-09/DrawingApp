# DrawingApp Documentation

## Project Overview

DrawingApp is a full-stack web application that allows users to create, save, and manage collaborative drawing boards. It features a rich drawing interface, user authentication, and a dashboard for managing personal boards.

### Tech Stack

**Frontend:**
- **Framework:** React 19 (Vite)
- **Language:** TypeScript
- **State Management:** Redux Toolkit
- **Styling:** Tailwind CSS
- **Drawing Library:** Fabric.js / RoughJS
- **Icons:** React Icons / Lucide React
- **HTTP Client:** Axios

**Backend:**
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (with Mongoose)
- **Authentication:** Passport.js (Google OAuth), JWT, bcryptjs
- **Validation:** Zod

---

## Features

- **User Authentication:**
  - Sign up and Login with Email/Password.
  - Google OAuth Integration.
  - Secure JWT-based authentication.

- **Drawing Board:**
  - Interactive canvas for drawing.
  - Support for guest access (try before you login).
  - Tools for drawing shapes, lines, and freehand.

- **Dashboard:**
  - "My Boards" view to manage saved drawings.
  - Create new boards.
  - Update and delete existing boards.

---

## Folder Structure

```
DrawingApp/
├── client/                 # Frontend React Application
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── features/       # Feature-based modules (User, auth, board, etc.)
│   │   ├── pages/          # Page components
│   │   ├── store/          # Redux store configuration
│   │   ├── App.tsx         # Main App component & Routing
│   │   └── main.tsx        # Entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── server/                 # Backend Node.js/Express Application
│   ├── config/             # Configuration files
│   ├── controllers/        # Route logic
│   ├── middleware/         # Custom middleware (auth, etc.)
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes definition
│   ├── server.js           # Server entry point
│   └── package.json
│
├── docs.md                 # This documentation file
└── package.json            # Root package.json
```

---

## Setup & Installation

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB (Local or Atlas URI)

### Installation Steps

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd DrawingApp
    ```

2.  **Install dependencies:**
    
    You need to install dependencies for both the root (if any), client, and server.

    ```bash
    # Root dependencies
    npm install

    # Server dependencies
    cd server
    npm install

    # Client dependencies
    cd ../client
    npm install
    ```

### Environment Variables

You must configure environment variables for both the server and client.

**1. Server Configuration (`server/.env`)**
Create a `.env` file in the `server` directory based on `.env.example`:

```env
MONGO_URI=your_mongodb_connection_string
PORT=3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLIENT_URL=http://localhost:5173  # URL where frontend is running
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRE=3d
```

**2. Client Configuration (`client/.env`)**
Create a `.env` file in the `client` directory based on `.env.example`:

```env
VITE_API_URL=http://localhost:3000  # URL where backend is running
```

---

## Running the Application

To run the application locally, you need to start both the backend server and the frontend development server.

**1. Start the Backend Server:**

Open a terminal and run:
```bash
# From root or server directory
cd server
npm start
# OR for development with nodemon
npm run dev
```
The server will start on `http://localhost:3000`.

**2. Start the Frontend Client:**

Open a **new** terminal and run:
```bash
cd client
npm run dev
```
The client will typically start on `http://localhost:5173` (check terminal output).

---

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register`: Register a new user.
- `POST /login`: Login an existing user.
- `GET /google`: Initiate Google OAuth login.
- `GET /google/callback`: Handle Google OAuth callback.
- `GET /me`: Get current authenticated user details.

### Boards (`/api/board`)
- `GET /`: Get all boards for the logged-in user.
- `POST /`: Create a new board.
- `GET /:id`: Get a specific board by ID.
- `PATCH /:id`: Update a board.
- `DELETE /:id`: Delete a board.
