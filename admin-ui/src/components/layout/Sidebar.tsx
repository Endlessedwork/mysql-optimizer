import React from 'react';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const menuItems = [
    { name: 'Dashboard', href: '/admin' },
    { name: 'Connections', href: '/admin/connections' },
    { name: 'Recommendations', href: '/admin/recommendations' },
    { name: 'Executions', href: '/admin/executions' },
    { name: 'Kill Switch', href: '/admin/kill-switch' },
  ];

  return (
    <div className={`w-64 bg-white shadow-md ${className}`}>
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
      </div>
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            return (
              <li key={item.name}>
                <a
                  href={item.href}
                  className="flex items-center p-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="w-5 h-5 mr-3 bg-gray-300 rounded" />
                  {item.name}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="absolute bottom-0 w-64 p-4 border-t">
        <button className="flex items-center p-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
          <span className="w-5 h-5 mr-3 bg-gray-300 rounded" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;