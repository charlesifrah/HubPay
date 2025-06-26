# Sales Commission Management System

## Overview

This is a full-stack sales commission management system built with React, Express, PostgreSQL, and Drizzle ORM. The system manages sales contracts, invoices, and commission calculations for Account Executives (AEs) and administrators.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state
- **Routing**: wouter for client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Authentication**: JWT tokens with bcrypt for password hashing
- **Session Management**: Express sessions with PostgreSQL store
- **API Design**: RESTful endpoints with role-based access control

### Database Architecture
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Strongly typed with Zod validation
- **Migrations**: Drizzle Kit for schema management

## Key Components

### User Management
- Role-based authentication (Admin/AE)
- JWT token-based sessions
- Invitation system for user registration
- Password reset functionality

### Contract Management
- Contract creation and tracking
- Support for different contract types (new, renewal, upsell)
- Payment terms and pilot program tracking
- AE assignment and value tracking

### Invoice Processing
- Invoice creation linked to contracts
- Revenue type classification (recurring, non-recurring, service)
- Automatic commission calculation triggers
- Tabs API integration for invoice synchronization

### Commission Engine
- Automated commission calculations based on business rules
- Base commission: 10% of invoice amount
- Bonus structures: Pilot bonus, multi-year bonus, upfront bonus
- OTE (On-Target Earnings) cap at $1M with decelerator
- Status tracking (pending, approved, rejected, paid)

### Dashboard System
- Admin dashboard with system-wide metrics
- AE dashboard with personalized performance data
- Real-time data visualization
- Recent activity tracking

## Data Flow

1. **Contract Creation**: Admins create contracts and assign them to AEs
2. **Invoice Processing**: Invoices are created and linked to contracts
3. **Commission Calculation**: Automated engine calculates commissions based on invoices
4. **Approval Workflow**: Admins review and approve/reject commissions
5. **Payout Tracking**: Approved commissions are tracked for payment processing

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless driver
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **jsonwebtoken**: JWT authentication
- **@sendgrid/mail**: Email service integration

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **react-hook-form**: Form management
- **zod**: Schema validation

### Development Dependencies
- **tsx**: TypeScript execution
- **esbuild**: JavaScript bundler
- **vite**: Development server and build tool

## Deployment Strategy

### Development Environment
- Replit-optimized with hot reloading
- PostgreSQL 16 module
- Port configuration for external access
- Development error overlay

### Production Build
- Vite builds client assets to `dist/public`
- esbuild bundles server code to `dist/index.js`
- Static file serving from Express
- Environment variable configuration

### Database Management
- Drizzle migrations in `./migrations`
- Schema defined in `./shared/schema.ts`
- Push-based deployment with `db:push` command

## External Integrations

### Tabs API Integration
- **Invoice Synchronization**: Automatically pulls paid customer invoices from Tabs revenue automation platform
- **Data Mapping**: Maps Tabs invoice data to internal commission structures with sync tracking
- **Authentication**: Uses API key authentication (TABS_API_KEY environment variable)
- **Simulation Mode**: Functions with realistic mock responses when API credentials unavailable

### Email Notifications
- **Payout Approval Alerts**: Admin receives email notifications when commissions are approved for payment
- **SendGrid Integration**: Uses SendGrid service for reliable email delivery
- **Fallback Handling**: Logs notifications when SendGrid unavailable, ensuring commission approval continues

## Changelog

- June 25, 2025. Initial setup
- June 25, 2025. Modified Tabs integration: Removed payout processing, added email notifications for approved payouts
- June 26, 2025. Commission configuration system completed: Added database schema for flexible commission structures, admin interface for creating/managing configurations, AE assignment interface, and successfully migrated existing commission logic into "Standard Commission Structure" configuration assigned to current AEs

## User Preferences

Preferred communication style: Simple, everyday language.