/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Canvas → surface ladder. Near-black, not pure black, so hairlines read.
        ink: {
          0: '#08090B',
          1: '#0B0D10',
          2: '#101317',
          3: '#171B21',
          4: '#20252D',
        },
        // Foreground ladder. All three verified ≥4.5:1 on ink-0 and ink-2.
        fg: {
          0: '#F7F8F8',
          1: '#AAB1BC',
          2: '#8A919D',
        },
        accent: {
          DEFAULT: '#4C7EFF',
          soft: '#9DB8FF',
          dim: '#2A4A9E',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Fluid display scale — clamp() so 375px never overflows and 1440px stays cinematic.
        // Sized so the three hero lines fit their column without wrapping at
        // every tested width — the per-line mask reveal depends on that.
        'display-xl': ['clamp(2.125rem, 5.8vw, 6.75rem)', { lineHeight: '1.0', letterSpacing: '-0.035em' }],
        'display-lg': ['clamp(1.875rem, 4.2vw, 3.25rem)', { lineHeight: '1.06', letterSpacing: '-0.03em' }],
        'display-md': ['clamp(1.75rem, 3.4vw, 2.75rem)', { lineHeight: '1.1', letterSpacing: '-0.022em' }],
        'display-sm': ['clamp(1.375rem, 2.2vw, 1.75rem)', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
        lead: ['clamp(1.0625rem, 1.35vw, 1.25rem)', { lineHeight: '1.6', letterSpacing: '-0.008em' }],
        eyebrow: ['0.75rem', { lineHeight: '1', letterSpacing: '0.16em' }],
      },
      spacing: {
        section: 'clamp(5rem, 11vh, 9.5rem)',
        gutter: 'var(--gutter)',
      },
      maxWidth: {
        shell: 'var(--shell-max)',
        measure: '38rem',
      },
      transitionTimingFunction: {
        // Single easing vocabulary, mirrored in lib/motion.js.
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        ui: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        fast: '180ms',
        base: '320ms',
        slow: '640ms',
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
}
