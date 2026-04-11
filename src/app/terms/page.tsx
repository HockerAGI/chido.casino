import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[#00F0FF] font-black mb-3">Términos</p>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">Términos y condiciones</h1>
          <p className="mt-4 text-white/60 max-w-2xl">Versión clara, directa y lista para usuario real.</p>
        </div>

        <section className="rounded-3xl border border-white/10 bg-black/40 p-6 space-y-4 text-white/70 leading-relaxed">
          <p>Chido Casino es una plataforma de entretenimiento para mayores de 18 años.</p>
          <p>El uso de la cuenta implica aceptación de las reglas del sitio, políticas de retiro, validación KYC y medidas antifraude.</p>
          <p>La plataforma puede suspender cuentas, bloquear bonos o retener retiros ante abuso, multi-cuenta o uso indebido de promociones.</p>
          <p>Los juegos, bonos y límites pueden cambiar sin previo aviso cuando el backend lo requiera.</p>
        </section>

        <Link href="/legal" className="inline-flex items-center rounded-2xl bg-white text-black px-5 py-3 font-black">
          Ver legal completo
        </Link>
      </div>
    </div>
  );
}