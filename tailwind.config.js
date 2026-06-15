/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      colors: {
        navy: {
          DEFAULT: '#0f1b2d',
          2: '#162032',
          3: '#1e2d42',
          4: '#243347',
        },
      },
      animation: {
        'slide-up': 'slideUp 0.22s ease',
      },
    },
  },
  plugins: [],
}
