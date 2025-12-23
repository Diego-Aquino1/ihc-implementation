import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui";

interface LayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  {
    path: "/",
    label: "Inicio",
    icon: "🏠",
  },
  {
    path: "/practicar/preguntas-frecuentes",
    label: "Preguntas frecuentes",
    icon: "📋",
    disabled: true,
  },
  {
    path: "/practicar/preguntas-rebuscadas",
    label: "Preguntas rebuscadas",
    icon: "💭",
    disabled: true,
  },
  {
    path: "/practicar/en-frio",
    label: "En frío",
    icon: "❄️",
    disabled: true,
  },
  {
    path: "/practicar/experiencia",
    label: "Describir experiencia",
    icon: "💼",
  },
  {
    path: "/repasar",
    label: "Repasar (mi guión)",
    icon: "📝",
    disabled: true,
  },
  {
    path: "/historial",
    label: "Historial",
    icon: "🕐",
    disabled: true,
  },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-lg">
              🎯
            </div>
            <div>
              <h1 className="text-lg font-bold text-neutral-900">Practicar entrevista</h1>
              <p className="text-xs text-neutral-500">Entrenamiento de entrevistas laborales</p>
            </div>
          </div>
          <Link to="/perfil">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <span>👤</span>
              <span className="hidden sm:inline">Perfil</span>
            </Button>
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        {/* Sidebar Navigation */}
        <aside className="hidden w-64 flex-shrink-0 lg:block">
          <nav className="sticky top-24 space-y-1">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              const content = (
                <div
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : item.disabled
                      ? "text-neutral-400 cursor-not-allowed"
                      : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.disabled && (
                    <span className="ml-auto text-xs text-neutral-400">Próximamente</span>
                  )}
                </div>
              );

              if (item.disabled) {
                return <div key={item.path}>{content}</div>;
              }

              return (
                <Link key={item.path} to={item.path}>
                  {content}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
};

