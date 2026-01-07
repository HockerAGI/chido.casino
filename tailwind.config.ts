import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        chido: {
          bg: "#050510",
          card: "#121225",
          cyan: "#00F0FF",
          red: "#FF3D00",
          green: "#32CD32",
          gold: "#FFD700",
          text: "#EAEAEA"
        }
      }
    }
  },
  plugins: []
};

export default config;