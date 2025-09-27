# CLY Backend Architecture

## Project Structure
```
backend/
├── config.js              # Environment configuration
├── index.js               # Application entry point
├── package.json           # Dependencies and scripts
├── controllers/           # Request handlers (MVC)
├── models/                # Data models (MVC)
├── services/              # Business logic layer
├── views/                 # Template/rendering layer
└── documentation/
    └── architecture.md    # This file
```

## Technology Stack
- **Node.js** + **Express.js 5.1.0**
- **PostgreSQL** database
- **JWT** authentication
- **CORS** enabled
- **dotenv** for configuration

## Architecture Pattern: MVC + Service Layer

### Controllers (`/controllers/`)
Handle HTTP requests and responses
- Route incoming requests
- Validate input data
- Call appropriate services
- Return responses

### Models (`/models/`)
Define data structures and database interactions
- Database schema definitions
- Data validation rules
- Database queries and operations

### Services (`/services/`)
Contain business logic
- Process data from controllers
- Handle complex business rules
- Interact with models
- External API integrations

### Views (`/views/`)
Template rendering (if needed)
- Server-side rendering templates
- Email templates
- Static content generation

## Current Setup
- **Port**: 5000 (configurable via `config.js`)
- **Health Check**: `GET /health`
- **CORS**: Configured for frontend apps
- **Environment**: Development ready with nodemon

## Development Commands
```bash
npm run dev    # Start with nodemon
npm start      # Production start
```

## Configuration
All settings centralized in `config.js`:
- Server port and environment
- Database connection details
- JWT settings
- CORS origins
- File upload limits 