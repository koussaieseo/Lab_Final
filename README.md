# Social Network Mini-App

A comprehensive full-stack social network application designed to teach graph relationship concepts through practical implementation using Neo4j and MongoDB.

## 🎯 Learning Objectives

This project demonstrates:
- **Graph Database Concepts**: Node-relationship modeling, mutual connection analysis, network graph visualization
- **Document Database Usage**: Schema design, atomic operations, content management
- **Full-Stack Integration**: Combining graph and document databases in a single application
- **Modern Web Development**: React, Node.js, RESTful APIs, authentication, real-time updates
- **Data Visualization**: Interactive network graphs and relationship mapping

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                  │
├─────────────────────────────────────────────────────────────┤
│  Components: Home | Profile | Feed | Recommendations | Graph │
│  UI Library: shadcn/ui + Tailwind CSS                    │
│  State: AuthContext + React Hooks                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Node.js)                    │
├─────────────────────────────────────────────────────────────┤
│  Authentication | User Management | Content Management      │
│  Relationships | Recommendations | Media Upload            │
│  JWT Security | Validation | Error Handling               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────┬───────────────────────────────────────┐
│   Graph Database    │          Document Database            │
│     (Neo4j)         │            (MongoDB)                  │
├─────────────────────┼───────────────────────────────────────┤
│ • User relationships│ • User profiles                       │
│ • Follow/unfollow   │ • Posts and content                 │
│ • Network analysis  │ • Comments and interactions         │
│ • Graph algorithms  │ • Media files and metadata          │
│ • Shortest paths    │ • Notifications and settings        │
└─────────────────────┴───────────────────────────────────────┘
```

## 🚀 Tech Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Databases**: Neo4j (graph) + MongoDB (document)
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Express-validator
- **File Upload**: Multer with cloud storage support
- **Security**: Helmet, CORS, rate limiting

### Frontend
- **Framework**: React 18 with Vite
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State Management**: React Context API
- **HTTP Client**: Axios

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint
- **Environment**: dotenv

## 📋 Features

### User Management
- ✅ User registration and authentication
- ✅ Profile management with avatar upload
- ✅ Follow/unfollow functionality
- ✅ User search and discovery

### Content Management
- ✅ Create, read, update, delete posts
- ✅ Rich text content with media support
- ✅ Like/dislike system with atomic operations
- ✅ Comment threads with nested replies
- ✅ Infinite scroll feed

### Social Features
- ✅ Social graph visualization
- ✅ People you may know recommendations
- ✅ Mutual connections display
- ✅ Network relationship analysis

### Technical Features
- ✅ JWT-based authentication
- ✅ Input validation and sanitization
- ✅ Error handling and logging
- ✅ Rate limiting and security headers
- ✅ Responsive design
- ✅ Sample data generation

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Neo4j (v4.0 or higher) - Optional for basic functionality
- npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd social-network-app
```

### 2. Backend Setup

```bash
cd backend
npm install
```

#### Environment Configuration
Create a `.env` file in the backend directory:
```bash
cp .env.example .env
```

Edit the `.env` file with your database credentials:
```env
# Neo4j Configuration (Optional for basic functionality)
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/social_network

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Server Configuration
PORT=5000
NODE_ENV=development
```

#### Start the Backend Server
```bash
npm start
# or for development with auto-reload
npm run dev
```

The backend API will be available at `http://localhost:5000`

### 3. Frontend Setup

```bash
cd ../social-network-app
npm install
```

#### Configure API Endpoint
The frontend is pre-configured to connect to `http://localhost:5000/api`. If your backend runs on a different port, update the API URL in `src/services/api.js`.

#### Start the Development Server
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 4. Generate Sample Data (Optional)

To populate the database with sample users, posts, and relationships:

```bash
cd backend
node scripts/generateSampleData.js
```

This will create:
- 8 sample users with realistic profiles
- Social relationships between users
- Sample posts and comments

**Test Account Credentials:**
- Email: `alice@example.com` (or any other sample email)
- Password: `password123`

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <jwt_token>
```

### User Management Endpoints

#### Get User Profile
```http
GET /api/users/:userId
```

#### Update Profile
```http
PUT /api/users/:userId
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "bio": "Software developer passionate about AI",
  "location": "San Francisco, CA",
  "website": "https://johndoe.dev"
}
```

#### Follow/Unfollow User
```http
POST /api/users/:userId/follow
Authorization: Bearer <jwt_token>
```

```http
DELETE /api/users/:userId/follow
Authorization: Bearer <jwt_token>
```

### Content Endpoints

#### Create Post
```http
POST /api/posts
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "content": "Just launched my new project! 🚀",
  "tags": ["webdev", "opensource"]
}
```

#### Get Feed
```http
GET /api/posts/feed?page=1&limit=10
Authorization: Bearer <jwt_token>
```

#### Like/Dislike Post
```http
POST /api/posts/:postId/like
Authorization: Bearer <jwt_token>
```

```http
POST /api/posts/:postId/dislike
Authorization: Bearer <jwt_token>
```

#### Add Comment
```http
POST /api/posts/:postId/comments
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "content": "Great post! Really helpful."
}
```

### Recommendation Endpoints

#### Get People You May Know
```http
GET /api/recommendations/people?page=1&limit=10
Authorization: Bearer <jwt_token>
```

#### Get Content Recommendations
```http
GET /api/recommendations/content?page=1&limit=10
Authorization: Bearer <jwt_token>
```

#### Get Network Graph Data
```http
GET /api/recommendations/network-graph
Authorization: Bearer <jwt_token>
```

## 🎯 Key Learning Concepts

### Graph Database (Neo4j)

**Node Types:**
- `User` nodes represent users with properties like name, username, etc.
- `Post` nodes represent content with properties like content, timestamp, etc.

**Relationship Types:**
- `FOLLOWS` - User-to-user following relationships
- `LIKES` - User-to-post like relationships
- `COMMENTED_ON` - User-to-post comment relationships

**Graph Queries:**
```cypher
// Find mutual connections
MATCH (user:User {username: 'alice'})-[:FOLLOWS]->(mutual)<-[:FOLLOWS]-(other:User)
WHERE NOT (user)-[:FOLLOWS]->(other)
RETURN other, count(mutual) as mutual_connections

// Find shortest path between users
MATCH path = shortestPath(
  (start:User {username: 'alice'})-[:FOLLOWS*]-(end:User {username: 'henry'})
)
RETURN path
```

### Document Database (MongoDB)

**Collections:**
- `users` - User profiles and authentication data
- `posts` - Content with embedded media and interaction data
- `comments` - Nested comment threads
- `media` - File metadata and references

**Schema Design Patterns:**
- Embedding for one-to-few relationships (likes in posts)
- Referencing for one-to-many relationships (comments)
- Atomic operations for counters and interactions

### Frontend Architecture

**Component Structure:**
```
src/
├── components/
│   ├── auth/          # Login/Register components
│   ├── layout/        # Navbar, layout components
│   ├── ui/            # shadcn/ui components
│   ├── Feed.jsx       # Infinite scroll feed
│   ├── Home.jsx       # Main dashboard
│   ├── Profile.jsx    # User profile page
│   ├── Recommendations.jsx # People/content recommendations
│   └── NetworkGraph.jsx    # Graph visualization
├── contexts/
│   └── AuthContext.jsx # Authentication state
├── services/
│   └── api.js         # API client configuration
└── lib/
    └── utils.js       # Utility functions
```

**State Management:**
- Authentication state via React Context
- Component-level state with useState
- Data fetching with useEffect and custom hooks

## 🔧 Development Tips

### Backend Development
- Use the built-in validation middleware for input sanitization
- Implement proper error handling with try-catch blocks
- Follow RESTful conventions for API design
- Use environment variables for configuration

### Frontend Development
- Follow the existing component patterns and naming conventions
- Use shadcn/ui components for consistent UI
- Implement proper loading and error states
- Use the existing API service for all backend calls

### Database Operations
- Use transactions for multi-document operations
- Implement proper indexing for query performance
- Use aggregation pipelines for complex queries
- Consider data consistency between Neo4j and MongoDB

## 🐛 Common Issues and Solutions

### MongoDB Connection Issues
- Ensure MongoDB is running on the configured port
- Check the connection string format
- Verify database user permissions

### Neo4j Connection Issues
- Ensure Neo4j is running and accessible
- Check bolt port configuration
- Verify authentication credentials

### Frontend Build Issues
- Clear node_modules and reinstall dependencies
- Check for conflicting peer dependencies
- Ensure all environment variables are set

### CORS Issues
- Verify the backend CORS configuration
- Check that frontend API URL is correct
- Ensure proper headers are being sent

## 📖 Educational Exercises

### Beginner Level
1. **User Profile Enhancement**: Add new fields to user profiles (birthday, interests)
2. **Post Categories**: Implement post categorization system
3. **Search Functionality**: Add user and content search features

### Intermediate Level
1. **Real-time Notifications**: Implement WebSocket-based notifications
2. **Content Moderation**: Add reporting and moderation features
3. **Analytics Dashboard**: Create user engagement analytics

### Advanced Level
1. **Machine Learning Integration**: Add content recommendation ML models
2. **Graph Algorithm Implementation**: Implement custom graph algorithms
3. **Performance Optimization**: Optimize database queries and caching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Neo4j for graph database technology
- MongoDB for document database capabilities
- shadcn/ui for beautiful UI components
- React community for excellent frontend tools
- Node.js ecosystem for robust backend solutions

## 📞 Support

For questions, issues, or contributions, please open an issue in the GitHub repository.

---

**Happy Learning! 🎓** This project is designed to help you understand modern web development, database design, and graph relationships through hands-on implementation.