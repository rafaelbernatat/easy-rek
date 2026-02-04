'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: 'O que é o Easy Rek?',
    answer: 'Easy Rek é uma plataforma de gravação de tela profissional que permite gravar tela e câmera simultaneamente, editar vídeos rapidamente, adicionar lower thirds personalizados, elementos de YouTube e publicar em qualquer plataforma.',
  },
  {
    question: 'Como funciona o plano gratuito?',
    answer: 'O plano Free oferece 500MB de armazenamento, 7 dias de retenção na lixeira, gravação de tela + câmera e editor básico. É ideal para começar a testar a plataforma sem custo.',
  },
  {
    question: 'Quais as diferenças entre os planos?',
    answer: 'O plano Pro (R$19/mês) oferece 2GB de armazenamento, 30 dias na lixeira, lower thirds customizáveis, elementos de YouTube, legendas automáticas com IA e recursos de IA para resumos e cortes. O plano Enterprise (R$49/mês) inclui 10GB de armazenamento, 90 dias na lixeira e suporte prioritário.',
  },
  {
    question: 'Posso cancelar minha assinatura a qualquer momento?',
    answer: 'Sim! Você pode cancelar sua assinatura a qualquer momento através da página de configurações. Após o cancelamento, você continuará tendo acesso aos recursos pagos até o final do período atual.',
  },
  {
    question: 'Meus vídeos ficam privados?',
    answer: 'Por padrão, todos os seus vídeos são privados e só você pode acessá-los. Você também pode compartilhar vídeos publicamente através de um link ou protegê-los com senha.',
  },
  {
    question: 'Preciso instalar algum software?',
    answer: 'Não! O Easy Rek funciona 100% no navegador. Basta acessar o site, fazer login e começar a gravar. Não há necessidade de downloads ou instalações.',
  },
  {
    question: 'Como funciona a garantia?',
    answer: 'Oferecemos uma garantia de 14 dias. Se você não estiver satisfeito com o plano Pro ou Enterprise, podemos reembolsar o valor pago. Entre em contato com o suporte para solicitar o reembolso.',
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 px-4 bg-slate-50">
      <div className="max-w-3xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-slate-600 text-lg">
            Encontre respostas para as dúvidas mais comuns
          </p>
        </motion.div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqData.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                aria-expanded={openIndex === index}
              >
                <span className="font-medium text-slate-900 pr-4">
                  {item.question}
                </span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-shrink-0"
                >
                  <ChevronDown className="w-5 h-5 text-slate-500" />
                </motion.div>
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-5 pt-0 text-slate-600 leading-relaxed">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-12"
        >
          <p className="text-slate-600 mb-4">
            Ainda tem dúvidas?
          </p>
          <a
            href="mailto:suporte@easyrek.com"
            className="inline-flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
          >
            Entre em contato conosco
            <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
