/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        parchment: '#fefffc',
        paper: '#ffffff',
        linen: '#f9faf7',
        'ink-black': '#171717',
        graphite: '#2c2c2c',
        charcoal: '#444141',
        ash: '#646464',
        fog: '#b4b8b4',
        mist: '#dee2de',
        twilight: '#282834',
        dusk: '#1f1f29',
        'signal-blue': '#41a1cf',
        cerulean: '#0081c0',
      },
      fontFamily: {
        serif: ['var(--font-display-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        pill: '50px',
        card: '12px',
        cardLg: '16px',
        btn: '8px',
        surface: '24px',
      },
      boxShadow: {
        subtle: 'rgba(0, 0, 0, 0.08) 0px 1px 1px 0px, rgba(0, 0, 0, 0.08) 0px 4px 5px 0px',
        nav: '0px 2px 12px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
