import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' }, // Updated path
    { name: 'Live', path: '/live', icon: 'video_call' },
    { name: 'Práctica', path: '/prep-import', icon: 'videocam' },
    { name: 'Historial', path: '/history', icon: 'history' },
    { name: 'Ajustes', path: '/profile', icon: 'settings' },
  ];

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-gray-200 dark:border-border-dark bg-white dark:bg-[#111a22] fixed h-full z-20">
        <div className="p-6 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="size-8 text-primary">
              <span className="material-symbols-outlined text-3xl">psychology</span>
            </div>
            <h1 className="text-lg font-bold">InterviewCoach</h1>
          </Link>
        </div>

        <nav className="flex-1 px-4 flex flex-col gap-2 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${isActive
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-white'
                    : 'text-slate-500 dark:text-text-secondary hover:bg-gray-100 dark:hover:bg-[#1c2a38]'
                  }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-cover bg-center border border-border-dark" style={{ backgroundImage: 'url("https://picsum.photos/200")' }}></div>
            <div>
              <p className="text-sm font-bold">Alex User</p>
              <p className="text-xs text-text-secondary">Pro Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-50 bg-white dark:bg-[#111a22] border-b border-gray-200 dark:border-border-dark px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">psychology</span>
            <span className="font-bold">InterviewCoach</span>
          </Link>
          <button className="text-slate-500">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </header>

        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;