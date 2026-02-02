# Technology Stack

## Frontend (Client)
- **Framework**: React 19.2.0 with TypeScript
- **Build Tool**: Vite 7.2.2
- **Styling**: Tailwind CSS 4.1.17
- **UI Components**: Radix UI primitives with custom components
- **Canvas Library**: Fabric.js 6.9.0 for drawing functionality
- **State Management**: React Context API (UserContext, ThemeProvider)
- **Routing**: React Router 7.9.6
- **HTTP Client**: Axios 1.13.2
- **Authentication**: @react-oauth/google for OAuth integration
- **Validation**: Zod 4.2.1 for schema validation

## Backend (Server)
- **Runtime**: Node.js with ES modules
- **Framework**: Express.js 5.1.0
- **Database**: MongoDB with Mongoose 8.19.3
- **Authentication**: Passport.js with Google OAuth 2.0 strategy
- **Security**: bcryptjs for password hashing, JWT for tokens
- **Validation**: Zod 4.2.1 for request validation
- **Environment**: dotenv for configuration management

## Development Tools
- **Linting**: ESLint with TypeScript support
- **Dev Server**: Nodemon for backend hot reload
- **Package Manager**: npm

## Common Commands

### Development
```bash
# Start backend development server
npm run dev

# Start frontend development server (from client directory)
cd client && npm run dev

# Build entire application
npm run build
```

### Frontend Commands (from client directory)
```bash
# Development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Backend Commands (from root)
```bash
# Start with nodemon (development)
npm start
npm run dev

# Build entire project (installs deps and builds client)
npm run build
```

## Architecture Notes
- Monorepo structure with separate client and server directories
- ES modules used throughout (type: "module" in package.json)
- Path aliases configured (@/ points to client/src)
- CORS enabled for cross-origin requests
- Static file serving for production builds