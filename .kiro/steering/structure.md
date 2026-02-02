# Project Structure

## Root Level Organization
```
├── client/          # Frontend React application
├── server/          # Backend Express.js API
├── package.json     # Root package.json for build scripts
└── .env            # Root environment variables
```

## Client Structure (Frontend)
```
client/
├── src/
│   ├── features/           # Feature-based organization
│   │   ├── auth/          # Authentication feature
│   │   │   ├── components/    # Auth-specific components
│   │   │   ├── hooks/         # Auth-specific hooks
│   │   │   ├── types/         # Auth type definitions
│   │   │   └── validation/    # Auth validation schemas
│   │   ├── board/         # Drawing board feature
│   │   │   ├── components/    # Board components (Canvas, Toolbar)
│   │   │   ├── hooks/         # Board-specific hooks
│   │   │   └── types/         # Board type definitions
│   │   ├── board-list/    # Board management feature
│   │   ├── core/          # Shared/core functionality
│   │   │   ├── components/    # Shared components (Navbar, UI)
│   │   │   ├── context/       # React contexts
│   │   │   └── lib/           # Utility functions
│   │   └── User/          # User dashboard feature
│   ├── pages/             # Top-level page components
│   └── main.tsx          # Application entry point
├── public/               # Static assets
└── dist/                # Build output (generated)
```

## Server Structure (Backend)
```
server/
├── config/              # Configuration files
│   ├── db.js           # Database connection
│   └── passport.js     # Passport authentication config
├── controllers/         # Route handlers/business logic
│   ├── authController.js
│   └── boardController.js
├── middleware/          # Custom middleware
│   └── isAuthenticated.js
├── models/             # Database models
│   ├── User.js
│   └── Board.js
├── routes/             # API route definitions
└── server.js          # Application entry point
```

## Key Architectural Patterns

### Feature-Based Organization
- Frontend organized by features rather than file types
- Each feature contains its own components, hooks, types, and validation
- Promotes modularity and easier maintenance

### Separation of Concerns
- Clear separation between client and server
- Controllers handle business logic
- Models define data structure
- Middleware handles cross-cutting concerns

### Component Structure
- UI components in `core/components/ui/` for reusable elements
- Feature-specific components in respective feature directories
- Page components in dedicated `pages/` directory

### File Naming Conventions
- React components: PascalCase (e.g., `LoginPage.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useLogin.ts`)
- Types: `types.ts` within feature directories
- Schemas: descriptive names (e.g., `loginSchema.ts`)

### Import Aliases
- `@/` alias points to `client/src/` for cleaner imports
- Relative imports used within features
- Absolute imports for cross-feature dependencies