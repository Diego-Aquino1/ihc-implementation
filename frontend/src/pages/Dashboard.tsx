import React from "react";
import { Link } from "react-router-dom";
import { Card, Button, Badge } from "../components/ui";

export const Dashboard: React.FC = () => {
  const stats = [
    { label: "Sesiones completadas", value: "12", trend: "+3 esta semana" },
    { label: "Mejora promedio", value: "24%", trend: "↑ 5%" },
    { label: "Preguntas practicadas", value: "48", trend: "+12 esta semana" },
  ];

  const recentActivity = [
    { type: "Experiencia", date: "Hace 2 horas", score: "85%" },
    { type: "Experiencia", date: "Ayer", score: "72%" },
    { type: "Experiencia", date: "Hace 3 días", score: "68%" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Bienvenido/a de vuelta</h2>
          <p className="text-neutral-600 mt-1">
            Continúa mejorando tus habilidades para entrevistas laborales
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, idx) => (
          <Card key={idx}>
            <div className="flex flex-col">
              <span className="text-sm text-neutral-600 mb-1">{stat.label}</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-neutral-900">{stat.value}</span>
                <span className="text-xs text-emerald-600">{stat.trend}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Acciones rápidas</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Link to="/practicar/experiencia">
            <Card variant="outline" className="hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors cursor-pointer h-full">
              <div className="flex flex-col items-center text-center gap-2 py-4">
                <span className="text-3xl">💼</span>
                <span className="font-medium text-sm text-neutral-900">Describir experiencia</span>
                <span className="text-xs text-neutral-500">Practica contar proyectos</span>
              </div>
            </Card>
          </Link>
          
          <Card variant="outline" className="opacity-60 cursor-not-allowed">
            <div className="flex flex-col items-center text-center gap-2 py-4">
              <span className="text-3xl">📋</span>
              <span className="font-medium text-sm text-neutral-900">Preguntas frecuentes</span>
              <Badge variant="info" className="text-xs mt-1">Próximamente</Badge>
            </div>
          </Card>

          <Card variant="outline" className="opacity-60 cursor-not-allowed">
            <div className="flex flex-col items-center text-center gap-2 py-4">
              <span className="text-3xl">💭</span>
              <span className="font-medium text-sm text-neutral-900">Preguntas rebuscadas</span>
              <Badge variant="info" className="text-xs mt-1">Próximamente</Badge>
            </div>
          </Card>

          <Card variant="outline" className="opacity-60 cursor-not-allowed">
            <div className="flex flex-col items-center text-center gap-2 py-4">
              <span className="text-3xl">❄️</span>
              <span className="font-medium text-sm text-neutral-900">En frío</span>
              <Badge variant="info" className="text-xs mt-1">Próximamente</Badge>
            </div>
          </Card>
        </div>
      </Card>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Actividad reciente</h3>
          <div className="space-y-3">
            {recentActivity.map((activity, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 bg-neutral-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    💼
                  </div>
                  <div>
                    <div className="font-medium text-sm text-neutral-900">{activity.type}</div>
                    <div className="text-xs text-neutral-500">{activity.date}</div>
                  </div>
                </div>
                <Badge variant="success">{activity.score}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Progreso semanal</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-neutral-600">Fluidez</span>
                <span className="font-medium text-neutral-900">78%</span>
              </div>
              <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: "78%" }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-neutral-600">Claridad</span>
                <span className="font-medium text-neutral-900">82%</span>
              </div>
              <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: "82%" }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-neutral-600">Estructura</span>
                <span className="font-medium text-neutral-900">75%</span>
              </div>
              <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-600 rounded-full" style={{ width: "75%" }}></div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

