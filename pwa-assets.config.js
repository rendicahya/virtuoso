// Generates the PWA icons in public/ from public/icon.svg.
// Run with: npx @vite-pwa/assets-generator@1.0.2
const background = '#07060d';

export default {
  headLinkOptions: { preset: '2023' },
  preset: {
    transparent: { sizes: [64, 192, 512], favicon: [[48, 'favicon.ico']] },
    maskable: { sizes: [512], padding: 0.3, resizeOptions: { background } },
    apple: { sizes: [180], padding: 0.3, resizeOptions: { background } },
  },
  images: ['public/icon.svg'],
};
