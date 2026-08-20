import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ios: {
          bg: '#F2F2F7',
          card: '#FFFFFF',
          tint: '#007AFF',
          'tint-secondary': '#5856D6',
          success: '#34C759',
          warning: '#FF9500',
          danger: '#FF3B30',
          gray: '#8E8E93',
          'gray-2': '#AEAEB2',
          'gray-3': '#C7C7CC',
          'gray-4': '#D1D1D6',
          'gray-5': '#E5E5EA',
          'gray-6': '#F2F2F7',
          separator: '#C6C6C8',
          'grouped-bg': '#F2F2F7',
        }
      },
      borderRadius: {
        'ios': '10px',
        'ios-lg': '20px',
        'ios-xl': '24px',
        'ios-full': '9999px',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'ios': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'ios-lg': '0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
        'ios-modal': '0 10px 40px rgba(0,0,0,0.15)',
      },
      animation: {
        'ios-slide-up': 'iosSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'ios-fade-in': 'iosFadeIn 0.3s ease-out',
        'ios-scale-in': 'iosScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'ios-bounce': 'iosBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        iosSlideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        iosFadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        iosScaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        iosBounce: {
          '0%': { transform: 'scale(0.8)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
