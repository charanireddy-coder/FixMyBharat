'use client';

import React, { useState } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Landmark, PlusCircle, FileText, User, LogOut, Menu, X, LayoutDashboard, Map, Bell, Bot } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';

export const CitizenNav: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Citizen';

  const navLinks = [
    { href: '/citizen', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/citizen/report', label: 'Report an Issue', icon: PlusCircle },
    { href: '/citizen/reports', label: 'My Reports', icon: FileText },
    { href: '/citizen/assistant', label: 'Civic Assistant', icon: Bot },
    { href: '/citizen/notifications', label: 'Notifications', icon: Bell },
    { href: '/citizen/map', label: 'Map', icon: Map },
    { href: '/citizen/profile', label: 'Profile', icon: User },
  ];

  return (
    <header className="sticky top-0 z-40 bg-navy-950/95 backdrop-blur-md border-b border-navy-800 text-white">
      <Container size="lg">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <NextLink href="/citizen" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-civic-500 to-alert-500 flex items-center justify-center text-white shadow-md shadow-civic-500/20 group-hover:scale-105 transition-transform duration-200">
              <Landmark size={19} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-white leading-none">
                FixMy<span className="text-alert-500">Bharat</span>
              </span>
              <span className="text-[9px] font-semibold text-slate-400 tracking-wider uppercase mt-0.5">
                Citizen Portal
              </span>
            </div>
          </NextLink>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <NextLink
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors duration-150',
                    isActive
                      ? 'bg-navy-900 text-white font-semibold border border-navy-700'
                      : 'text-slate-300 hover:text-white hover:bg-navy-900/60'
                  )}
                >
                  <Icon size={15} className={isActive ? 'text-civic-400' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </NextLink>
              );
            })}
          </nav>

          {/* Desktop User Menu & Actions */}
          <div className="hidden md:flex items-center gap-3">
            <NextLink href="/citizen/report">
              <Button variant="accent" size="sm" leftIcon={<PlusCircle size={15} />}>
                Report Issue
              </Button>
            </NextLink>

            <Button
              variant="outline-dark"
              size="sm"
              onClick={signOut}
              leftIcon={<LogOut size={14} />}
            >
              Logout
            </Button>
          </div>

          {/* Mobile Menu Button */}
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

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-navy-900 border-b border-navy-800 px-6 py-5 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="pb-2 border-b border-navy-800 text-xs text-slate-400">
            Signed in as <strong className="text-white">{displayName}</strong>
          </div>

          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <NextLink
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-navy-800 text-white font-semibold'
                    : 'text-slate-300 hover:text-white'
                )}
              >
                <Icon size={16} className={isActive ? 'text-civic-400' : 'text-slate-400'} />
                <span>{item.label}</span>
              </NextLink>
            );
          })}

          <div className="pt-3 border-t border-navy-800 flex flex-col gap-2">
            <NextLink href="/citizen/report" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="accent" className="w-full" leftIcon={<PlusCircle size={16} />}>
                Report an Issue
              </Button>
            </NextLink>
            <Button
              variant="outline-dark"
              className="w-full"
              onClick={signOut}
              leftIcon={<LogOut size={16} />}
            >
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};
