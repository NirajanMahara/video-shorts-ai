/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['video-short-uploads.s3.ca-central-1.amazonaws.com'],
  },
  webpack: (config) => {
    config.externals = [...config.externals, { canvas: 'canvas' }];  // required for ffmpeg
    return config;
  },
};

module.exports = nextConfig; 