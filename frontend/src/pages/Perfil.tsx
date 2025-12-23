import React from "react";
import { Card, Button, Badge } from "../components/ui";

export const Perfil: React.FC = () => {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Mi perfil</h2>
        <p className="text-neutral-600 mt-1">Gestiona tu información y preferencias</p>
      </div>

      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl">
            👤
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">Información personal</h3>
            <p className="text-sm text-neutral-600 mb-4">
              Tu información se mantiene privada y solo se usa para personalizar tu experiencia
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Tu nombre"
                  defaultValue="Usuario"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="tu@email.com"
                  defaultValue="usuario@ejemplo.com"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Preferencias de práctica</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Modo de práctica preferido
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 rounded-lg border border-neutral-200 cursor-pointer hover:bg-neutral-50">
                <input type="radio" name="practiceMode" defaultChecked className="text-indigo-600" />
                <span className="text-sm text-neutral-900">Respuesta breve (1-2 minutos)</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-lg border border-neutral-200 cursor-pointer hover:bg-neutral-50">
                <input type="radio" name="practiceMode" className="text-indigo-600" />
                <span className="text-sm text-neutral-900">Respuesta detallada (3-4 minutos)</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Notificaciones
            </label>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 cursor-pointer hover:bg-neutral-50">
                <span className="text-sm text-neutral-900">Recordatorios de práctica</span>
                <input type="checkbox" defaultChecked className="rounded text-indigo-600" />
              </label>
              <label className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 cursor-pointer hover:bg-neutral-50">
                <span className="text-sm text-neutral-900">Resumen semanal</span>
                <input type="checkbox" className="rounded text-indigo-600" />
              </label>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Estadísticas</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center p-4 rounded-lg bg-neutral-50">
            <div className="text-2xl font-bold text-neutral-900">12</div>
            <div className="text-sm text-neutral-600 mt-1">Sesiones completadas</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-neutral-50">
            <div className="text-2xl font-bold text-neutral-900">48</div>
            <div className="text-sm text-neutral-600 mt-1">Preguntas practicadas</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-neutral-50">
            <div className="text-2xl font-bold text-neutral-900">24%</div>
            <div className="text-sm text-neutral-600 mt-1">Mejora promedio</div>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button>Guardar cambios</Button>
        <Button variant="outline">Cancelar</Button>
      </div>
    </div>
  );
};

