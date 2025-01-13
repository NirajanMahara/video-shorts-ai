/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'localhost',
      process.env.AWS_BUCKET_NAME ? `${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com` : '',
    ].filter(Boolean),
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  webpack: (config) => {
    config.externals = [...config.externals, { canvas: 'canvas' }];  // required for ffmpeg
    return config;
  },
};

module.exports = nextConfig; 