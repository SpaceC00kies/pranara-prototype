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
        // Primary palette - Calming healthcare blues
        primary: {
          50: '#E9F2FC',
          100: '#D3E5F9',
          200: '#A7CBF3',
          300: '#7BB1ED',
          400: '#4F97E7',
          500: '#4A90E2', // Main primary blue - calming and trustworthy
          600: '#357ABD',
          700: '#2A6298',
          800: '#1F4A73',
          900: '#14324E',
        },
        
        // Health-focused colors - Nature-inspired wellness palette
        health: {
          green: '#10b981',    // Fresh, vibrant green for positive health indicators
          mint: '#6EE7B7',     // Soft mint for gentle accents
          sage: '#A7F3D0',     // Calming sage for backgrounds
        },
        
        // Warm support colors - Comforting and approachable
        warm: {
          peach: '#FED7AA',    // Gentle peach for warmth
          coral: '#FCA5A5',    // Soft coral for friendly highlights
          lavender: '#E9D5FF', // Calming lavender for serenity
        },
        
        // Modern neutral palette - Sophisticated grays with warmth
        neutral: {
          50: '#FAFAFA',       // Pure white with hint of warmth
          100: '#F5F5F5',      // Light gray for backgrounds
          200: '#E5E5E5',      // Subtle borders
          300: '#D4D4D4',      // Light borders
          400: '#A3A3A3',      // Muted text
          500: '#737373',      // Secondary text
          600: '#525252',      // Primary text light
          700: '#404040',      // Primary text
          800: '#262626',      // Dark text
          900: '#171717',      // Darkest text
        },
        
        // Text hierarchy - Clear information architecture
        text: {
          primary: '#1a202c',    // Dark, high contrast for main content
          secondary: '#4a5568',  // Medium contrast for secondary content
          muted: '#9CA3AF',      // Low contrast for supporting text
          light: '#E2E8F0',      // Light text for dark backgrounds
        },
        
        // Border colors - Subtle and health-focused
        border: {
          light: '#E2E8F0',     // Light borders
          medium: '#CBD5E0',    // Medium borders
          dark: '#A0AEC0',      // Dark borders
        },
        
        // Background gradients and surfaces
        surface: {
          primary: '#FFFFFF',    // Pure white
          secondary: '#F7FAFC',  // Off-white
          tertiary: '#EDF2F7',   // Light gray
        },
        
        // Status colors - Healthcare appropriate
        status: {
          success: '#10b981',    // Green for success/healthy
          warning: '#F59E0B',    // Amber for caution
          error: '#EF4444',      // Red for errors/urgent
          info: '#3B82F6',       // Blue for information
        },
      },
      
      // Thai-optimized typography
      fontFamily: {
        prompt: ['Prompt', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sarabun: ['Sarabun', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
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