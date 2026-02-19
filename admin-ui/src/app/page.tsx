'use client';

import Link from 'next/link';
import { useState, ReactNode } from 'react';
import {
  SearchCode,
  Lightbulb,
  Zap,
  BarChart3,
  PlugZap,
  BrainCircuit,
  Rocket,
  ShoppingCart,
  Cloud,
  TrendingUp,
  FileText,
  Lock,
  ShieldCheck,
  ClipboardList,
  OctagonX,
  CheckCircle,
  RotateCcw,
  ArrowRight,
  Play,
  Check,
  Database,
} from 'lucide-react';

type GradientColor = 'blue' | 'violet' | 'amber' | 'emerald' | 'red';

const GRADIENT_MAP: Record<GradientColor, { box: string; shadow: string }> = {
  blue: {
    box: 'from-blue-500 to-cyan-500',
    shadow: 'shadow-blue-500/25',
  },
  violet: {
    box: 'from-violet-500 to-purple-500',
    shadow: 'shadow-violet-500/25',
  },
  amber: {
    box: 'from-amber-500 to-orange-500',
    shadow: 'shadow-amber-500/25',
  },
  emerald: {
    box: 'from-emerald-500 to-teal-500',
    shadow: 'shadow-emerald-500/25',
  },
  red: {
    box: 'from-red-500 to-rose-500',
    shadow: 'shadow-red-500/25',
  },
};

function GradientIcon({
  children,
  color,
  size = 'md',
}: {
  children: ReactNode;
  color: GradientColor;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { box, shadow } = GRADIENT_MAP[color];
  const sizeClasses = {
    sm: 'w-10 h-10 rounded-xl',
    md: 'w-14 h-14 rounded-2xl',
    lg: 'w-16 h-16 rounded-2xl',
  };

  return (
    <div
      className={`${sizeClasses[size]} bg-gradient-to-br ${box} flex items-center justify-center shadow-lg ${shadow}`}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: <SearchCode className="w-7 h-7 text-white" />,
      color: 'blue' as GradientColor,
      title: 'Automated Performance Analysis',
      description: 'AI-powered scanning detects slow queries, missing indexes, and performance bottlenecks automatically',
      details: [
        'Real-time query analysis',
        'Index optimization suggestions',
        'Performance schema insights',
        'Automated bottleneck detection',
      ],
    },
    {
      icon: <Lightbulb className="w-7 h-7 text-white" />,
      color: 'violet' as GradientColor,
      title: 'Smart Recommendations',
      description: 'Get actionable optimization recommendations with impact analysis and rollback plans',
      details: [
        'DDL generation with safety checks',
        'Impact estimation before execution',
        'Automatic rollback on failure',
        'Step-by-step execution plans',
      ],
    },
    {
      icon: <Zap className="w-7 h-7 text-white" />,
      color: 'amber' as GradientColor,
      title: 'One-Click Optimization',
      description: 'Apply optimizations safely with built-in verification and automatic rollback',
      details: [
        'Safe DDL execution',
        'Before/after metrics comparison',
        'Kill switch for emergency stop',
        'Comprehensive audit logs',
      ],
    },
    {
      icon: <BarChart3 className="w-7 h-7 text-white" />,
      color: 'emerald' as GradientColor,
      title: 'Detailed Reports',
      description: 'Export comprehensive reports in Markdown or JSON for documentation and analysis',
      details: [
        'Execution history tracking',
        'Performance metrics visualization',
        'Downloadable reports',
        'Timeline of all changes',
      ],
    },
  ];

  const stats = [
    { value: '10x', label: 'Faster Query Performance', icon: <Zap className="w-5 h-5" /> },
    { value: '95%', label: 'Automated Detection Rate', icon: <SearchCode className="w-5 h-5" /> },
    { value: '<1min', label: 'Average Scan Time', icon: <Database className="w-5 h-5" /> },
    { value: '100%', label: 'Safe Rollback', icon: <RotateCcw className="w-5 h-5" /> },
  ];

  const steps = [
    {
      step: '1',
      title: 'Connect Database',
      description: 'Add your MySQL connection details securely. We support SSL and encrypted credentials.',
      icon: <PlugZap className="w-8 h-8 text-white" />,
      color: 'blue' as GradientColor,
    },
    {
      step: '2',
      title: 'Run Analysis',
      description: 'Our AI agent scans your database, analyzes queries, and identifies optimization opportunities.',
      icon: <BrainCircuit className="w-8 h-8 text-white" />,
      color: 'violet' as GradientColor,
    },
    {
      step: '3',
      title: 'Apply & Monitor',
      description: 'Review recommendations, apply optimizations with one click, and monitor performance improvements.',
      icon: <Rocket className="w-8 h-8 text-white" />,
      color: 'emerald' as GradientColor,
    },
  ];

  const useCases = [
    {
      title: 'E-commerce Platforms',
      description: 'Optimize product catalogs, order processing, and customer data queries',
      icon: <ShoppingCart className="w-7 h-7 text-white" />,
      color: 'blue' as GradientColor,
    },
    {
      title: 'SaaS Applications',
      description: 'Scale database performance as your user base grows',
      icon: <Cloud className="w-7 h-7 text-white" />,
      color: 'violet' as GradientColor,
    },
    {
      title: 'Analytics Systems',
      description: 'Speed up complex aggregations and reporting queries',
      icon: <TrendingUp className="w-7 h-7 text-white" />,
      color: 'amber' as GradientColor,
    },
    {
      title: 'Content Management',
      description: 'Improve content delivery and search performance',
      icon: <FileText className="w-7 h-7 text-white" />,
      color: 'emerald' as GradientColor,
    },
  ];

  const securityItems = [
    {
      icon: <Lock className="w-6 h-6 text-white" />,
      color: 'blue' as GradientColor,
      title: 'Encrypted Credentials',
      description: 'All database credentials are encrypted using AES-256-GCM',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-white" />,
      color: 'emerald' as GradientColor,
      title: 'Safe Execution',
      description: 'Built-in safety checks and automatic rollback on failure',
    },
    {
      icon: <ClipboardList className="w-6 h-6 text-white" />,
      color: 'violet' as GradientColor,
      title: 'Complete Audit Logs',
      description: 'Track every change with detailed execution history',
    },
    {
      icon: <OctagonX className="w-6 h-6 text-white" />,
      color: 'red' as GradientColor,
      title: 'Kill Switch',
      description: 'Emergency stop button to halt all operations instantly',
    },
    {
      icon: <CheckCircle className="w-6 h-6 text-white" />,
      color: 'emerald' as GradientColor,
      title: 'Verification',
      description: 'Before/after metrics comparison to ensure improvements',
    },
    {
      icon: <RotateCcw className="w-6 h-6 text-white" />,
      color: 'amber' as GradientColor,
      title: 'Auto Rollback',
      description: 'Automatic rollback if performance degrades',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                MySQL Optimizer
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="px-4 py-2 text-slate-700 hover:text-blue-600 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg font-medium hover:shadow-lg hover:scale-105 transition-all"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span>AI-Powered Database Optimization</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 leading-tight">
              Optimize Your MySQL
              <span className="block bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                10x Faster
              </span>
            </h1>

            <p className="text-xl text-slate-600 mb-10 leading-relaxed">
              Automated performance analysis, intelligent recommendations, and safe execution.
              <br />
              No database expertise required.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/login"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all flex items-center space-x-2"
              >
                <span>Start Optimizing</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="px-8 py-4 bg-white text-slate-700 rounded-xl font-semibold text-lg border-2 border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all flex items-center space-x-2">
                <Play className="w-5 h-5" />
                <span>Watch Demo</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 text-center border border-slate-200 hover:shadow-lg transition-shadow">
                <div className="flex justify-center mb-3 text-blue-500">
                  {stat.icon}
                </div>
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Everything you need to optimize your MySQL database with confidence
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                onClick={() => setActiveFeature(idx)}
                className={`p-8 rounded-2xl border-2 cursor-pointer transition-all ${
                  activeFeature === idx
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-xl scale-105'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-lg'
                }`}
              >
                <div className="mb-5">
                  <GradientIcon color={feature.color} size="lg">
                    {feature.icon}
                  </GradientIcon>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.details.map((detail, detailIdx) => (
                    <li key={detailIdx} className="flex items-start space-x-2 text-sm text-slate-700">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-blue-200 max-w-2xl mx-auto">
              Simple 3-step process to optimize your database
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all">
                  <div className="mb-5">
                    <GradientIcon color={step.color} size="lg">
                      {step.icon}
                    </GradientIcon>
                  </div>
                  <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-2xl font-bold">
                    {step.step}
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                  <p className="text-blue-200">{step.description}</p>
                </div>
                {idx < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-8 h-8 text-cyan-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Perfect For Any Industry
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Trusted by companies across different sectors
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-6 border border-slate-200 hover:shadow-xl hover:scale-105 transition-all"
              >
                <div className="mb-4">
                  <GradientIcon color={useCase.color}>
                    {useCase.icon}
                  </GradientIcon>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{useCase.title}</h3>
                <p className="text-slate-600 text-sm">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Trust */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Enterprise-Grade Security
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Your data security is our top priority
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {securityItems.map((item, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
                <div className="mb-4">
                  <GradientIcon color={item.color} size="sm">
                    {item.icon}
                  </GradientIcon>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-cyan-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Optimize Your Database?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Start improving your MySQL performance today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="px-10 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all"
            >
              Get Started Free
            </Link>
            <button className="px-10 py-4 bg-transparent text-white rounded-xl font-bold text-lg border-2 border-white hover:bg-white hover:text-blue-600 transition-all">
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Database className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold">MySQL Optimizer</span>
              </div>
              <p className="text-sm">
                AI-powered database optimization platform for modern applications.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/login" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/login" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/login" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Terms</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm">
            <p>&copy; 2026 MySQL Optimizer. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
