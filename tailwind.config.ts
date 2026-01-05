import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        chido: {
          bg: "#0B0C15",
          card: "#151725",
          cyan: "#00F0FF",
          red: "#FF3D00",
          green: "#00E676",
          gold: "#FFD700",
          text: "#EAEAEA"
        }
      },
      boxShadow: {
        "neon-cyan": "0 0 10px rgba(0,240,255,0.5), 0 0 20px rgba(0,240,255,0.25)",
        "neon-red": "0 0 10px rgba(255,61,0,0.5), 0 0 20px rgba(255,61,0,0.25)",
        "neon-green": "0 0 12px rgba(0,230,118,0.45), 0 0 22px rgba(0,230,118,0.2)"
      }
    }
  },
  plugins: []
};

export default config;