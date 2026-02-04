'use client';

import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
import { motion } from 'framer-motion';

export function HeroSection() {
  return (
    <section className="py-20 px-4 text-center">
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium mb-6"
      >
        🚀 Novo: Legendas automáticas com IA
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-5xl md:text-7xl font-bold mb-6 tracking-tight"
      >
        Gravação de tela
        <br />
        <span className="text-indigo-600">profissional</span>
      </motion.h1>

      {/* Subheadline */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-xl text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed"
      >
        Grave tela + câmera, edite em minutos, adicione lower thirds
        personalizados e publique onde quiser. Tudo em um só lugar.
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex gap-4 justify-center mb-12"
      >
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          Criar Conta
          <ArrowRight className="w-5 h-5" />
        </Link>

        <Link
          href="/demo"
          className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition-colors"
        >
          <Play className="w-5 h-5" />
          Ver Demo
        </Link>
      </motion.div>

      {/* Video Preview Placeholder */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl bg-slate-900 aspect-video flex items-center justify-center"
      >
        <p className="text-white/60">Vídeo demo em breve...</p>
      </motion.div>
    </section>
  );
}
