import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft, Check, Shield, Zap } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header with back link */}
      <div className="p-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar para Home
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Crie sua conta grátis
            </h1>
            <p className="text-slate-600">
              Comece a criar vídeos profissionais em segundos
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-slate-200">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mb-2">
                <Zap className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                Setup rápido
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-slate-200">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                Sem cartão
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-slate-200">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                7 dias grátis
              </p>
            </div>
          </div>

          {/* Clerk SignUp Component */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-1">
              <SignUp
                routing="hash"
                appearance={{
                  elements: {
                    rootBox: {
                      boxShadow: 'none',
                      border: 'none',
                    },
                    card: {
                      boxShadow: 'none',
                      border: 'none',
                    },
                  },
                }}
                redirectUrl="/"
              />
            </div>

            {/* Trial Info */}
            <div className="bg-indigo-50 px-6 py-4 border-t border-indigo-100">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white font-bold text-sm">7</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 mb-1">
                    Período de teste gratuito
                  </p>
                  <p className="text-xs text-slate-600">
                    Experimente todas as funcionalidades do plano Pro por 7 dias, sem compromisso.
                  </p>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
              <p className="text-xs text-slate-600 text-center">
                Ao criar uma conta, você concorda com nossos{' '}
                <Link href="/terms" className="text-indigo-600 hover:underline">
                  Termos de Uso
                </Link>
                {' '}e{' '}
                <Link href="/privacy" className="text-indigo-600 hover:underline">
                  Política de Privacidade
                </Link>
                .
              </p>
            </div>
          </div>

          {/* Login Link */}
          <p className="text-center text-slate-600 mt-6">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-indigo-600 font-medium hover:underline">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
