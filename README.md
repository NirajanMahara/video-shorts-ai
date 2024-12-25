# Video Short Generator

A Next.js application that automatically generates short-form videos from longer content. The application uses AI-powered scene detection and smart segmentation to create engaging short clips.

## Features

- 🎥 Automatic video processing and segmentation
- 🎬 Smart scene detection
- 📝 Automatic caption generation
- 🎨 Video filters and effects
- 🔐 User authentication with Clerk
- ☁️ AWS S3 storage integration
- 📊 Analytics dashboard
- 🎯 Segment selection and preview

## Tech Stack

- **Frontend**: Next.js 14, React 18, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **Storage**: AWS S3
- **Video Processing**: FFmpeg
- **Transcription**: Whisper
- **Styling**: Tailwind CSS, Radix UI

## Prerequisites

- Node.js 18 or higher
- PostgreSQL database
- FFmpeg installed on your system
- AWS S3 bucket and credentials
- Clerk account for authentication

## Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in the environment variables:
   ```env
   # Database
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/video_short"

   # Clerk Auth
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
   CLERK_SECRET_KEY=your_secret_key

   # S3 Storage
   STORAGE_REGION=us-east-1
   STORAGE_ACCESS_KEY=your_access_key
   STORAGE_SECRET_KEY=your_secret_key
   STORAGE_BUCKET=your_bucket_name
   ```

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Development Workflow

1. Create a new feature branch from development:
   ```bash
   git checkout development
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them:
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

3. Push your changes and create a pull request to the development branch:
   ```bash
   git push origin feature/your-feature-name
   ```

4. After review and approval, merge to development branch
5. When ready for production, create a pull request from development to main

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run type-check` - Run TypeScript type checking

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
