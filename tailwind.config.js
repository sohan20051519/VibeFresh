/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./App.tsx"
    ],
    darkMode: 'class', // Enable dark mode strategy
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                // Semantic Colors mapped to CSS variables
                background: 'var(--bg-background)',
                surface: 'var(--bg-surface)',
                foreground: 'var(--text-main)',
                muted: 'var(--text-muted)',
                border: 'var(--border-color)',

                // Custom Palette (matching your original dark theme)
                vibe: {
                    100: '#ededed', // Text Main
                    200: '#888888', // Text Muted
                    300: '#333333', // Borders / UI Elements
                    400: '#171717', // Surface / Components
                    500: '#0a0a0a', // Background
                    // keeping safe fallbacks or extensions if needed
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                }
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'shine': 'shine 1.5s infinite linear',
                'bounce-slow': 'bounce-slow 3s infinite ease-in-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                shine: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                },
                'bounce-slow': {
                    '0%, 100%': { transform: 'translateY(-5%)' },
                    '50%': { transform: 'translateY(5%)' },
                }
            }
        }
    },
    plugins: [],
}
