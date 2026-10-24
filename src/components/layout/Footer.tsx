
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-white/5 py-12 pb-20 md:pb-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Logo and About */}
          <div className="md:col-span-2 space-y-6">
            <Link href="/" className="group inline-block">
              <div className="bg-white/5 border border-white/10 p-2 rounded-3xl shadow-2xl backdrop-blur-sm transition-all group-hover:border-primary/40 group-hover:bg-white/10">
                <Image 
                  src="/assets/images/logo.jpeg" 
                  alt="EPINEKO Logo" 
                  width={800}
                  height={513}
                  sizes="160px"
                  className="h-16 w-auto rounded-2xl object-contain transition-transform group-hover:scale-105" 
                />
              </div>
            </Link>
            <p className="text-zinc-500 max-w-sm leading-relaxed font-medium">
              Tu portal definitivo para descubrir, seguir y organizar tu pasión por el anime. 
              Únete a la comunidad más grande de fans.
            </p>

          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-black italic tracking-wider mb-6 uppercase text-sm">Explorar</h4>
            <ul className="space-y-4 text-zinc-500 text-sm font-medium">
              <li><Link href="/" className="hover:text-primary transition-colors">Inicio</Link></li>
              <li><Link href="/trending" className="hover:text-primary transition-colors">Tendencias</Link></li>
              <li><Link href="/library" className="hover:text-primary transition-colors">Mi Lista</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-black italic tracking-wider mb-6 uppercase text-sm">Legal</h4>
            <ul className="space-y-4 text-zinc-500 text-sm font-medium">
              <li><Link href="/terms" className="hover:text-primary transition-colors">Términos y Privacidad</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <p className="text-zinc-600 text-xs font-medium">
               &copy; 2026 <span className="text-zinc-400 font-bold">EPINEKO</span>. Todos los derechos reservados.
            </p>
            <a 
              href="https://github.com/devperez08/platform-list-anime" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-zinc-400 text-xs font-bold hover:bg-white/10 hover:border-white/20 transition-all group scale-95 hover:scale-100"
            >
              <svg className="w-4 h-4 fill-current transition-transform group-hover:rotate-12" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Código Abierto
            </a>
          </div>
          <div className="flex items-center gap-6">
             <p className="text-zinc-600 text-xs italic">
               Hecho con <span className="text-red-500">❤️</span> para fans del anime.
             </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
