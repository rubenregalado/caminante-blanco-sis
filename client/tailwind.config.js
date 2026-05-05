/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue:      '#3B30D0',
          blueDark:  '#2D24A8',
          blueLight: '#EEF0FF',
          mint:      '#3DDBA0',
          mintDark:  '#28B882',
          mintLight: '#E8FBF4',
        }
      }
    },
  },
  plugins: [],
}

