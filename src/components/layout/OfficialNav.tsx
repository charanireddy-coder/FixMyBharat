'use client';

import React, { useState } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Landmark,
  LayoutDashboard,
  FileSpreadsheet,
  Building2,
  User,
  LogOut,
  Menu,
  X,
  Shield,
  ShieldAlert,
  Map,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';

export const OfficialNav: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, profile, role, signOut } = useAuth();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Official';
  const isAdmin = role === 'admin';

  const navLinks = [
    { href: '/official', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/official/complaints', label: 'Complaints', icon: FileSpreadsheet },
    { href: '/official/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/official/map', label: 'Map', icon: Map },
    { href: '/official/departments', label: 'Departments', icon: Building2 },
    { href: '/official/profile', label: 'Profile', icon: User },
  ];

  return (
    <header className="sticky top-0 z-40 bg-navy-950/95 backdrop-blur-md border-b border-navy-800 text-white shadow-lg">
      <Container size="lg">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <NextLink href="/official" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-civic-500 via-sky-600 to-alert-500 flex items-center justify-center text-white shadow-md shadow-civic-500/20 group-hover:scale-105 transition-transform duration-200">
              <Landmark size={19} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold tracking-tight text-white leading-none">
                  FixMy<span className="text-alert-500">Bharat</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-navy-800 border border-navy-700 text-slate-300">
                  OPS
                </span>
              </div>
              <span className="text-[9px] font-semibold text-slate-400 tracking-wider uppercase mt-0.5">
                Civic Operations Desk
              </span>
            </div>
          </NextLink>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-4 text-sm font-medium">
            {navLinks.map((item) => {
              const isActive =
                item.href === '/official'
                  ? pathname === '/official'
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <NextLink
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors duration-150',
                    isActive
                      ? 'bg-navy-900 text-white font-semibold border border-navy-700 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-navy-900/60'
                  )}
                >
                  <Icon size={15} className={isActive ? 'text-alert-400' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </NextLink>
              );
            })}
          </nav>

          {/* Desktop User Status & Actions */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-lg bg-navy-900/80 border border-navy-800 text-xs">
              {isAdmin ? (
                <ShieldAlert size={14} className="text-amber-400" />
              ) : (
                <Shield size={14} className="text-sky-400" />
              )}
              <span className="font-medium text-slate-200 max-w-[130px] truncate">
                {displayName}
              </span>
              <Badge variant={isAdmin ? 'danger' : 'warning'} size="sm">
                {isAdmin ? 'Administrator' : 'Official'}
              </Badge>
            </div>

            <Button
              variant="outline-dark"
              size="sm"
              onClick={signOut}
              leftIcon={<LogOut size={14} />}
            >
              Sign Out
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
          <div className="flex items-center justify-between pb-3 border-b border-navy-800 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <User size={15} className="text-alert-400" />
              <span className="font-semibold text-white">{displayName}</span>
            </div>
            <Badge variant={isAdmin ? 'danger' : 'warning'} size="sm">
              {isAdmin ? 'Administrator' : 'Official'}
            </Badge>
          </div>

          {navLinks.map((item) => {
            const isActive =
              item.href === '/official'
                ? pathname === '/official'
                : pathname.startsWith(item.href);
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
                <Icon size={16} className={isActive ? 'text-alert-400' : 'text-slate-400'} />
                <span>{item.label}</span>
              </NextLink>
            );
          })}

          <div className="pt-3 border-t border-navy-800">
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
