'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Zap } from 'lucide-react';

interface PricingCardProps {
  name: string;
  price: number;
  yearlyPrice: number;
  features: string[];
  badge?: string;
  isYearly: boolean;
}

function PricingCard({ name, price, yearlyPrice, features, badge, isYearly }: PricingCardProps) {
  const finalPrice = isYearly ? yearlyPrice : price;
  const isFree = finalPrice === 0;

  return (
    <div className={`p-8 rounded-2xl border-2 flex flex-col ${badge ? 'border-indigo-600 relative' : 'border-slate-200'}`}>
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
            {badge}
          </span>
        </div>
      )}

      <h3 className="text-2xl font-bold mb-2">{name}</h3>

      <div className="mb-6">
        <span className="text-4xl font-bold">
          {isFree ? 'Grátis' : `R$${finalPrice}`}
        </span>
        {!isFree && <span className="text-slate-600">/mês</span>}
        {isYearly && !isFree && (
          <p className="text-sm text-green-600 mt-1">20% off anual</p>
        )}
      </div>

      <ul className="flex-1 space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-slate-700">{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={isFree ? '/signup' : `/signup?plan=${name.toLowerCase()}`}
        className={`w-full py-3 rounded-lg font-semibold text-center transition-colors ${
          badge
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
        }`}
      >
        {isFree ? 'Começar Grátis' : 'Assinar ' + name}
      </Link>
    </div>
  );
}

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);

  const plans = [
    {
      name: 'Free',
      price: 0,
      yearlyPrice: 0,
      features: [
        '500MB de armazenamento',
        '7 dias na lixeira',
        'Gravação de tela + câmera',
        'Editor básico',
      ],
    },
    {
      name: 'Pro',
      price: 19,
      yearlyPrice: 15,
      badge: 'Mais Popular',
      features: [
        '2GB de armazenamento',
        '30 dias na lixeira',
        'Tudo do Free +',
        'Lower thirds customizáveis',
        'YouTube elements',
        'IA para legendas',
        'IA para resumos',
        'IA para cortes automáticos',
        'Compartilhamento público',
      ],
    },
    {
      name: 'Enterprise',
      price: 49,
      yearlyPrice: 39,
      features: [
        '10GB de armazenamento',
        '90 dias na lixeira',
        'Tudo do Pro +',
        'Suporte prioritário',
        'API access',
        'Team collaboration',
        'Custom branding',
      ],
    },
  ];

  return (
    <section className="py-20 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Escolha seu plano
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-6">
            Comece grátis, upgrade quando precisar
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3">
            <span className={`text-sm font-medium ${!isYearly ? 'text-slate-900' : 'text-slate-500'}`}>
              Mensal
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`w-14 h-7 rounded-full relative transition-colors ${isYearly ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <div
                className={`w-5 h-5 rounded-full absolute top-1 transition-transform ${isYearly ? 'translate-x-7' : 'translate-x-1'}`}
              />
            </button>
            <span className={`text-sm font-medium ${isYearly ? 'text-slate-900' : 'text-slate-500'}`}>
              Anual
            </span>
            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
              20% OFF
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <PricingCard
              key={plan.name}
              {...plan}
              isYearly={isYearly}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
