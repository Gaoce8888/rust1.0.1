# Enterprise React Application

A production-grade React application with TypeScript, featuring enterprise-level architecture, best practices, and modern tooling.

## 🚀 Features

- **TypeScript** - Type-safe development
- **React 18** - Latest React features
- **Redux Toolkit** - State management
- **React Router v6** - Client-side routing
- **Material-UI v5** - Enterprise UI components
- **React Hook Form + Yup** - Form management and validation
- **Axios + React Query** - API calls and caching
- **ESLint + Prettier** - Code quality and formatting
- **Husky + Lint-staged** - Git hooks for code quality
- **JWT Authentication** - Secure authentication flow
- **Dark/Light Theme** - Theme switching support

## 📁 Project Structure

```
src/
├── assets/           # Static assets (images, fonts, etc.)
├── components/       # Reusable components
│   ├── common/      # Common components (Header, Footer, etc.)
│   ├── forms/       # Form components
│   └── ui/          # UI components (Button, Modal, etc.)
├── config/          # Configuration files
├── features/        # Feature-based modules
│   ├── auth/        # Authentication feature
│   ├── dashboard/   # Dashboard feature
│   └── users/       # Users management feature
├── hooks/           # Custom React hooks
├── layouts/         # Layout components
├── pages/           # Page components
├── services/        # API and external services
│   ├── api/         # API client and endpoints
│   └── storage/     # Local storage utilities
├── store/           # Redux store configuration
│   ├── slices/      # Redux slices
│   └── middleware/  # Redux middleware
├── styles/          # Global styles
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
    ├── constants/   # Application constants
    ├── helpers/     # Helper functions
    └── validators/  # Validation utilities
```

## 🛠️ Tech Stack

### Core
- React 18
- TypeScript 4.x
- Redux Toolkit
- React Router DOM v6

### UI Framework
- Material-UI v5
- Emotion (CSS-in-JS)

### Forms & Validation
- React Hook Form
- Yup

### API & Data Fetching
- Axios
- React Query (TanStack Query)

### Development Tools
- ESLint
- Prettier
- Husky
- Lint-staged
- Commitlint

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd enterprise-react-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`.

## 📜 Available Scripts

- `npm start` - Run the app in development mode
- `npm build` - Build the app for production
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier

## 🏗️ Architecture

### State Management
The application uses Redux Toolkit for state management with the following slices:
- `authSlice` - Authentication state
- `uiSlice` - UI state (theme, notifications, loading)

### API Layer
- Centralized API client with Axios
- Request/Response interceptors
- Automatic token refresh
- Error handling

### Authentication
- JWT-based authentication
- Automatic token refresh
- Protected routes
- Role-based access control (ready to implement)

### Forms
- React Hook Form for form state management
- Yup for schema validation
- Reusable form components
- Error handling and display

## 🎨 Styling

- Material-UI components
- Emotion for custom styling
- Theme support (light/dark)
- Responsive design

## 🧪 Testing

The project is set up with:
- Jest for unit testing
- React Testing Library for component testing
- MSW for API mocking (ready to implement)

## 📝 Code Quality

### ESLint Rules
- Extends React App configuration
- TypeScript support
- Prettier integration
- Custom rules for enterprise standards

### Git Hooks
- Pre-commit: Lint and format staged files
- Commit-msg: Enforce conventional commits

## 🔒 Security

- JWT token storage in localStorage with fallbacks
- API request/response interceptors
- XSS protection through React
- Environment variables for sensitive data

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

The build folder will contain optimized production-ready files.

### Environment Variables
- `REACT_APP_API_BASE_URL` - API base URL

## 📄 License

This project is licensed under the MIT License.
