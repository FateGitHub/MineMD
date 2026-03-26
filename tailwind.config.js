/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        editor: {
          bg: 'var(--editor-bg)',
          surface: 'var(--editor-surface)',
          text: 'var(--editor-text)',
          'text-secondary': 'var(--editor-text-secondary)',
          border: 'var(--editor-border)',
          accent: 'var(--editor-accent)',
          hover: 'var(--editor-hover)',
          active: 'var(--editor-active)',
          'sidebar-bg': 'var(--editor-sidebar-bg)',
          'sidebar-active': 'var(--editor-sidebar-active)',
          'sidebar-hover': 'var(--editor-sidebar-hover)',
          'toolbar-bg': 'var(--editor-toolbar-bg)',
          'statusbar-bg': 'var(--editor-statusbar-bg)',
          'statusbar-text': 'var(--editor-statusbar-text)',
        },
      },
      fontFamily: {
        editor: ['var(--editor-font-family)', 'sans-serif'],
        mono: ['var(--editor-mono-font)', 'monospace'],
      },
      maxWidth: {
        'editor': 'var(--editor-content-max-width)',
      },
      spacing: {
        'sidebar': 'var(--sidebar-width)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
}
