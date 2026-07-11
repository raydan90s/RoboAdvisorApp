/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontSize: {
        caption: ['12px', { lineHeight: '16px' }],
        body: ['14px', { lineHeight: '20px' }],
        'body-md': ['16px', { lineHeight: '24px' }],
        title: ['18px', { lineHeight: '26px' }],
        heading: ['20px', { lineHeight: '28px' }],
        display: ['24px', { lineHeight: '32px' }],
        hero: ['26px', { lineHeight: '34px' }],
      },
      colors: {
        brand: {
          primary: '#1E3A8A',
          accent: '#84CC16',
        },
        brandAlpha: {
          primarySoft: 'rgba(30, 58, 138, 0.06)',
          primaryMedium: 'rgba(30, 58, 138, 0.18)',
          accentSoft: 'rgba(132, 204, 22, 0.12)',
          accentMedium: 'rgba(132, 204, 22, 0.18)',
        },
        whiteAlpha: {
          ghost: 'rgba(255, 255, 255, 0.10)',
          soft: 'rgba(255, 255, 255, 0.14)',
          medium: 'rgba(255, 255, 255, 0.22)',
        },
        blackAlpha: {
          ghost: 'rgba(0, 0, 0, 0.05)',
        },
        stateAlpha: {
          errorSoft: 'rgba(239, 68, 68, 0.08)',
          warningSoft: 'rgba(245, 158, 11, 0.18)',
        },
        text: {
          primary: '#18181B',
          secondary: '#71717A',
          muted: '#A1A1AA',
          onPrimary: '#FFFFFF',
          onAccent: '#18181B',
        },
        surface: {
          background: '#FFFFFF',
          secondary: '#F4F4F5',
          elevated: '#FAFAFA',
          border: '#E5E7EB',
          divider: '#D1D5DB',
          canvas: '#F9FAFB',
        },
        state: {
          success: '#84CC16',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#1E3A8A',
        },
        avatars: {
          1: '#2563EB',
          2: '#7C3AED',
          3: '#0891B2',
          4: '#BE185D',
          5: '#059669',
          6: '#D97706',
        },
      },
    },
  },
  plugins: [],
};
