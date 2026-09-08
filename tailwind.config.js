/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-alt': 'var(--bg-alt)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        line: 'var(--border)',
        ink: 'var(--text)',
        muted: 'var(--text-muted)',
        dim: 'var(--text-dim)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        display: ['"Space Grotesk"', 'Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
