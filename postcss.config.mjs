/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {
      // Tailwind v4 will automatically optimize and purge unused styles
    },
  },
}

export default config
