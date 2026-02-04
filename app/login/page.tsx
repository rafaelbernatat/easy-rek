import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft, Lock, Shield, User } from 'lucide-react';

export default function SignInPage() {
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
              Bem-vindo de volta
            </h1>
            <p className="text-slate-600">
              Entre na sua conta para continuar criando vídeos
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-slate-200">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mb-2">
                <Lock className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                Seguro
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-slate-200">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                Fácil
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-slate-200">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                Protegido
              </p>
            </div>
          </div>

          {/* Clerk SignIn Component */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-1">
              <SignIn
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

            {/* Help Info */}
            <div className="bg-indigo-50 px-6 py-4 border-t border-indigo-100">
              <p className="text-sm text-slate-700 text-center">
                Esqueceu sua senha?{' '}
                <Link
                  href="/forgot-password"
                  className="text-indigo-600 font-medium hover:underline"
                >
                  Recuperar senha
                </Link>
              </p>
            </div>
          </div>

          {/* Signup Link */}
          <p className="text-center text-slate-600 mt-6">
            Ainda não tem uma conta?{' '}
            <Link href="/signup" className="text-indigo-600 font-medium hover:underline">
              Crie sua conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
