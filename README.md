# Movie Analytics & Recommendation System

A FastAPI-based web application that provides movie analytics and recommendations using MongoDB and Neo4j databases.

## Overview

This project implements a movie recommendation system with analytics capabilities, leveraging:
- **MongoDB** for movie data storage and aggregation queries
- **Neo4j** for graph-based relationship analysis and recommendations
- **FastAPI** for the REST API framework

## Features

### Core Functionality
- **Movie Management**: List, search, and update movie information
- **User Management**: List users and view their rating statistics
- **Data Integration**: Cross-database queries between MongoDB and Neo4j

### Recommendation Engine
- **Item-based Collaborative Filtering**: "People who liked this movie also liked..."
- **User-based Collaborative Filtering**: "Recommended for you based on similar users"
- **Multi-tier Fallback System**: Ensures recommendations even with limited data

### Analytics
- **Top Genres**: Most popular movie genres by count
- **Movies by Year**: Distribution of movies per release year
- **Top Rated Movies**: Highest-rated movies with minimum vote threshold
- **User Connections**: Find degrees of separation between users based on shared movie ratings

## API Endpoints

### Movies
- `GET /movies` - List all movies (paginated)
- `GET /movies/search?name={name}` - Search movies by title
- `GET /movies/search?actor={actor}` - Search movies by actor
- `PUT /movies/{name}` - Update movie information
- `GET /movies/common` - Count movies common between MongoDB and Neo4j
- `GET /movies/{name}/raters` - List users who rated a specific movie

### Users
- `GET /users` - List all users (paginated)
- `GET /users/{name}` - Get user rating statistics

### Recommendations
- `GET /recommendations/movies/{title}` - Get movie recommendations
- `GET /recommendations/users/{user_name}` - Get user recommendations

### Analytics
- `GET /analytics/top-genres` - Get most popular genres
- `GET /analytics/movies-by-year` - Get movies distribution by year
- `GET /analytics/top-rated-movies` - Get top-rated movies
- `GET /analytics/users/path?user1={name1}&user2={name2}` - Find shortest path between users

## Installation

1. **Prerequisites**
   - Python 3.7+
   - Docker and Docker Compose
   - MongoDB and Neo4j (or use Docker Compose)

2. **Clone and Setup**
   ```bash
   # Clone the repository
   git clone <repository-url>
   cd Lab_Final

   # Install dependencies
   pip install -r requirements.txt
   ```

3. **Environment Configuration**
   
   The application uses environment variables for configuration. A `.env` file has been created with default settings:
   
   ```bash
   # MongoDB Configuration
   MONGO_URI=mongodb://localhost:27017/sample_mflix
   MONGO_DB_NAME=sample_mflix
   
   # Neo4j Configuration  
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=password
   
   # FastAPI Configuration
   API_HOST=0.0.0.0
   API_PORT=8000
   DEBUG=false
   ```
   
   **Customize the `.env` file** for your specific database setup:
   - Update `MONGO_URI` if MongoDB is running on a different host/port
   - Update `NEO4J_URI`, `NEO4J_USER`, and `NEO4J_PASSWORD` for your Neo4j instance
   - Modify `API_PORT` if you need to run on a different port


4. **Run the Application**
   ```bash
   # Start the FastAPI server
   cd app
   
   # Or using uvicorn directly:
   uvicorn main:app --reload
   ```

5. **Access the API**
   - API Documentation: http://localhost:8000/docs

## Project Structure

```
Lab_Final/
├── app/
│   ├── __pycache__/
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── analytics.py      # Analytics endpoints
│   │   └── recommendations.py # Recommendation endpoints
│   ├── config/
│   │   ├── __init__.py
│   │   ├── config.py         # Configuration settings
│   │   ├── database.py       # Database connection logic
│   │   └── models.py         # Pydantic models
│   ├── main.py               # Main FastAPI application
│   └── start.py              # Server startup script
├── sample_mflix.*.json      # Sample data files
├── seed.py                  # Database seeding script
├── requirements.txt         # Python dependencies
├── docker-compose.yml       # Docker services configuration
└── Readme.md               # This file
```

## Dependencies

- **fastapi** - Modern web framework for building APIs
- **uvicorn** - ASGI server implementation
- **pymongo** - MongoDB Python driver
- **neo4j** - Neo4j Python driver
- **python-dotenv** - Environment variable management

## Test Data Examples

### User: Jessica Thompson
Jessica Thompson is a sample user in the database with movie ratings and connections. Use this user for testing user-based recommendations.

### Movie: Jerry Maguire
Jerry Maguire is a popular sample movie used throughout the system for testing movie-based recommendations and analytics.

## Usage Examples

### Get Movie Recommendations
```bash
# Get recommendations for Jerry Maguire
curl "http://localhost:8000/recommendations/movies/Jerry%20Maguire"

# Expected response (similar movies based on user preferences):
[
  {
    "movie": "Almost Famous",
    "score": 42,
    "year": 2000
  },
  {
    "movie": "Vanilla Sky",
    "score": 38,
    "year": 2001
  },
  {
    "movie": "The Firm",
    "score": 35,
    "year": 1993
  }
]
```

### Get User Recommendations
```bash
# Get recommendations for Jessica Thompson
curl "http://localhost:8000/recommendations/users/Jessica%20Thompson"

# Expected response (movies Jessica might like):
[
  {
    "movie": "The Shawshank Redemption",
    "score": 15
  },
  {
    "movie": "The Godfather",
    "score": 12
  },
  {
    "movie": "Pulp Fiction",
    "score": 10
  }
]
```

### Search Movies by Actor
```bash
# Search for Tom Hanks movies
curl "http://localhost:8000/movies/search?actor=Tom%20Hanks"

# Expected response:
[
  {
    "title": "Forrest Gump",
    "year": 1994,
    "genres": ["Drama", "Romance"],
    "rated": "PG-13"
  },
  {
    "title": "Cast Away",
    "year": 2000,
    "genres": ["Adventure", "Drama"],
    "rated": "PG-13"
  }
]
```

### Get Analytics - Top Genres
```bash
# Get most popular movie genres
curl "http://localhost:8000/analytics/top-genres"

# Expected response:
[
  {
    "_id": "Drama",
    "count": 2452
  },
  {
    "_id": "Comedy",
    "count": 1876
  },
  {
    "_id": "Romance",
    "count": 1234
  }
]
```

### Find User Connections
```bash
# Find connection path between users
curl "http://localhost:8000/analytics/users/path?user1=Jessica%20Thompson&user2=Tom%20Hanks"

# Expected response (shortest path through shared movies):
[
  "Jessica Thompson",
  "Jerry Maguire",
  "Tom Hanks"
]
```

### Get Movie Details
```bash
# Get Jerry Maguire details
curl "http://localhost:8000/movies/search?name=Jerry%20Maguire"

# Expected response:
{
  "title": "Jerry Maguire",
  "year": 1996,
  "genres": ["Comedy", "Drama", "Romance"],
  "rated": "R",
  "plot": "When a sports agent has a moral epiphany and decides to put his clients first...",
  "directors": ["Cameron Crowe"],
  "cast": ["Tom Cruise", "Cuba Gooding Jr.", "Renée Zellweger"]
}
```

### Get User Statistics
```bash
# Get Jessica Thompson's rating statistics
curl "http://localhost:8000/users/Jessica%20Thompson"

# Expected response:
{
  "name": "Jessica Thompson",
  "total_reviews": 45,
  "avg_rating": 3.8,
  "favorite_genre": "Drama",
  "recent_movies": ["Jerry Maguire", "Almost Famous", "Vanilla Sky"]
}
```

## Database Configuration

### MongoDB
- **Port**: 27017
- **Database**: sample_mflix
- **Default Connection**: mongodb://localhost:27017/sample_mflix

### Neo4j
- **HTTP Port**: 7474
- **Bolt Port**: 7687
- **Default Credentials**: neo4j/password
- **Default Connection**: bolt://localhost:7687

## Development

The application uses FastAPI's automatic API documentation. Visit `/docs` endpoint for interactive API testing and documentation.

### Adding New Features
1. Create new routers in `app/routers/`
2. Add database models in `app/config/models.py`
3. Update main.py to include new routers
4. Add appropriate tests and documentation

### Testing Recommendations
Use these test cases to verify your recommendation system:

```bash
# Test user with many reviews (should have good collaborative filtering)
curl "http://localhost:8000/recommendations/users/Jessica%20Thompson"

# Test user with few reviews (should trigger fallback recommendations)
curl "http://localhost:8000/recommendations/users/New%20User"

# Test popular movie (should have many collaborative recommendations)
curl "http://localhost:8000/recommendations/movies/Jerry%20Maguire"

# Test obscure movie (should trigger fallback recommendations)
curl "http://localhost:8000/recommendations/movies/Unknown%20Movie"
```

## Troubleshooting

### Swagger UI Loading Issues
If the Swagger UI stays loading forever:
1. Check that the server is running: `python app/main.py`
2. Verify database connections in `app/config/database.py`
3. Ensure all dependencies are installed: `pip install -r requirements.txt`

### Empty Recommendation Results
The system now includes multi-tier fallback mechanisms:
1. **Primary**: Collaborative filtering (users/movies with similar preferences)
2. **Fallback 1**: Popular content filtering (high-rated/popular items)
3. **Fallback 2**: Content-based filtering (similar genres, cast, release years)

This ensures you get recommendations even for new users or obscure movies.

