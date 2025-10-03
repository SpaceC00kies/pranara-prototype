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
        // Modern Calm Palette - Minimal, airy, contemporary
        primary: {
          50: '#F5F9F7',       // Lightest sage
          100: '#E1EFEA',      // Very light sage - BACKGROUND
          200: '#C3DFD3',      // Light sage
          300: '#64AF9A',      // Sage Green - PRIMARY
          400: '#5A9B87',      // Medium sage
          500: '#4F8A78',      // Deeper sage
          600: '#447969',      // Dark sage
          700: '#39685A',      // Darker sage
          800: '#2E574B',      // Very dark sage
          900: '#23463C',      // Darkest sage
        },

        // Modern Calm Colors
        seafoam: '#5EEAD4',    // Light, refreshing primary
        skyMist: '#E0F2F1',    // Airy background
        slateGrey: '#334155',   // Modern, grounding
        softGold: '#D4AF37',    // Highlight accent

        // Pranara's signature color - Sage Green
        pranara: {
          light: '#E1EFEA',    // Light sage for backgrounds
          main: '#64AF9A',     // Main Pranara color - Sage Green
          dark: '#5A9B87',     // Darker for hover states
        },

        // Modern neutral palette - Clean and minimal
        neutral: {
          50: '#FAFAFA',       // Pure white
          100: '#F5F5F5',      // Light gray
          200: '#E5E5E5',      // Subtle borders
          300: '#D4D4D4',      // Light borders
          400: '#A3A3A3',      // Muted text
          500: '#737373',      // Secondary text
          600: '#525252',      // Primary text light
          700: '#334155',      // Slate Grey - grounding
          800: '#262626',      // Dark text
          900: '#171717',      // Darkest text
        },

        // Text hierarchy - Modern and clean
        text: {
          primary: '#334155',    // Slate Grey for main content
          secondary: '#64748B',  // Medium slate for secondary content
          muted: '#94A3B8',      // Light slate for supporting text
          light: '#E2E8F0',      // Light text for dark backgrounds
        },

        // Background system - Airy and minimal
        background: {
          primary: '#FFFFFF',    // Pure white
          secondary: '#E0F2F1',  // Sky Mist - airy background
          tertiary: '#F8FAFC',   // Very light slate
        },

        // Accent colors - Refined highlights
        accent: {
          gold: '#D4AF37',       // Soft Gold for highlights
          seafoam: '#5EEAD4',    // Seafoam for primary actions
          mist: '#E0F2F1',       // Sky Mist for subtle accents
        },
      },

      // Typography with Fontshare fonts
      fontFamily: {
        // Keep existing Thai fonts
        prompt: ['Prompt', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sarabun: ['Sarabun', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        
        // Add IBM Plex Sans Thai - Local font
        'ibm-plex-thai': ['IBM Plex Sans Thai', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],

        // Add Google fonts
        'space-mono': ['var(--font-space-mono)', 'monospace'],

        // Add Fontshare fonts
        satoshi: ['Satoshi', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        general: ['General Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        cabinet: ['Cabinet Grotesk', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        boska: ['Boska', 'ui-serif', 'Georgia', 'serif'],
      },

      // Enhanced spacing system
      spacing: {
        '18': '4.5rem',   // 72px
        '22': '5.5rem',   // 88px
        '26': '6.5rem',   // 104px
        '30': '7.5rem',   // 120px
        '34': '8.5rem',   // 136px
        '38': '9.5rem',   // 152px
      },

      // Modern border radius
      borderRadius: {
        '2xl': '1rem',     // 16px
        '3xl': '1.5rem',   // 24px
        '4xl': '2rem',     // 32px
      },

      // Health-themed shadows with blue tints
      boxShadow: {
        'health-sm': '0 1px 2px 0 rgba(74, 144, 226, 0.05), 0 1px 3px 0 rgba(74, 144, 226, 0.1)',
        'health-md': '0 4px 6px -1px rgba(74, 144, 226, 0.1), 0 2px 4px -1px rgba(74, 144, 226, 0.06)',
        'health-lg': '0 10px 15px -3px rgba(74, 144, 226, 0.1), 0 4px 6px -2px rgba(74, 144, 226, 0.05)',
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'chat': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'glow': '0 0 20px rgba(74, 144, 226, 0.15)',
      },

      // Smooth animations for modern UX
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'blob': 'blob 7s infinite',
        'typing': 'typing 1.5s infinite',
        'bounce-gentle': 'bounceGentle 1s ease-in-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },

      // Comprehensive keyframes for organic animations
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        typing: {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-10px)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },

      // Enhanced backdrop blur
      backdropBlur: {
        xs: '2px',
      },

      // Custom transitions
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
    },
  },
  plugins: [],
}

export default config