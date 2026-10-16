import React from 'react';
import Link from 'next/link';
import { Landmark, Shield } from 'lucide-react';
import { Container } from '@/components/ui/Container';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-navy-950 text-slate-400 border-t border-navy-900 mt-auto">
      <Container size="lg" className="py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-navy-900">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-civic-500 to-alert-500 flex items-center justify-center text-white shadow-md shadow-civic-500/20">
                <Landmark size={18} />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">
                FixMy<span className="text-alert-500">Bharat</span>
              </span>
            </div>
            <p className="text-sm font-semibold text-civic-400">
              Report. Resolve. Improve.
            </p>
            <p className="text-sm leading-relaxed text-slate-400 max-w-md">
              FixMyBharat connects citizens and civic teams through intelligent reporting, transparent tracking, and data-driven prioritization.
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 bg-navy-900 px-3 py-1.5 rounded-md border border-navy-800">
              <Shield size={13} className="text-alert-400" />
              <span>Built by Team SyncMates</span>
            </div>
          </div>

          {/* Platform Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <Link href="/report" className="hover:text-white transition-colors">
                  Report an Issue
                </Link>
              </li>
              <li>
                <Link href="/track" className="hover:text-white transition-colors">
                  Track My Report
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Civic Guidelines / Notice */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Civic Protocol
            </h4>
            <div className="p-3.5 rounded-lg bg-navy-900/80 border border-navy-800 text-xs text-slate-300 space-y-1.5">
              <span className="font-semibold text-alert-400 block">Emergency Services</span>
              <p className="text-slate-400 leading-relaxed">
                For life-threatening emergencies (Fire, Police, Medical), dial 112 immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 FixMyBharat. Built by Team SyncMates.</p>
          <div className="flex items-center gap-6">
            <span>Digital Public Infrastructure</span>
            <span>Citizen-First Redressal</span>
          </div>
        </div>
      </Container>
    </footer>
  );
};
