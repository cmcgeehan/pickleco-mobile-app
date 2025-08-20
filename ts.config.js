/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
      './pages/**/*.{ts,tsx}',
      './components/**/*.{ts,tsx}',
      './app/**/*.{ts,tsx}',
      './src/**/*.{ts,tsx}',
    ],
    theme: {
      container: {
        center: true,
        padding: "2rem",
        screens: {
          "2xl": "1400px",
        },
      },
      extend: {
        fontFamily: {
          sans: ['var(--font-league-spartan)'],
        },
        colors: {
          primary: "#2A62A2",
          "primary-foreground": "#FFFFFF",
          secondary: "#819DBD",
          highlight: "#bed61e",
          coral: "#FF5964",
          neutral: "#D7D7D7",
          background: "#FFFFFF",
          foreground: "#020817",
          card: "#FFFFFF",
          "card-foreground": "#020817",
          popover: "#FFFFFF",
          "popover-foreground": "#020817",
          muted: "#F1F5F9",
          "muted-foreground": "#64748B",
          accent: "#F1F5F9",
          "accent-foreground": "#020817",
          destructive: "#EF4444",
          "destructive-foreground": "#F8FAFC",
          border: "#E2E8F0",
          input: "#E2E8F0",
          ring: "#020817",
        },
        spacing: {
          '4': '1rem',
          '6': '1.5rem',
          '8': '2rem',
          '16': '4rem',
        },
        borderRadius: {
          'md': '0.375rem',
          'lg': '0.5rem',
          'sm': '0.25rem',
        },
        fontSize: {
          'sm': '0.875rem',
          'base': '1rem',
          'xl': '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
          '4xl': '2.25rem',
          '6xl': '4rem',
        },
        height: {
          '4': '1rem',
          '6': '1.5rem',
          '10': '2.5rem',
          'full': '100%',
        },
        width: {
          '4': '1rem',
          '6': '1.5rem',
          'full': '100%',
          'auto': 'auto',
        },
        minWidth: {
          '0': '0',
        },
        maxWidth: {
          'full': '100%',
        },
        aspectRatio: {
          'square': '1 / 1',
        },
        keyframes: {
          "accordion-down": {
            from: { height: 0 },
            to: { height: "var(--radix-accordion-content-height)" },
          },
          "accordion-up": {
            from: { height: "var(--radix-accordion-content-height)" },
            to: { height: 0 },
          },
          pulse: {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: .5 },
          },
        },
        animation: {
          "accordion-down": "accordion-down 0.2s ease-out",
          "accordion-up": "accordion-up 0.2s ease-out",
          'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },
        backgroundOpacity: {
          '50': '0.5',
        },
        inset: {
          '0': '0',
        },
        gap: {
          '2': '0.5rem',
          '4': '1rem',
          '6': '1.5rem',
        },
        gridTemplateColumns: {
          '1': 'repeat(1, minmax(0, 1fr))',
          '2': 'repeat(2, minmax(0, 1fr))',
          '4': 'repeat(4, minmax(0, 1fr))',
        },
        screens: {
          'sm': '640px',
          'lg': '1024px',
          'md': '768px',
        },
      },
    },
    plugins: [
      require("tailwindcss-animate"),
    ],
  } 