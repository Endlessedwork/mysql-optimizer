'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Database,
  Lightbulb,
  Play,
  ShieldOff,
  LogOut,
  ChevronLeft,
  User,
  Search,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Connections', href: '/admin/connections', icon: Database },
  { name: 'Scans', href: '/admin/scans', icon: Search },
  { name: 'Recommendations', href: '/admin/recommendations', icon: Lightbulb },
  { name: 'Executions', href: '/admin/executions', icon: Play },
  { name: 'Kill Switch', href: '/admin/kill-switch', icon: ShieldOff },
];

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth');
      localStorage.removeItem('user');
      document.cookie.split(';').forEach((c) => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });
    }
    router.push('/');
  };

  return (
    <aside
      className={`
        ${expanded ? 'w-56' : 'w-16'}
        bg-sidebar border-r border-default flex flex-col h-screen
        transition-all duration-200 ease-in-out
        ${className}
      `}
    >
      {/* Logo + Toggle */}
      <div className={`h-14 flex items-center border-b border-default ${expanded ? 'justify-between px-3' : 'justify-center'}`}>
        {expanded ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-slate-900 text-sm whitespace-nowrap">
                MySQL Optimizer
              </span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setExpanded(true)}
            className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white hover:bg-teal-700 transition-colors"
          >
            <Database className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.name} className="group relative">
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 h-10 rounded-lg
                    transition-colors
                    ${
                      active
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {expanded && (
                    <span className="text-sm font-medium whitespace-nowrap">
                      {item.name}
                    </span>
                  )}
                </Link>
                {/* Tooltip - only show when collapsed */}
                {!expanded && (
                  <span className="tooltip">{item.name}</span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className={`border-t border-default p-3 space-y-1 ${!expanded ? 'flex flex-col items-center' : ''}`}>
        {/* User Info */}
        <div
          className={`
            flex items-center rounded-lg
            ${expanded ? 'gap-3 px-3 py-2 bg-slate-50 w-full' : 'justify-center p-2'}
          `}
        >
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-slate-500" />
          </div>
          {expanded && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">Admin</p>
              <p className="text-xs text-slate-500 truncate">Administrator</p>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={`
            flex items-center rounded-lg
            text-slate-500 hover:text-red-600 hover:bg-red-50
            transition-colors
            ${expanded ? 'gap-3 w-full px-3 h-10' : 'justify-center w-10 h-10'}
          `}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {expanded && (
            <span className="text-sm font-medium">Logout</span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
