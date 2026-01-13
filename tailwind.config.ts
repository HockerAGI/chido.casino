import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        chido: {
          bg: "#050510",
          card: "#121225",
          cyan: "#00F0FF",
          pink: "#FF0099",
          red: "#FF3D00",
          green: "#32CD32",
          gold: "#FFD700",
          text: "#EAEAEA"
        },
        zinc: {
          850: "#1f1f22",
          900: "#18181b", 
          950: "#09090b",
        }
      },
      backgroundImage: {
        'mexican-pattern': "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    }
  },
  plugins: []
};
export default config;