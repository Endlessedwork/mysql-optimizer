import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import KillSwitchBanner from './KillSwitchBanner';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-page">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <KillSwitchBanner />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
