# Mishin Learn - Smart Learning Platform

🎓 **AI-Powered Adaptive Learning Platform**

An innovative EdTech startup providing personalized learning experiences through AI tutoring, adaptive content delivery, and comprehensive progress analytics.

**Last Major Update**: January 17, 2026 - Notification System Query Fixes + UX Improvements

## 🚀 Features

### Core Learning Platform
- **Adaptive Learning Engine** - Personalized learning paths based on individual progress
- **AI Tutoring System** - Interactive AI assistant providing real-time help and guidance  
- **Smart Content Delivery** - Dynamic course content adapted to learning style
- **Progress Analytics** - Detailed insights and performance tracking
- **Assessment System** - Adaptive testing and skill evaluation

### Instructor Tools
- **Unified Course Management** - Single 4-tab interface for complete course control (Jan 14, 2026) ✅
  - **Course Details**: Edit metadata (title, description, category, level, price, thumbnail)
  - **Lesson Details**: Manage curriculum and lessons
  - **Assessments**: Configure course assessments
  - **Settings**: Course preferences and options
  - Smart navigation with query parameters
  - Real-time validation and error handling
  - Level field normalization (beginner, intermediate, advanced, expert)
  - Category mapping (10 categories with user-friendly names)
- **Course Creation Tools** - Rich authoring environment with comprehensive validation
- **Student Management** - View enrolled students with course filtering
- **Analytics Dashboard** - Course performance metrics and insights

### Advanced Features
- **Real-time Collaboration** - Live sessions, chat, and peer learning ✅
- **Live Study Sessions** - Instructor-led collaborative learning with enterprise-grade reliability (race condition protection, atomic joins, multi-device sync) ✅
- **Study Groups** - Peer collaboration spaces with online member tracking ✅  
- **Virtual Office Hours** - Queue-based instructor support with presence badges ✅
- **Presence System** - Real-time online/away/busy/offline status tracking with logout cleanup and "appear offline" support; new users default to 'online' for better UX (Jan 17, 2026) ✅
- **Auto-Updating Timestamps** - Relative time displays ("X minutes ago") automatically update every 60 seconds across 6 components without page refresh (Jan 12, 2026) ✅
- **Email Verification** - Secure account verification with Gmail SMTP, 6-digit codes, beautiful UI, resend with cooldown, profile badge integration ✅
- **Email Notification System** - Complete email delivery with realtime, daily, and weekly digest options, tracking, analytics, and one-click unsubscribe (Phases 1-3 Complete - 100%) ✅
  - **Active Triggers**: Lesson completion, live session creation (and all CRUD operations)
  - **Delivery Options**: Realtime, daily digest (8 AM), weekly digest (Monday 8 AM)
  - **Email Tracking**: Open/click tracking and analytics
  - **User Control**: Customizable preferences with quiet hours and one-click unsubscribe
- **Notifications Center** - Full-page notification management with **centralized Zustand store architecture**, real-time updates, pagination, filtering (type/priority), cross-tab synchronization, optimistic UI updates, and toast notifications (REFACTORED Jan 14, 2026) ✅
  - **Architecture**: Single socket listener in App.tsx → Zustand store → Components
  - **Features**: Optimistic updates, idempotent actions, priority-based toast (urgent/high: 5s, normal/low: 3s)
  - **Bug Fixes**: Resolved 13 critical bugs including race conditions and memory leaks
- **Privacy Settings** - Comprehensive privacy controls (profile visibility, email, progress, messages) - VERIFIED WORKING (Jan 10, 2026) ✅
  - **ProfileVisibility**: 3-tier system (public/students/private) enforced across platform
  - **ShowEmail**: Enforced in 7 endpoints with instructor override for enrolled students
  - **ShowProgress**: Enforced with 403 errors, instructor override for enrolled students
  - **AllowMessages**: Stored (not enforced - chat system disabled)
- **User Profile Management** - Comprehensive profile with 5 tabs (personal info, password, billing, preferences, account info) ✅
- **Payment System** - Stripe integration with secure checkout, professional invoice PDFs, production-ready error handling, enhanced refund UI, **database-level duplicate prevention** (Phases 1-6 Complete - 100%) ✅
- **Notification Preferences** - **Hybrid 3-level control system** with Global→Category→Subcategory toggles, 64 database columns, separate in-app/email controls, quiet hours, email digest options (FULLY IMPLEMENTED with dedicated /settings/notifications page - Dec 29, 2025) ✅
- **Bookmark System** - Save and organize favorite courses with cross-page synchronization (FULLY FUNCTIONAL - Dec 18, 2025) ✅
- **Avatar Upload** - Image upload with automatic processing and optimization ✅
- **Settings Page** - Privacy settings, appearance customization, and data management (VERIFIED Jan 10, 2026) ✅
  - Privacy controls fully functional and enforced system-wide
  - Appearance settings (theme/language/fontSize) stored but UI application pending
- **Transactions History** - Complete payment history with refund requests (DATABASE SETUP COMPLETE) ✅
- **Course Creation Tools** - Rich authoring environment for educators
- **Mobile Responsive** - Seamless experience across all devices
- **Social Learning** - Community features and collaborative projects
- **Gamification** - Points, badges, and achievement systems

## 📧 Email Notification System

**Complete email delivery infrastructure with 31 notification triggers** (16 active, 15 planned)

### Active Email Triggers
1. **Lesson Completion** - Student progress updates + instructor milestone alerts (25%, 50%, 75%, 100%)
2. **Live Session Created** - Notifications sent to all enrolled students

### Email Delivery Options
Users can choose their preferred notification delivery in Profile → Preferences:
- **Real-time**: Immediate email for each notification
- **Daily Digest**: One summary email per day at 8 AM UTC
- **Weekly Digest**: One summary email per week (Monday 8 AM UTC)
- **In-app Only**: Notifications without emails

### Features
- ✅ Professional HTML email templates with type-specific styling
- ✅ Email tracking (opens/clicks) and analytics
- ✅ One-click unsubscribe with beautiful confirmation page
- ✅ Quiet hours support (notifications queued and sent after quiet hours end)
- ✅ Preference enforcement (respects all user settings)
- ✅ Automatic digest aggregation and scheduled delivery via cron jobs

**See [NOTIFICATION_TRIGGERS_IMPLEMENTATION_PLAN.md](NOTIFICATION_TRIGGERS_IMPLEMENTATION_PLAN.md) for complete trigger list and implementation roadmap.**

## 🔒 Privacy Features

**Complete Privacy Control System** (Implemented December 18, 2025)

Users can customize their privacy settings to control what information others can see:

### Profile Visibility
- **Public**: Anyone can view your profile
- **Students Only**: Only classmates in your courses can view
- **Private**: Only you can view your profile

### Email Privacy
- **Show Email**: Display your email in user lists and profiles
- **Hide Email**: Keep your email private (shown as "Email hidden")

### Progress Privacy
- **Show Progress**: Allow others to view your learning progress
- **Hide Progress**: Keep your progress private

### Message Privacy (Ready for Chat Re-enablement)
- **Allow Messages**: Accept messages from other users
- **Block Messages**: Prevent users from messaging you

**Instructor Override**: Instructors can always view enrolled students' profiles, emails, and progress regardless of privacy settings.

**Access Settings**: Navigate to Settings page (`/settings`) to customize your privacy preferences.

**Privacy Testing**: Run `node test-privacy-settings.js` for comprehensive automated testing.

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

### Testing
- **pytest + Playwright** for E2E automated testing
- **597 test IDs** instrumented across 31 components (108.5% coverage)
- Comprehensive test selector map for reliable test automation
- See `TESTING_GUIDE.md` for setup and writing tests

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