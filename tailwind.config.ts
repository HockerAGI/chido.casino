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
        // Fuente del sistema optimizada para velocidad (Cero Latencia)
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        // Paleta "Chido" alineada a la documentación (Neon Cyberpunk)
        chido: {
          bg: "#050510",      // Negro profundo (Fondo base)
          card: "#121225",    // Tarjetas (Elevación 1)
          cyan: "#00F0FF",    // Color Primario (Energía)
          red: "#FF3D00",     // Acentos (Acción/Riesgo)
          green: "#32CD32",   // Éxito/Dinero
          gold: "#FFD700",    // VIP/Premium
          text: "#EAEAEA"
        },
        // Paleta Zinc para UI Pro (Soporte neutral)
        zinc: {
          800: "#27272a",
          850: "#1f1f22",
          900: "#18181b", 
          950: "#09090b", // Fondo principal ultra oscuro
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    }
  },
  plugins: []
};

export default config;