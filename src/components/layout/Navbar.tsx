'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Landmark, Menu, X, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { useAuth } from '@/components/providers/AuthProvider';

export const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile, role } = useAuth();

  const dashboardHref = role === 'official' || role === 'admin' ? '/official' : '/citizen';
  const displayName = profile?.full_name ? profile.full_name.split(' ')[0] : 'Dashboard';

  return (
    <header className="sticky top-0 z-40 bg-navy-950/95 backdrop-blur-md border-b border-navy-800/80 text-white">
      <Container size="lg">
        <div className="flex items-center justify-between h-16">
          {/* Brand Identity */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-civic-500 to-alert-500 flex items-center justify-center text-white shadow-md shadow-civic-500/20 group-hover:scale-105 transition-transform duration-200">
              <Landmark size={19} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-white leading-none">
                FixMy<span className="text-alert-500">Bharat</span>
              </span>
              <span className="text-[9px] font-semibold text-slate-400 tracking-wider uppercase mt-0.5">
                Civic Intelligence Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <Link
              href="/"
              className="text-white hover:text-civic-400 transition-colors duration-150"
            >
              Home
            </Link>
            <a
              href="#how-it-works"
              className="hover:text-civic-400 transition-colors duration-150"
            >
              How It Works
            </a>
            <a
              href="#why-fixmybharat"
              className="hover:text-civic-400 transition-colors duration-150"
            >
              Why FixMyBharat
            </a>

            {user ? (
              <Link
                href={dashboardHref}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy-900 border border-navy-700 text-civic-300 hover:text-white hover:border-civic-500 transition-colors duration-150"
              >
                <User size={13} className="text-civic-400" />
                <span>{displayName}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="hover:text-civic-400 transition-colors duration-150"
              >
                Login
              </Link>
            )}
          </nav>

          {/* Desktop Action Button */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/report">
              <Button
                variant="accent"
                size="sm"
              >
                Report an Issue
              </Button>
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
            className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-navy-900 focus:outline-none focus:ring-2 focus:ring-civic-500"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </Container>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-navy-900 border-b border-navy-800 px-6 py-5 flex flex-col gap-3.5 animate-in slide-in-from-top-2 duration-200">
          <Link
            href="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-white font-medium text-base py-1"
          >
            Home
          </Link>
          <a
            href="#how-it-works"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-slate-300 font-medium text-base py-1 hover:text-white"
          >
            How It Works
          </a>
          <a
            href="#why-fixmybharat"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-slate-300 font-medium text-base py-1 hover:text-white"
          >
            Why FixMyBharat
          </a>

          {user ? (
            <Link
              href={dashboardHref}
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-civic-300 font-medium text-base py-1 hover:text-white flex items-center gap-2"
            >
              <User size={16} />
              <span>Dashboard ({displayName})</span>
            </Link>
          ) : (
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-slate-300 font-medium text-base py-1 hover:text-white"
            >
              Login
            </Link>
          )}

          <div className="pt-2 border-t border-navy-800">
            <Link href="/report" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="accent"
                className="w-full"
              >
                Report an Issue
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
