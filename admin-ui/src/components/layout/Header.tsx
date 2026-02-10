'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  className?: string;
}

const routeNames: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/connections': 'Connections',
  '/admin/recommendations': 'Recommendations',
  '/admin/executions': 'Executions',
  '/admin/kill-switch': 'Kill Switch',
};

const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  const pathname = usePathname();

  // Generate breadcrumbs from pathname
  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs: { name: string; href: string }[] = [];

    // Always start with Dashboard
    breadcrumbs.push({ name: 'Dashboard', href: '/admin' });

    if (paths.length > 1) {
      // Build path progressively
      let currentPath = '/admin';
      for (let i = 1; i < paths.length; i++) {
        currentPath += '/' + paths[i];
        const name = routeNames[currentPath] || paths[i].charAt(0).toUpperCase() + paths[i].slice(1);

        // Check if it's a detail page (UUID or ID)
        if (paths[i].match(/^[0-9a-f-]+$/i) && paths[i].length > 10) {
          breadcrumbs.push({ name: 'Detail', href: currentPath });
        } else {
          breadcrumbs.push({ name, href: currentPath });
        }
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className={`h-14 bg-card border-b border-default ${className}`}>
      <div className="h-full flex items-center px-6">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.href}>
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-slate-300" />
              )}
              {index === breadcrumbs.length - 1 ? (
                <span className="font-medium text-slate-900">{crumb.name}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-slate-500 hover:text-teal-600 transition-colors"
                >
                  {crumb.name}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>

      </div>
    </header>
  );
};

export default Header;
