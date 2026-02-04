'use client';

import Link from 'next/link';
import { Menu, X, User } from 'lucide-react';
import { useState } from 'react';
import { useAuth, UserButton } from '@clerk/nextjs';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">ER</span>
            </div>
            <span className="font-bold text-xl text-slate-900">Easy Rek</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="text-slate-600 hover:text-indigo-600 transition-colors font-medium"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-slate-600 hover:text-indigo-600 transition-colors font-medium"
            >
              Preços
            </Link>
            <Link
              href="/demo"
              className="text-slate-600 hover:text-indigo-600 transition-colors font-medium"
            >
              Demo
            </Link>
            <Link
              href="/contact"
              className="text-slate-600 hover:text-indigo-600 transition-colors font-medium"
            >
              Contato
            </Link>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            {isLoaded && isSignedIn ? (
              <>
                <Link
                  href="/home"
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Dashboard
                </Link>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: {
                        width: 40,
                        height: 40,
                      },
                    },
                  }}
                  afterSignOutUrl="/"
                />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-slate-600 hover:text-indigo-600 transition-colors font-medium"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  Criar Conta
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-slate-700" />
            ) : (
              <Menu className="w-6 h-6 text-slate-700" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200">
            <nav className="flex flex-col gap-4">
              <Link
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-600 hover:text-indigo-600 transition-colors font-medium"
              >
                Features
              </Link>
              <Link
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-600 hover:text-indigo-600 transition-colors font-medium"
              >
                Preços
              </Link>
              <Link
                href="/demo"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-600 hover:text-indigo-600 transition-colors font-medium"
              >
                Demo
              </Link>
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-600 hover:text-indigo-600 transition-colors font-medium"
              >
                Contato
              </Link>
              <div className="flex flex-col gap-3 pt-4 border-t border-slate-200 mt-4">
                {isLoaded && isSignedIn ? (
                  <>
                    <Link
                      href="/home"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-center px-5 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Dashboard
                    </Link>
                    <div className="flex items-center justify-center">
                      <UserButton
                        appearance={{
                          elements: {
                            avatarBox: {
                              width: 40,
                              height: 40,
                            },
                          },
                        }}
                        afterSignOutUrl="/"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-center text-slate-600 hover:text-indigo-600 transition-colors font-medium"
                    >
                      Login
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-center px-5 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Criar Conta
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
