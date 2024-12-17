# Video Short - AI Video Processing

Transform long-form videos into engaging short-form content optimized for social media platforms.

## Features

- Upload and process long videos
- AI-powered scene detection and highlight extraction
- Automatic caption generation
- Export to various social media formats
- User authentication and video management

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Prisma (PostgreSQL)
- Clerk Authentication
- FFmpeg for video processing
- Cloud Storage (AWS S3 or similar)

## Getting Started

1. Clone the repository:
\`\`\`bash
git clone https://github.com/yourusername/video-short.git
cd video-short
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in the required environment variables

4. Set up the database:
\`\`\`bash
npx prisma generate
npx prisma db push
\`\`\`

5. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

\`\`\`env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/video_short?schema=public"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Storage
STORAGE_ACCESS_KEY=your_storage_access_key
STORAGE_SECRET_KEY=your_storage_secret_key
STORAGE_BUCKET=your_storage_bucket
STORAGE_REGION=your_storage_region
\`\`\`

## Development

- The application uses Next.js 14 with the App Router
- Authentication is handled by Clerk
- Database operations are managed through Prisma
- Video processing is done using FFmpeg
- File uploads are handled through cloud storage

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add some amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
