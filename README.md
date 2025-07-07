# HubPay - Sales Commission Management System

A sophisticated sales commission management system that empowers account executives with comprehensive contract and performance tracking capabilities.

## 🚀 Features

- **Role-based Authentication** - Secure login for Account Executives and Administrators
- **Contract Management** - Create, track, and manage sales contracts with automated AE assignment
- **Invoice Processing** - Upload and process invoices with automatic commission calculation
- **Commission Engine** - Automated commission calculations with configurable bonus structures
- **Dashboard Analytics** - Real-time performance tracking and commission analytics
- **Payout Management** - Streamlined approval workflow for commission payouts
- **Tabs Integration** - Automatic invoice sync from Tabs revenue automation platform
- **Email Notifications** - Automated alerts for payout approvals via SendGrid

## 🛠️ Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- shadcn/ui components with Radix UI primitives
- TanStack Query for state management
- Wouter for routing

### Backend
- Node.js with Express
- TypeScript for type safety
- PostgreSQL with Neon serverless driver
- Drizzle ORM for database operations
- JWT authentication with bcrypt
- SendGrid for email notifications

### Database
- PostgreSQL 16 with Drizzle ORM
- Strongly typed schema with Zod validation
- Automated migrations with Drizzle Kit

## 🏗️ Architecture

### Key Components
- **User Management** - Role-based access control (Admin/AE)
- **Contract System** - Multi-type contract support (new/renewal/upsell)
- **Commission Engine** - Configurable commission structures with OTE caps
- **Dashboard System** - Real-time analytics and performance tracking
- **External Integrations** - Tabs API and SendGrid email service

### Commission Calculation
- Base commission: Configurable percentage (default 10%)
- Bonus structures: Pilot, multi-year, and upfront bonuses
- OTE caps: Annual earning limits with decelerator rates
- Status tracking: Pending → Approved → Paid workflow

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- SendGrid API key (for email notifications)
- Tabs API key (for invoice sync)

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run database migrations: `npm run db:push`
5. Start development server: `npm run dev`

### Environment Variables
```env
DATABASE_URL=your_postgresql_connection_string
SENDGRID_API_KEY=your_sendgrid_api_key
TABS_API_KEY=your_tabs_api_key
SESSION_SECRET=your_session_secret
```

## 📖 Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `develop` - Staging/integration branch
- `feature/*` - New features
- `security/*` - Security and infrastructure changes

### Development Process
1. Create feature branch from `main`
2. Develop and test in Replit
3. Commit changes with descriptive messages
4. Create pull request for review
5. Merge after approval and testing

## 🔐 Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Role-based access control
- SQL injection prevention with parameterized queries
- Session management with PostgreSQL store

## 📊 Database Schema

### Core Tables
- `users` - User accounts and roles
- `contracts` - Sales contracts and details
- `invoices` - Invoice records with commission triggers
- `commissions` - Calculated commissions and payouts
- `commission_configs` - Configurable commission structures
- `ae_commission_assignments` - AE-specific commission configurations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support and questions, please contact the development team.

---

Built with ❤️ for sales teams everywhere.