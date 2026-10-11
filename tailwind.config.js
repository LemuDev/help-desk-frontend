/** @type {import('tailwindcss').Config} */
// Los colores espejan `src/constants/theme.ts`: el sufijo `-dark` es el valor
// de `Colors.dark`, asi que cada token se usa como `bg-surface dark:bg-surface-dark`.
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#208AEF',
          dark: '#1C78D1',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#000000',
        },
        element: {
          DEFAULT: '#F0F0F3',
          dark: '#212225',
        },
        selected: {
          DEFAULT: '#E0E1E6',
          dark: '#2E3135',
        },
        content: {
          DEFAULT: '#000000',
          dark: '#ffffff',
        },
        muted: {
          DEFAULT: '#60646C',
          dark: '#B0B4BA',
        },
        danger: {
          DEFAULT: '#D93036',
          dark: '#FF6369',
        },
      },
    },
  },
  plugins: [],
};
