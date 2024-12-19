/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        permanent: ['Permanent Marker', 'cursive'],
      },
      colors : {
        primary : "#ffffff",
        secondary : "#e4dca5",
        surface : "#282828",
        onSurface : "#656461"
      }, 
      animation: {
        'scale-x-o': 'scaleXAnimation .5s ease-out', // Define the custom animation
      },
      keyframes: {
        scaleXAnimation: {
          '0%': { transform: 'scaleX(0)' },  
          '100%': { transform: 'scaleX(1)' },  
        },
      },
    },
  },
  plugins: [],
}

