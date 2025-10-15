# Mishin Learn - Smart Learning Platform

🎓 **AI-Powered Adaptive Learning Platform**

An innovative EdTech startup providing personalized learning experiences through AI tutoring, adaptive content delivery, and comprehensive progress analytics.

## 🚀 Features

### Core Learning Platform
- **Adaptive Learning Engine** - Personalized learning paths based on individual progress
- **AI Tutoring System** - Interactive AI assistant providing real-time help and guidance  
- **Smart Content Delivery** - Dynamic course content adapted to learning style
- **Progress Analytics** - Detailed insights and performance tracking
- **Assessment System** - Adaptive testing and skill evaluation

### Advanced Features
- **Real-time Collaboration** - Live sessions, chat, and peer learning
- **Course Creation Tools** - Rich authoring environment for educators
- **Mobile Responsive** - Seamless experience across all devices
- **Social Learning** - Community features and collaborative projects
- **Gamification** - Points, badges, and achievement systems

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Material-UI (MUI)** for modern UI components
- **Chart.js/Recharts** for data visualization
- **React Router** for navigation
- **Socket.io** for real-time features

### Backend
- **Node.js** with Express and TypeScript
- **SQL Server** database
- **JWT Authentication** 
- **Socket.io** for real-time communication
- **AI Integration** for tutoring capabilities

### Database
- **SQL Server** with comprehensive schema for:
  - User management and profiles
  - Course and lesson structure
  - Progress tracking and analytics
  - AI tutoring sessions
  - Real-time chat and collaboration

## 📁 Project Structure

```
mishin-learn-platform/
├── client/          # React + TypeScript frontend
├── server/          # Node.js + Express backend
├── shared/          # Shared types and utilities
└── docs/           # Documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- SQL Server (localhost connection configured)
- npm or yarn

### Installation

1. **Install all dependencies**
   ```bash
   npm run install:all
   ```

2. **Set up environment variables**
   ```bash
   # Copy environment files
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```

3. **Configure database connection**
   - Update `server/.env` with your SQL Server details
   - Default: `data source=SergeyM\\SQLEXPRESS;initial catalog=startUp1;trusted_connection=true`

4. **Run development servers**
   ```bash
   npm run dev
   ```

This will start both the client (http://localhost:5173) and server (http://localhost:3001).

## 🎯 Core Modules

### 1. Learning Dashboard
- Personalized course recommendations
- Progress overview and analytics
- Upcoming sessions and deadlines
- Achievement tracking

### 2. AI Tutoring System
- Interactive AI assistant
- Adaptive questioning
- Personalized explanations
- Learning path optimization

### 3. Course Management
- Rich course creation tools
- Interactive lesson builder
- Assessment and quiz system
- Resource management

### 4. Analytics & Insights
- Learning progress visualization
- Performance metrics
- Time tracking
- Skill development analysis

### 5. Collaboration Features
- Real-time chat and forums
- Live learning sessions
- Peer-to-peer learning
- Group projects

## 🎨 Design System

**Mishin Brand Identity**
- Modern, clean, and accessible design
- Consistent color palette and typography
- Mobile-first responsive approach
- Intuitive user experience

## 🔧 Development

### Available Scripts
- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build production bundles
- `npm run start` - Start production server
- `npm run clean` - Clean build directories

### Environment Variables
See `.env.example` files in client and server directories for required configuration.

## 📊 Business Model

**Target Market**: Individual learners, students, professionals seeking skill development

**Revenue Streams**:
- Subscription-based access to premium content
- Course marketplace with revenue sharing
- Corporate training solutions
- AI tutoring premium features

## 🚀 Future Roadmap

- [ ] Mobile app development
- [ ] Advanced AI/ML features
- [ ] VR/AR learning experiences
- [ ] Enterprise solutions
- [ ] API for third-party integrations

## 📄 License & Copyright

**© 2025 Sergey Mishin. All rights reserved.**

This software is proprietary and confidential. Unauthorized copying, distribution, modification, or use of this software is strictly prohibited without explicit written permission from the copyright holder.

- **Source Code**: Available for viewing and educational purposes only
- **Commercial Use**: Prohibited without explicit license agreement
- **Contact**: s.mishin.dev@gmail.com for licensing inquiries

For full license terms, see [LICENSE](./LICENSE) file.

---

**Built with ❤️ by Sergey Mishin** | *Empowering learners through intelligent technology*