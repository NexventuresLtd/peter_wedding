/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Every colour resolves through a CSS variable, which SiteContext
      // rewrites from the admin-controlled theme — changing the theme in the
      // admin console repaints the whole site with no rebuild.
      //
      // The variables hold space-separated RGB channels ("15 76 58") rather
      // than hex so that Tailwind's opacity modifiers (bg-primary/10) work.
      colors: {
        primary: 'rgb(var(--c-primary) / <alpha-value>)',
        'primary-dark': 'rgb(var(--c-primary-dark) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        'accent-soft': 'rgb(var(--c-accent-soft) / <alpha-value>)',
        canvas: 'rgb(var(--c-background) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        'surface-alt': 'rgb(var(--c-surface-alt) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        'ink-muted': 'rgb(var(--c-ink-muted) / <alpha-value>)',
        hairline: 'rgb(var(--c-border) / <alpha-value>)',
        success: 'rgb(var(--c-success) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        'on-primary': 'rgb(var(--c-on-primary) / <alpha-value>)',
        'on-accent': 'rgb(var(--c-on-accent) / <alpha-value>)',
        // Hero text sits on a photo, so it is themed independently.
        'hero-title': 'rgb(var(--c-hero-title) / <alpha-value>)',
        'hero-kicker': 'rgb(var(--c-hero-kicker) / <alpha-value>)',
        'hero-text': 'rgb(var(--c-hero-text) / <alpha-value>)',
      },
      fontFamily: {
        heading: 'var(--f-heading)',
        body: 'var(--f-body)',
        script: 'var(--f-script)',
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        pill: 'var(--r-pill)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-800px 0' },
          '100%': { backgroundPosition: '800px 0' },
        },
        // Lightbox slide transitions — the new image enters from the side the
        // viewer is travelling towards.
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(6%) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-6%) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        'zoom-in': {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.5s ease both',
        shimmer: 'shimmer 1.6s linear infinite',
        'slide-in-right': 'slide-in-right 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-left': 'slide-in-left 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
        'zoom-in': 'zoom-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
