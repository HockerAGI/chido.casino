@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-main: #050510;
  --text-main: #fff;
}

body {
  background: var(--bg-main);
  color: var(--text-main);
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

/* Ocultar Scrollbar pero permitir scroll */
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

/* Patrón de fondo estilo "Mexican Tech" */
.bg-mexican-pattern {
  background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 20px 20px;
}

/* Animaciones Personalizadas */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
.animate-float {
  animation: float 4s ease-in-out infinite;
}

@keyframes pulse-slow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}
.animate-pulse-slow {
  animation: pulse-slow 3s ease-in-out infinite;
}

@keyframes dash {
  from { stroke-dasharray: 1000; stroke-dashoffset: 1000; }
  to { stroke-dashoffset: 0; }
}
.animate-dash {
  animation: dash 2s ease-out forwards;
}

@keyframes shake {
  0% { transform: translate(1px, 1px) rotate(0deg); }
  10% { transform: translate(-1px, -2px) rotate(-1deg); }
  20% { transform: translate(-3px, 0px) rotate(1deg); }
  30% { transform: translate(3px, 2px) rotate(0deg); }
  40% { transform: translate(1px, -1px) rotate(1deg); }
  50% { transform: translate(-1px, 2px) rotate(-1deg); }
  60% { transform: translate(-3px, 1px) rotate(0deg); }
  70% { transform: translate(3px, 1px) rotate(-1deg); }
  80% { transform: translate(-1px, -1px) rotate(1deg); }
  90% { transform: translate(1px, 2px) rotate(0deg); }
  100% { transform: translate(1px, -2px) rotate(-1deg); }
}
.shake {
  animation: shake 0.5s;
  animation-iteration-count: infinite;
}

/* Arreglo visual para imágenes Hero de baja resolución */
.hero-overlay {
  background-image: url('/hero-bg.jpg');
  background-size: cover;
  background-position: center;
  filter: brightness(0.5) contrast(1.2);
  position: absolute;
  inset: 0;
  z-index: 0;
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
