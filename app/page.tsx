import SetsGrid from "@/components/SetsGrid";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen font-sans">
      <section className="hero-gradient relative">
        <div className="container mx-auto px-6 pt-20 pb-28 flex flex-col items-center text-center">
          <div className="flex items-center flex-col gap-3 mb-6">
            <img src="/logo.png" alt="DJ Gokai" className="h-60 object-contain" />
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-white mb-6">
            Energia que envolve, som que conta histórias
          </h1>
          <p className="max-w-2xl text-white/80 text-lg md:text-xl mb-10">
            Sets imersivos que atravessam house, techno e bass — explorando groove, dinâmica e transições que fluem como uma performance ao vivo.
            Cada batida é um ato, cada pista é um novo palco.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="#sets" className="btn-primary pill px-6 py-3 text-sm font-medium glow">
              Ouça os Sets
            </a>
            <a href="#contact" className="btn-secondary pill px-6 py-3 text-sm font-medium">
              Contrate para Eventos
            </a>
          </div>

        </div>
      </section>


      <section id="sets" className="container mx-auto px-6 py-16">
        <h2 className="section-title text-2xl md:text-3xl font-semibold mb-8">Sets em Destaque</h2>
        <SetsGrid />
      </section>

      <section id="about" className="container mx-auto px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="section-title text-2xl md:text-3xl font-semibold mb-4">Sobre o DJ</h2>
          <p className="text-white/80 leading-7 mb-6 text-justify">
            Minha paixão pela música nasceu nos palcos. Antes de mergulhar nas pistas, vivi intensamente o universo do teatro musical —
            como cantor e ator, aprendi a contar histórias por meio do som, do ritmo e da emoção.
            Hoje, levo essa mesma energia para os meus sets: cada apresentação é uma performance que mistura batidas envolventes,
            texturas cênicas e uma conexão real com o público.
            Transformo a pista em um espetáculo — onde cada transição, cada drop e cada silêncio têm um propósito.
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="card p-4">
              <div className="text-2xl font-semibold">100%</div>
              <div className="text-xs text-white/70">Paixão pela música</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-semibold">∞</div>
              <div className="text-xs text-white/70">Vibe e energia</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-semibold">1</div>
              <div className="text-xs text-white/70">Propósito: conectar pessoas</div>
            </div>
          </div>

        </div>
        <div className="card overflow-hidden">
          <Image
            src="https://firebasestorage.googleapis.com/v0/b/bene-brasil-533af.firebasestorage.app/o/dj-hero.png?alt=media&token=23da5d2c-5ace-4707-9512-d8bfbe517643"
            alt="DJ Booth"
            className="w-full h-72 md:h-[420px] object-cover"
            width={1500}
            height={420}
            priority
            sizes="(max-width: 768px) 100vw, 900px"
          />
        </div>
      </section>


      <section id="contact" className="container mx-auto px-6 py-16">
        <div className="card p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl md:text-2xl font-semibold mb-2">Pronto para o próximo ato?</h3>
            <p className="text-white/80 text-sm">
              Shows, eventos e experiências sonoras — cada performance é uma história contada em batidas, luz e emoção.
            </p>
          </div>
          <div className="flex gap-4">
            <a
              href="https://wa.me/5516981541659?text=Ol%C3%A1%2C%20tenho%20interesse%20em%20contratar%20o%20DJ%20Gokai%20para%20um%20evento."
              target="_blank"
              rel="noreferrer"
              className="btn-primary pill px-5 py-3 text-sm font-medium glow"
            >
              WhatsApp
            </a>
            {/* <a href="#" className="pill px-5 py-3 text-sm">Baixar Press Kit</a> */}
          </div>
        </div>

      </section>
    </main>
  );
}

