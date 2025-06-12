const colors = require('tailwindcss/colors');

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        near: {
          black: '#000000',
          white: '#FFFFFF',
          offwhite: '#f2f1e9',
          green: '#00ec97',
          red: '#ff7966',
          purple: '#9797ff',
          blue: '#17d9d4',
          gray: {
            50: '#f7f7f7',
            100: '#efefef',
            200: '#dfdfdf',
            300: '#cacaca',
            400: '#a8a8a8',
            500: '#878787',
            600: '#6d6d6d',
            700: '#5f5f5f',
            800: '#4a4a4a',
            900: '#3b3b3b',
          }
        }
      },
      fontFamily: {
        'fk-grotesk': ['FK Grotesk', 'sans-serif'],
        'circular': ['Circular Std', 'sans-serif']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'gradient 6s linear infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'near': '0 4px 14px 0 rgba(0, 236, 151, 0.1)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
