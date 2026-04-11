import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[#FF0099] font-black mb-3">Privacidad</p>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">Aviso de privacidad</h1>
          <p className="mt-4 text-white/60 max-w-2xl">Resumen operativo para producción real.</p>
        </div>

        <section className="rounded-3xl border border-white/10 bg-black/40 p-6 space-y-4 text-white/70 leading-relaxed">
          <p>Recopilamos datos necesarios para crear cuenta, validar identidad, procesar depósitos y retiros, prevenir fraude y dar soporte.</p>
          <p>La información puede compartirse con proveedores técnicos necesarios para operar el servicio, siempre bajo control del sistema.</p>
          <p>El usuario puede solicitar soporte sobre acceso, corrección o eliminación según la política interna y requisitos legales aplicables.</p>
        </section>

        <Link href="/legal" className="inline-flex items-center rounded-2xl bg-white text-black px-5 py-3 font-black">
          Volver a legal
        </Link>
      </div>
    </div>
  );
}