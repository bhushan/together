import type { NextConfig } from 'next';

const config: NextConfig = {
  images: {
    // Hero photography is the only heavy asset on the page, so let the
    // optimiser emit modern formats and serve the narrowest size that fits.
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [420, 640, 828, 1200, 1600, 2048],
    qualities: [72, 75],
  },
};

export default config;
