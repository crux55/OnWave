# OnWave 🎵

A modern radio streaming platform built with Next.js and Go. Discover, search, and listen to radio stations from around the world with an intuitive interface and powerful features.

## Features

- 🔍 **Advanced Search** - Find radio stations by name, genre, country, or tags
- 🎵 **Audio Player** - Built-in player with volume control and playback management
- 📺 **Show Listings** - Browse PBS radio shows with scheduling information
- 🔔 **Reminders** - Set reminders for upcoming shows
- 🤖 **AI Recommendations** - Get personalized station recommendations
- 👤 **User Profiles** - Manage your profile and preferences
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile

## Architecture

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Go REST API with JWT authentication
- **Database**: MySQL for data persistence
- **Cache**: Redis for improved performance
- **Real-time**: WebSocket connections for live updates

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- Go 1.21+ (for backend development)

### 1. Clone the Repository

```bash
git clone https://github.com/crux55/OnWave.git
cd OnWave
```

### 2. Build the Backend Image

First, build the Go backend image (assumes your Go project is in `../Go/project_r`):

```bash
# Navigate to your Go project directory
cd ../Go/project_r

# Build the Docker image
docker build -t onwave-backend:latest .

# Return to the OnWave directory
cd -
```

### 3. Start the Services

```bash
# Start all services
docker-compose up -d

# View logs (optional)
docker-compose logs -f
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8080
- **Database Admin**: http://localhost:8081 (phpMyAdmin)

## Services Overview

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000, 80:9002 | Next.js web application |
| Backend API | 8080 | Go REST API server |
| MySQL | 3306 | Primary database |
| Redis | 6379 | Caching layer |
| phpMyAdmin | 8081 | Database management |

## Development

### Frontend Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

### Backend Development

The backend is containerized, but for local development:

```bash
# Rebuild backend image after changes
cd ../Go/project_r
docker build -t onwave-backend:latest .
cd -

# Restart just the backend service
docker-compose restart backend
```

### Environment Variables

The application uses the following environment variables:

#### Frontend (Next.js)
- `NEXT_PUBLIC_API_BASE_URL` - Backend API URL (default: http://localhost:8080)
- `NEXT_PUBLIC_WS_URL` - WebSocket URL (default: ws://localhost:8080)

#### Backend (Go)
- `DATABASE_URL` - MySQL connection string
- `REDIS_ADDR` - Redis server address
- `REDIS_PASSWORD` - Redis authentication
- `JWT_SECRET` - JWT token secret
- `PORT` - Server port (default: 8080)

## API Endpoints

### Radio Stations
- `GET /webradio/search` - Search stations
- `GET /webradio/top` - Get top stations
- `GET /webradio/toptags` - Get popular tags

### PBS Shows
- `GET /pbs/shows/range` - Get shows by date range

### User Management
- `POST /users` - Register user
- `POST /users/login` - Login user
- `GET /users/me` - Get current user profile

### Reminders
- `POST /reminders` - Create reminder
- `GET /reminders` - Get user reminders
- `DELETE /reminders/:id` - Delete reminder

## Database Schema

The application uses MySQL with the following key tables:
- `users` - User accounts and profiles
- `radio_stations` - Cached station data
- `shows` - PBS show information
- `reminders` - User show reminders

## WebSocket Events

Real-time features are powered by WebSocket connections:
- `reminder` - Show reminder notifications
- `status` - Connection status updates

## Troubleshooting

### Common Issues

1. **Backend container won't start**
   ```bash
   # Check if the backend image exists
   docker images | grep onwave-backend
   
   # Rebuild if missing
   cd ../Go/project_r && docker build -t onwave-backend:latest .
   ```

2. **Database connection errors**
   ```bash
   # Check if MySQL is running
   docker-compose ps mysql
   
   # View MySQL logs
   docker-compose logs mysql
   ```

3. **Frontend API errors**
   - Verify `NEXT_PUBLIC_API_BASE_URL` points to the correct backend
   - Check if backend service is running on port 8080

### Logs

```bash
# View all service logs
docker-compose logs

# View specific service logs
docker-compose logs frontend
docker-compose logs backend
docker-compose logs mysql
```

### Reset Everything

```bash
# Stop and remove all containers and volumes
docker-compose down -v

# Remove images (optional)
docker rmi onwave-backend:latest

# Start fresh
docker-compose up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
