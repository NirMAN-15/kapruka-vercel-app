/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kapruka: {
          purple: '#402970',
          'purple-dark': '#2e1c54',
          'purple-light': '#563a8e',
          'purple-deep': '#1f113a',
          yellow: '#f8da08',
          'yellow-dark': '#d6bb05',
          'yellow-light': '#fbe33d',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
