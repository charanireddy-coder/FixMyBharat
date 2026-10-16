import React from 'react';
import Link from 'next/link';
import {
  MapPin,
  ArrowRight,
  Building2,
  Cpu,
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Droplets,
  Waves,
  Lightbulb,
  Footprints,
  AlertOctagon,
  HelpCircle,
  Eye,
  Zap,
  Users,
  BarChart3,
  Check,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { Badge } from '@/components/ui/Badge';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* 1. NAVBAR */}
      <Navbar />

      <main className="flex-1">
        {/* 2. HERO SECTION */}
        <section className="relative bg-navy-950 text-white overflow-hidden py-16 sm:py-24 lg:py-28 border-b border-navy-800">
          {/* Subtle Ambient Radial Lighting */}
          <div
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage:
                'radial-gradient(circle at 75% 25%, #0EA5E9 0%, #F97316 20%, transparent 60%)',
            }}
          />
          <div
            className="absolute -top-40 -left-40 w-96 h-96 bg-civic-500/10 rounded-full blur-3xl pointer-events-none"
          />

          <Container size="lg" className="relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Messaging & CTAs */}
              <div className="lg:col-span-7 space-y-6 text-left">
                {/* Brand / Initiative Eyebrow */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-navy-900 border border-navy-800 text-xs font-semibold text-civic-400">
                  <span className="w-2 h-2 rounded-full bg-alert-500 animate-pulse" />
                  <span>FixMyBharat • Civic Intelligence Platform</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                  Your City.<br />
                  Your Voice.<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-civic-400 to-alert-500">
                    Your Fix.
                  </span>
                </h1>

                {/* Supporting Text */}
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                  Report civic problems in seconds. FixMyBharat helps organize, understand and prioritize issues so the right teams can act faster.
                </p>

                {/* Action CTAs */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                  <Link href="/report">
                    <Button
                      variant="accent"
                      size="lg"
                      className="w-full sm:w-auto"
                      rightIcon={<ArrowRight size={18} />}
                    >
                      Report an Issue
                    </Button>
                  </Link>
                  <Link href="/track">
                    <Button
                      variant="outline-dark"
                      size="lg"
                      className="w-full sm:w-auto"
                    >
                      Track My Report
                    </Button>
                  </Link>
                </div>

                {/* Tagline micro-note */}
                <p className="text-xs text-slate-400 font-medium">
                  Turn everyday civic problems into actionable solutions.
                </p>
              </div>

              {/* Right Column: Visual Civic Intelligence Panel (Product Concept Illustration) */}
              <div className="lg:col-span-5">
                <div className="bg-navy-900/90 rounded-2xl border border-navy-800 p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
                  {/* Subtle Label */}
                  <div className="flex items-center justify-between pb-4 border-b border-navy-800 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-civic-400" />
                      <span className="text-xs font-bold tracking-wider uppercase text-civic-300">
                        Civic Intelligence
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded bg-navy-950 border border-navy-800 text-slate-400">
                      Product Concept
                    </span>
                  </div>

                  {/* Conceptual City Map Grid Representation */}
                  <div className="relative rounded-xl bg-navy-950 border border-navy-850 p-4 overflow-hidden min-h-[220px]">
                    {/* Simulated Map Grid lines */}
                    <div
                      className="absolute inset-0 opacity-15"
                      style={{
                        backgroundImage:
                          'linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(to right, #38bdf8 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                      }}
                    />

                    {/* Ward Boundaries / Road Network accents */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-civic-500/20" />
                    <div className="absolute top-0 bottom-0 left-2/5 w-0.5 bg-civic-500/20" />
                    <div className="absolute -rotate-45 top-0 bottom-0 left-1/2 w-0.5 bg-alert-500/20" />

                    {/* Issue Marker Pins on Conceptual Map */}
                    <div className="absolute top-8 left-10 flex items-center gap-1.5">
                      <div className="relative flex items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-alert-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-alert-500" />
                      </div>
                      <span className="text-[10px] font-medium bg-navy-900/90 text-slate-300 px-1.5 py-0.5 rounded border border-navy-800">
                        Ward 42 • Pothole
                      </span>
                    </div>

                    <div className="absolute bottom-10 right-8 flex items-center gap-1.5">
                      <div className="relative flex items-center justify-center">
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-civic-400" />
                      </div>
                      <span className="text-[10px] font-medium bg-navy-900/90 text-slate-300 px-1.5 py-0.5 rounded border border-navy-800">
                        Ward 18 • Water Line
                      </span>
                    </div>

                    {/* Overlay Incident Card */}
                    <div className="relative mt-16 bg-navy-900/95 border border-navy-700/80 rounded-xl p-3.5 shadow-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-alert-500" />
                          <span className="text-xs font-semibold text-white">
                            Subsurface Road Collapse
                          </span>
                        </div>
                        <SeverityBadge severity="high" />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-civic-400" />
                          Main Arterial Cross Rd
                        </span>
                        <StatusBadge status="under_review" />
                      </div>
                    </div>
                  </div>

                  {/* AI-Assisted Analysis Indicator Box */}
                  <div className="mt-4 p-3 rounded-xl bg-navy-950 border border-navy-800 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-civic-500/20 text-civic-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={14} />
                    </div>
                    <div className="text-left space-y-0.5">
                      <div className="text-xs font-bold text-slate-200">
                        AI-Assisted Triage Analysis
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Automated severity assessment, geographic clustering, and routing recommendation to Road Works Wing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* 3. TRUST / VALUE STRIP */}
        <section className="bg-white border-b border-slate-200 py-6 sm:py-8 shadow-sm">
          <Container size="lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Value 1: Citizen-first */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-civic-50 text-civic-600 flex items-center justify-center shrink-0 border border-civic-100">
                  <Users size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-navy-950">Citizen-first</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Designed for residents to report civic problems quickly with simple, intuitive mobile and web flows.
                  </p>
                </div>
              </div>

              {/* Value 2: Transparent */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
                  <Eye size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-navy-950">Transparent</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Clear lifecycle tracking from submission to official review, department dispatch, and resolution.
                  </p>
                </div>
              </div>

              {/* Value 3: Action-oriented */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-alert-50 text-alert-600 flex items-center justify-center shrink-0 border border-alert-100">
                  <Zap size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-navy-950">Action-oriented</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Structured issue details and severity ranking empower municipal teams to take targeted field action.
                  </p>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* 4. HOW IT WORKS */}
        <section id="how-it-works" className="py-16 sm:py-24 bg-slate-50">
          <Container size="lg">
            <div className="max-w-2xl mx-auto text-center mb-12 sm:mb-16 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-civic-600">
                End-to-End Civic Process
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-950 tracking-tight">
                How FixMyBharat Works
              </h2>
              <p className="text-base text-slate-600">
                From a simple report to a structured civic action.
              </p>
            </div>

            {/* 5 Connected Steps: Desktop Horizontal / Mobile Vertical Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
              {/* Step 1: REPORT */}
              <div className="relative flex flex-col bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1 duration-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold text-alert-600 font-mono tracking-wider">
                    01
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-alert-50 text-alert-600 flex items-center justify-center">
                    <MapPin size={16} />
                  </div>
                </div>
                <h3 className="text-base font-bold text-navy-950 mb-1">REPORT</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-auto">
                  Tell us what needs attention.
                </p>
              </div>

              {/* Step 2: UNDERSTAND */}
              <div className="relative flex flex-col bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1 duration-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold text-civic-600 font-mono tracking-wider">
                    02
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-civic-50 text-civic-600 flex items-center justify-center">
                    <Cpu size={16} />
                  </div>
                </div>
                <h3 className="text-base font-bold text-navy-950 mb-1">UNDERSTAND</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-auto">
                  Organize the issue with structured information and AI-assisted analysis.
                </p>
              </div>

              {/* Step 3: PRIORITIZE */}
              <div className="relative flex flex-col bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1 duration-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold text-alert-600 font-mono tracking-wider">
                    03
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-alert-50 text-alert-600 flex items-center justify-center">
                    <AlertTriangle size={16} />
                  </div>
                </div>
                <h3 className="text-base font-bold text-navy-950 mb-1">PRIORITIZE</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-auto">
                  Surface issues based on severity, urgency and context.
                </p>
              </div>

              {/* Step 4: RESOLVE */}
              <div className="relative flex flex-col bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1 duration-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold text-emerald-600 font-mono tracking-wider">
                    04
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Building2 size={16} />
                  </div>
                </div>
                <h3 className="text-base font-bold text-navy-950 mb-1">RESOLVE</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-auto">
                  Help civic teams assign, track and update the work.
                </p>
              </div>

              {/* Step 5: PREVENT */}
              <div className="relative flex flex-col bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1 duration-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold text-indigo-600 font-mono tracking-wider">
                    05
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <BarChart3 size={16} />
                  </div>
                </div>
                <h3 className="text-base font-bold text-navy-950 mb-1">PREVENT</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-auto">
                  Use civic patterns and insights to identify recurring problems.
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* 5. CIVIC PROBLEMS */}
        <section className="py-16 sm:py-24 bg-white border-t border-slate-200">
          <Container size="lg">
            <div className="max-w-2xl mx-auto text-center mb-12 sm:mb-16 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-civic-600">
                Comprehensive Intake
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-950 tracking-tight">
                What can you report?
              </h2>
              <p className="text-base text-slate-600">
                Report community infrastructure challenges with structured detail so they reach the right department.
              </p>
            </div>

            {/* 8 Polished Category Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* 1. Potholes */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-civic-300 hover:shadow-md transition-all duration-200 flex flex-col">
                <div className="w-11 h-11 rounded-lg bg-alert-100 text-alert-700 flex items-center justify-center mb-4">
                  <AlertTriangle size={22} />
                </div>
                <h3 className="text-base font-bold text-navy-950 mb-1">Potholes</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Damaged roads and unsafe surfaces.
                </p>
              </div>

              {/* 2. Garbage */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-civic-300 hover:shadow-md transition-all duration-200 flex flex-col">
                <div className="w-11 h-11 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                  <Trash2 size={22} />
                </div>
                <h3 className="text-base font-bold text-navy-950 mb-1">Garbage</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Overflowing bins and unmanaged waste.
                </p>
              </div>

              {/* 3. Water Leakage */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-civic-300 hover:shadow-md transition-all duration-200 flex flex-col">
                <div className="w-11 h-11 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center mb-4">
                  <Droplets size={22} />
                </div>
                <h3 className="text-base font-bold text-navy-950 mb-1">Water Leakage</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Leaks, pipeline problems and water wastage.
                </p>
              </div>

              {/* 4. Drainage */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-civic-300 hover:shadow-md transition-all duration-200 flex flex-col">
                <div className="w-11 h-11 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center mb-4">
                  <Waves size={22} />
                </div>
                <h3 className="text-base font-bold text-navy-950 mb-1">Drainage</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Blocked drains, overflow, and waterlogging.
                </p>
              </div>

              {/* 5. Streetlights */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-civic-300 hover:shadow-md transition-all duration-200 flex flex-col">
                <div className="w-11 h-11 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center mb-4">
                  <Lightbulb size={22} />
                </div>
                <h3 className="text-base font-bold text-navy-950 mb-1">Streetlights</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Non-functional or flickering public lighting.
                </p>
              </div>

              {/* 6. Footpaths */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-civic-300 hover:shadow-md transition-all duration-200 flex flex-col">
                <div className="w-11 h-11 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
                  <Footprints size={22} />
                </div>
                <h3 className="text-base font-bold text-navy-950 mb-1">Footpaths</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Broken pathways, encroachments, and walking hazards.
                </p>
              </div>

              {/* 7. Open Manholes */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-civic-300 hover:shadow-md transition-all duration-200 flex flex-col">
                <div className="w-11 h-11 rounded-lg bg-red-100 text-red-700 flex items-center justify-center mb-4">
                  <AlertOctagon size={22} />
                </div>
                <h3 className="text-base font-bold text-navy-950 mb-1">Open Manholes</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Uncovered or broken manhole chambers posing fall risks.
                </p>
              </div>

              {/* 8. Other */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-civic-300 hover:shadow-md transition-all duration-200 flex flex-col">
                <div className="w-11 h-11 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center mb-4">
                  <HelpCircle size={22} />
                </div>
                <h3 className="text-base font-bold text-navy-950 mb-1">Other</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  General public infrastructure and civic safety hazards.
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* 6. WHY FIXMYBHARAT */}
        <section id="why-fixmybharat" className="py-16 sm:py-24 bg-slate-50 border-t border-slate-200">
          <Container size="lg">
            <div className="max-w-2xl mx-auto text-center mb-12 sm:mb-16 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-civic-600">
                Operational Advantage
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-950 tracking-tight">
                More than a complaint box.
              </h2>
              <p className="text-base text-slate-600">
                FixMyBharat turns disorganized complaints into structured, actionable civic workflows.
              </p>
            </div>

            {/* Two-Column Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left Column: Visual representation of a civic report moving through the system */}
              <div className="lg:col-span-5 bg-navy-950 rounded-2xl p-6 text-white border border-navy-800 shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-navy-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-civic-400">
                    Report Lifecycle Flow
                  </span>
                  <Badge variant="default" size="sm">
                    Structured Pipeline
                  </Badge>
                </div>

                <div className="space-y-4">
                  {/* Step A: Intake */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-civic-500/20 text-civic-400 border border-civic-500/40 flex items-center justify-center shrink-0 text-xs font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Citizen Intake</h4>
                      <p className="text-[11px] text-slate-400">Photo evidence and precise geo-coordinates captured.</p>
                    </div>
                  </div>

                  {/* Connector Line */}
                  <div className="w-0.5 h-3 bg-navy-800 ml-3.5" />

                  {/* Step B: Analysis */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-alert-500/20 text-alert-400 border border-alert-500/40 flex items-center justify-center shrink-0 text-xs font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">AI-Assisted Analysis</h4>
                      <p className="text-[11px] text-slate-400">Contextual category detection, risk level assessment, and duplicate checks.</p>
                    </div>
                  </div>

                  {/* Connector Line */}
                  <div className="w-0.5 h-3 bg-navy-800 ml-3.5" />

                  {/* Step C: Department Dispatch */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center shrink-0 text-xs font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Department Routing</h4>
                      <p className="text-[11px] text-slate-400">Directly assigned to the responsible zonal engineer and field team.</p>
                    </div>
                  </div>

                  {/* Connector Line */}
                  <div className="w-0.5 h-3 bg-navy-800 ml-3.5" />

                  {/* Step D: Resolution */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 text-xs font-bold">
                      4
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Verified Resolution</h4>
                      <p className="text-[11px] text-slate-400">Work completed on-site with photographic validation and citizen notice.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Platform benefits */}
              <div className="lg:col-span-7 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Benefit 1 */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200">
                    <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2 mb-1.5">
                      <CheckCircle2 size={16} className="text-civic-500 shrink-0" />
                      Structured reporting
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Replaces vague text with guided categorization, photo attachments, and precise GPS markers.
                    </p>
                  </div>

                  {/* Benefit 2 */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200">
                    <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2 mb-1.5">
                      <Cpu size={16} className="text-alert-500 shrink-0" />
                      AI-assisted understanding
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Assists intake by evaluating hazard severity, grouping duplicate reports, and suggesting departments.
                    </p>
                  </div>

                  {/* Benefit 3 */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200">
                    <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2 mb-1.5">
                      <AlertTriangle size={16} className="text-alert-600 shrink-0" />
                      Priority-driven workflows
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Surfaces critical public safety risks ahead of cosmetic issues for fair, impactful allocation.
                    </p>
                  </div>

                  {/* Benefit 4 */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200">
                    <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2 mb-1.5">
                      <Clock size={16} className="text-civic-600 shrink-0" />
                      Transparent status tracking
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Provides clear step-by-step progress tracking so residents always know where their report stands.
                    </p>
                  </div>

                  {/* Benefit 5 */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200">
                    <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2 mb-1.5">
                      <Building2 size={16} className="text-emerald-600 shrink-0" />
                      Department coordination
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Connects roads, sanitation, water, and electrical boards on a unified civic workflow.
                    </p>
                  </div>

                  {/* Benefit 6 */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200">
                    <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2 mb-1.5">
                      <BarChart3 size={16} className="text-indigo-600 shrink-0" />
                      Civic intelligence
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Reveals recurring geographic patterns and systemic bottlenecks to support long-term urban planning.
                    </p>
                  </div>
                </div>

                {/* Explicit Guidance Note */}
                <div className="p-3.5 rounded-lg bg-civic-50 border border-civic-200/80 flex items-start gap-2.5 text-xs text-civic-900">
                  <Sparkles size={16} className="text-civic-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong className="font-semibold text-civic-950">Responsible AI Notice:</strong> AI-assisted features are designed to support human decision-making. Municipal officials retain full authority and verification oversight on every action.
                  </p>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* 7. CITIZEN EXPERIENCE */}
        <section className="py-16 sm:py-24 bg-white border-t border-slate-200">
          <Container size="lg">
            <div className="max-w-2xl mx-auto text-center mb-12 sm:mb-16 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-civic-600">
                User Experience
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-950 tracking-tight">
                Citizen Tracking Preview
              </h2>
              <p className="text-base text-slate-600">
                How residents monitor their reported civic issues from first submission to resolution.
              </p>
            </div>

            {/* Conceptual Dashboard / Report Card */}
            <div className="max-w-2xl mx-auto">
              <Card className="border-slate-300 shadow-lg overflow-hidden">
                {/* Header with clear conceptual label */}
                <CardHeader className="bg-slate-50 border-b border-slate-200 py-3.5 px-6 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-civic-500" />
                    <span className="text-xs font-bold text-navy-950 uppercase tracking-wider">
                      Example citizen experience
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                    UI Preview • Not real complaint data
                  </span>
                </CardHeader>

                <CardBody className="p-6 sm:p-8 space-y-6">
                  {/* Complaint Details Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono font-semibold text-slate-500">
                          REP-2026-0418
                        </span>
                        <SeverityBadge severity="high" />
                      </div>
                      <h3 className="text-xl font-bold text-navy-950">
                        Large pothole near main road
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <MapPin size={13} className="text-civic-600" />
                        <span>Outer Ring Road, Ward 84 • Bengaluru</span>
                      </p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1">
                      <span className="text-xs text-slate-500 font-medium">Category</span>
                      <Badge variant="info" size="sm">
                        Pothole
                      </Badge>
                    </div>
                  </div>

                  {/* Simple Status Timeline:
                      Submitted ↓ Under Review ↓ Assigned ↓ In Progress ↓ Resolved */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
                        Resolution Progress Timeline
                      </h4>
                      <StatusBadge status="in_progress" />
                    </div>

                    {/* Desktop Horizontal / Mobile Vertical Timeline representation */}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
                      {/* 1. Submitted (Completed) */}
                      <div className="flex sm:flex-col items-center gap-2.5 sm:gap-2 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-left sm:text-center">
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0">
                          <Check size={14} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-navy-950">Submitted</div>
                          <div className="text-[10px] text-slate-500">Received</div>
                        </div>
                      </div>

                      {/* 2. Under Review (Completed) */}
                      <div className="flex sm:flex-col items-center gap-2.5 sm:gap-2 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-left sm:text-center">
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0">
                          <Check size={14} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-navy-950">Under Review</div>
                          <div className="text-[10px] text-slate-500">Categorized</div>
                        </div>
                      </div>

                      {/* 3. Assigned (Completed) */}
                      <div className="flex sm:flex-col items-center gap-2.5 sm:gap-2 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-left sm:text-center">
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0">
                          <Check size={14} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-navy-950">Assigned</div>
                          <div className="text-[10px] text-slate-500">Roads Wing</div>
                        </div>
                      </div>

                      {/* 4. In Progress (Active) */}
                      <div className="flex sm:flex-col items-center gap-2.5 sm:gap-2 p-2.5 rounded-lg bg-alert-50 border-2 border-alert-400 text-left sm:text-center shadow-xs">
                        <div className="w-6 h-6 rounded-full bg-alert-500 text-white flex items-center justify-center text-xs font-bold shrink-0 animate-pulse">
                          4
                        </div>
                        <div>
                          <div className="text-xs font-bold text-alert-950">In Progress</div>
                          <div className="text-[10px] text-alert-700 font-medium">Field Crew On-Site</div>
                        </div>
                      </div>

                      {/* 5. Resolved (Pending) */}
                      <div className="flex sm:flex-col items-center gap-2.5 sm:gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-left sm:text-center opacity-70">
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                          5
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-700">Resolved</div>
                          <div className="text-[10px] text-slate-500">Verification</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ground Crew Update Snippet */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="text-alert-600" />
                      Field repair crew dispatched with asphalt patch vehicle
                    </span>
                    <span className="font-semibold text-navy-950">Estimated SLA: 24h</span>
                  </div>
                </CardBody>
              </Card>
            </div>
          </Container>
        </section>

        {/* 8. MUNICIPAL INTELLIGENCE */}
        <section className="py-16 sm:py-24 bg-navy-950 text-white border-t border-navy-800">
          <Container size="lg">
            <div className="max-w-2xl mx-auto text-center mb-12 sm:mb-16 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-civic-400">
                Civic Authority Hub
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                From scattered complaints to actionable intelligence.
              </h2>
              <p className="text-base text-slate-300">
                Civic teams gain a synchronized operational view to evaluate, dispatch, and track community repairs systematically.
              </p>
            </div>

            {/* Civic Capabilities Overview */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-12">
              <div className="p-3.5 rounded-xl bg-navy-900 border border-navy-800 text-center">
                <Search size={18} className="text-civic-400 mx-auto mb-1.5" />
                <span className="text-xs font-bold text-slate-200 block">View Incoming Reports</span>
              </div>
              <div className="p-3.5 rounded-xl bg-navy-900 border border-navy-800 text-center">
                <AlertTriangle size={18} className="text-alert-400 mx-auto mb-1.5" />
                <span className="text-xs font-bold text-slate-200 block">Prioritize High-Impact</span>
              </div>
              <div className="p-3.5 rounded-xl bg-navy-900 border border-navy-800 text-center">
                <Building2 size={18} className="text-emerald-400 mx-auto mb-1.5" />
                <span className="text-xs font-bold text-slate-200 block">Assign Departments</span>
              </div>
              <div className="p-3.5 rounded-xl bg-navy-900 border border-navy-800 text-center">
                <Clock size={18} className="text-civic-400 mx-auto mb-1.5" />
                <span className="text-xs font-bold text-slate-200 block">Track Progress</span>
              </div>
              <div className="p-3.5 rounded-xl bg-navy-900 border border-navy-800 text-center">
                <BarChart3 size={18} className="text-indigo-400 mx-auto mb-1.5" />
                <span className="text-xs font-bold text-slate-200 block">Analyze Recurring</span>
              </div>
              <div className="p-3.5 rounded-xl bg-navy-900 border border-navy-800 text-center">
                <Layers size={18} className="text-amber-400 mx-auto mb-1.5" />
                <span className="text-xs font-bold text-slate-200 block">Understand Patterns</span>
              </div>
            </div>

            {/* Conceptual Municipal Dashboard Preview (No Fake Numbers) */}
            <div className="bg-navy-900 rounded-2xl border border-navy-800 p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-navy-800 gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-alert-500" />
                  <span className="text-sm font-extrabold uppercase tracking-wider text-white">
                    Municipal Operations Center
                  </span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-navy-950 border border-navy-800 text-slate-400">
                  Dashboard preview
                </span>
              </div>

              {/* 4 Preview Cards: Reports, Priority Queue, Departments, Resolution Tracking */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Reports */}
                <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-civic-400 font-bold uppercase tracking-wider">
                    <span>Reports</span>
                    <Filter size={14} />
                  </div>
                  <h4 className="text-sm font-bold text-white">Incoming Stream</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Centralized intake queue indexed by timestamp, ward location, and photo verification status.
                  </p>
                  <div className="pt-1 flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-civic-400" />
                    Structured Verification
                  </div>
                </div>

                {/* 2. Priority Queue */}
                <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-alert-400 font-bold uppercase tracking-wider">
                    <span>Priority Queue</span>
                    <AlertTriangle size={14} />
                  </div>
                  <h4 className="text-sm font-bold text-white">Severity Triage</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Automated scoring surfaces life-safety hazards, open manholes, and critical road collapses first.
                  </p>
                  <div className="pt-1 flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-alert-400" />
                    Hazard SLA Alignment
                  </div>
                </div>

                {/* 3. Departments */}
                <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-bold uppercase tracking-wider">
                    <span>Departments</span>
                    <Building2 size={14} />
                  </div>
                  <h4 className="text-sm font-bold text-white">Zonal Dispatch</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Automated routing to designated wings: Roads, Solid Waste, Drainage, and Public Lighting.
                  </p>
                  <div className="pt-1 flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Jurisdictional Routing
                  </div>
                </div>

                {/* 4. Resolution Tracking */}
                <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-indigo-400 font-bold uppercase tracking-wider">
                    <span>Resolution Tracking</span>
                    <Clock size={14} />
                  </div>
                  <h4 className="text-sm font-bold text-white">Lifecycle Audit</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Real-time field logs, on-site photo proofs, and closure sign-offs visible to both officials and citizens.
                  </p>
                  <div className="pt-1 flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    Photo Proof Verification
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* 9. FINAL CTA */}
        <section className="py-20 sm:py-24 bg-gradient-to-b from-white to-slate-100 border-t border-slate-200">
          <Container size="md">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-alert-50 border border-alert-200 text-xs font-bold text-alert-700">
                <Sparkles size={13} className="text-alert-600" />
                <span>Join the Civic Improvement Mission</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy-950 tracking-tight leading-tight">
                See a problem?<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-alert-500 to-civic-500">
                  Help fix it.
                </span>
              </h2>

              <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
                Your report can be the first step toward a better, safer and more responsive city.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <Link href="/report" className="w-full sm:w-auto">
                  <Button
                    variant="accent"
                    size="lg"
                    className="w-full sm:w-auto px-8"
                    rightIcon={<ArrowRight size={18} />}
                  >
                    Report an Issue
                  </Button>
                </Link>
                <a href="#how-it-works" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto bg-white hover:bg-slate-50 text-navy-950 border-slate-300 shadow-xs px-8"
                  >
                    Explore the Platform
                  </Button>
                </a>
              </div>
            </div>
          </Container>
        </section>
      </main>

      {/* 10. FOOTER */}
      <Footer />
    </div>
  );
}
