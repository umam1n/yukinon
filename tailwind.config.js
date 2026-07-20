/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      colors: {
        // These are overridden by CSS custom properties at runtime for theme customization
        accent: 'var(--color-accent)',
        'accent-2': 'var(--color-accent-2)'
      }
    }
  },
  plugins: []
}
