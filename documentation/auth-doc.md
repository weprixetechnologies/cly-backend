# Authentication Routes Documentation

## Overview
This document provides comprehensive documentation for the authentication system in the CLY application. The system supports both admin and user authentication with JWT-based token management.

## Base URL
```
http://72.60.219.181:3000/api/auth
```

## Authentication Flow
1. **Registration**: Users can register as either admin or regular user
2. **Login**: Users authenticate with email and password
3. **Token Management**: JWT access tokens (15min) and refresh tokens (7 days)
4. **Session Management**: Server-side session tracking with device information
5. **Logout**: Token invalidation and session cleanup

## API Endpoints

### 1. Register Admin
**POST** `/register/admin`

Creates a new admin account with elevated privileges.

#### Request Body
```json
{
  "emailID": "admin@example.com",
  "phoneNumber": "+1234567890",
  "name": "Admin User",
  "password": "securePassword123",
  "gstin": "12ABCDE3456F1Z5", // Optional
  "device": "Web Browser" // Optional
}
```

#### Required Fields
- `emailID` (string): Valid email address
- `phoneNumber` (string): Phone number
- `name` (string): Full name
- `password` (string): Minimum 6 characters

#### Optional Fields
- `gstin` (string): GST identification number
- `device` (string): Device information

#### Response
```json
{
  "success": true,
  "message": "admin registered successfully",
  "user": {
    "uid": "AbC123XyZ789",
    "username": "admin_example_com",
    "name": "Admin User",
    "emailID": "admin@example.com",
    "phoneNumber": "+1234567890",
    "gstin": "12ABCDE3456F1Z5",
    "role": "admin",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Error Responses
- `400`: Missing required fields
- `400`: Invalid email format
- `400`: Password too short
- `400`: Email already registered

---

### 2. Register User
**POST** `/register/user`

Creates a new regular user account.

#### Request Body
```json
{
  "emailID": "user@example.com",
  "phoneNumber": "+1234567890",
  "name": "Regular User",
  "password": "securePassword123",
  "gstin": "12ABCDE3456F1Z5", // Optional
  "device": "Mobile App" // Optional
}
```

#### Response
Same structure as admin registration, with `role: "user"`

---

### 3. Login Admin
**POST** `/login/admin`

Authenticates an admin user and returns access tokens.

#### Request Body
```json
{
  "emailID": "admin@example.com",
  "password": "securePassword123",
  "device": "Web Browser" // Optional
}
```

#### Required Fields
- `emailID` (string): Valid email address
- `password` (string): User password

#### Response
```json
{
  "success": true,
  "message": "admin logged in successfully",
  "user": {
    "uid": "AbC123XyZ789",
    "username": "admin_example_com",
    "name": "Admin User",
    "emailID": "admin@example.com",
    "phoneNumber": "+1234567890",
    "gstin": "12ABCDE3456F1Z5",
    "role": "admin",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Error Responses
- `400`: Missing email or password
- `401`: Invalid email or password
- `401`: Access denied (wrong role)

---

### 4. Login User
**POST** `/login/user`

Authenticates a regular user and returns access tokens.

#### Request Body
```json
{
  "emailID": "user@example.com",
  "password": "securePassword123",
  "device": "Mobile App" // Optional
}
```

#### Response
Same structure as admin login, with `role: "user"`

---

### 5. Refresh Access Token
**POST** `/refresh`

Generates a new access token using a valid refresh token.

#### Request Body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Required Fields
- `refreshToken` (string): Valid refresh token

#### Response
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "uid": "AbC123XyZ789",
    "username": "user_example_com",
    "name": "Regular User",
    "emailID": "user@example.com",
    "phoneNumber": "+1234567890",
    "gstin": "12ABCDE3456F1Z5",
    "role": "user"
  }
}
```

#### Error Responses
- `400`: Refresh token required
- `401`: Invalid refresh token

---

### 6. Logout
**POST** `/logout`

Invalidates the current session and refresh token.

#### Request Body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Required Fields
- `refreshToken` (string): Valid refresh token

#### Response
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### Error Responses
- `400`: Refresh token required

---

### 7. Get User Profile
**GET** `/profile`

Retrieves the current user's profile information.

#### Headers
```
Authorization: Bearer <access_token>
```

#### Response
```json
{
  "success": true,
  "message": "Profile endpoint - to be implemented with auth middleware"
}
```

**Note**: This endpoint is currently a placeholder and requires authentication middleware implementation.

---

## Frontend Routes

### React Router Configuration
The frontend uses React Router for client-side navigation with the following structure:

#### App.js Routes
```jsx
import { Route, Routes } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}
```

#### Available Frontend Routes
- `/` - Home page
- `/login` - Login page (Login.jsx)
- `/register` - Registration page (Register.jsx)

#### Frontend Components
- **Login Component**: `/src/route/auth/login.jsx`
- **Register Component**: `/src/route/auth/register.jsx`
- **Auth Styles**: `/src/route/auth/auth.css`

---

## Security Features

### Password Requirements
- Minimum 6 characters
- Stored using bcrypt hashing

### Token Security
- **Access Tokens**: 15-minute expiry
- **Refresh Tokens**: 7-day expiry
- **Session Management**: Server-side session tracking
- **Device Tracking**: Optional device information logging

### Data Validation
- Email format validation
- Required field validation
- Unique email enforcement
- Role-based access control

### Database Transactions
- All registration and login operations use database transactions
- Automatic rollback on errors
- Data consistency guaranteed

---

## Error Handling

### Common Error Codes
- `400`: Bad Request (validation errors, missing fields)
- `401`: Unauthorized (invalid credentials, expired tokens)
- `500`: Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Environment Variables

### Required Environment Variables
```env
JWT_ACCESS_SECRET=your_access_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

## Usage Examples

### Complete Registration Flow
```javascript
// 1. Register as admin
const registerResponse = await fetch('/api/auth/register/admin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    emailID: 'admin@example.com',
    phoneNumber: '+1234567890',
    name: 'Admin User',
    password: 'securePassword123',
    gstin: '12ABCDE3456F1Z5',
    device: 'Web Browser'
  })
});

const registerData = await registerResponse.json();
// Store tokens securely
localStorage.setItem('accessToken', registerData.tokens.accessToken);
localStorage.setItem('refreshToken', registerData.tokens.refreshToken);
```

### Complete Login Flow
```javascript
// 1. Login
const loginResponse = await fetch('/api/auth/login/admin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    emailID: 'admin@example.com',
    password: 'securePassword123',
    device: 'Web Browser'
  })
});

const loginData = await loginResponse.json();
// Store tokens securely
localStorage.setItem('accessToken', loginData.tokens.accessToken);
localStorage.setItem('refreshToken', loginData.tokens.refreshToken);
```

### Token Refresh Flow
```javascript
// 2. Refresh token when access token expires
const refreshResponse = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    refreshToken: localStorage.getItem('refreshToken')
  })
});

const refreshData = await refreshResponse.json();
// Update access token
localStorage.setItem('accessToken', refreshData.accessToken);
```

### Logout Flow
```javascript
// 3. Logout
const logoutResponse = await fetch('/api/auth/logout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    refreshToken: localStorage.getItem('refreshToken')
  })
});

// Clear stored tokens
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
```

---

## Database Schema

### Users Table
- `uid` (VARCHAR): Unique 12-character alphanumeric identifier
- `username` (VARCHAR): Unique username generated from email
- `name` (VARCHAR): Full name
- `emailID` (VARCHAR): Email address (unique)
- `phoneNumber` (VARCHAR): Phone number
- `gstin` (VARCHAR): GST identification number (nullable)
- `password` (VARCHAR): Bcrypt hashed password
- `role` (ENUM): 'admin' or 'user'
- `createdAt` (TIMESTAMP): Account creation timestamp
- `lastLogin` (TIMESTAMP): Last login timestamp

### Sessions Table
- `sessionID` (VARCHAR): Unique session identifier
- `refreshToken` (TEXT): JWT refresh token
- `uid` (VARCHAR): User identifier (foreign key)
- `expiry` (TIMESTAMP): Session expiration
- `device` (VARCHAR): Device information
- `createdAt` (TIMESTAMP): Session creation timestamp

---

## Testing

### Test Registration
```bash
curl -X POST http://72.60.219.181:3000/api/auth/register/admin \
  -H "Content-Type: application/json" \
  -d '{
    "emailID": "test@example.com",
    "phoneNumber": "+1234567890",
    "name": "Test Admin",
    "password": "test123"
  }'
```

### Test Login
```bash
curl -X POST http://72.60.219.181:3000/api/auth/login/admin \
  -H "Content-Type: application/json" \
  -d '{
    "emailID": "test@example.com",
    "password": "test123"
  }'
```

---

## Notes

1. **Session Management**: Each login clears all existing sessions for security
2. **Token Expiry**: Access tokens expire in 15 minutes, refresh tokens in 7 days
3. **Role-based Access**: Admin and user roles are strictly separated
4. **Database Transactions**: All operations use transactions for data consistency
5. **UID Generation**: 12-character alphanumeric UIDs with collision checking
6. **Username Generation**: Automatically generated from email addresses
7. **Device Tracking**: Optional device information for session management

For any questions or issues, please refer to the backend logs or contact the development team.
