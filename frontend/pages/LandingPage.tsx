import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-landing overflow-x-hidden">
      {/* Top Navigation */}
      <div className="w-full border-b border-solid border-[#e5e7eb] dark:border-[#233648] bg-white dark:bg-background-dark sticky top-0 z-50">
        <div className="w-full flex h-full grow flex-col">
          <div className="px-4 md:px-10 lg:px-40 flex flex-1 justify-center py-3">
            <div className="flex flex-col max-w-[1200px] flex-1">
              <header className="flex items-center justify-between whitespace-nowrap">
                <div className="flex items-center gap-4 text-slate-900 dark:text-white">
                  <div className="size-6 text-primary">
                    <span className="material-symbols-outlined text-2xl">psychology</span>
                  </div>
                  <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">InterviewCoach</h2>
                </div>
                <div className="flex flex-1 justify-end gap-8">
                  <div className="hidden md:flex items-center gap-9">
                    <a className="text-sm font-medium leading-normal text-slate-600 dark:text-white hover:text-primary transition-colors" href="#">Metodología</a>
                    <a className="text-sm font-medium leading-normal text-slate-600 dark:text-white hover:text-primary transition-colors" href="#">Precios</a>
                    <a className="text-sm font-medium leading-normal text-slate-600 dark:text-white hover:text-primary transition-colors" href="#">Nosotros</a>
                  </div>
                  <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-slate-100 dark:bg-[#233648] text-slate-900 dark:text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-slate-200 dark:hover:bg-[#324d67] transition-colors">
                    <span className="truncate">Iniciar Sesión</span>
                  </button>
                </div>
              </header>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Wrapper */}
      <div className="flex h-full grow flex-col">
        <div className="px-4 md:px-10 lg:px-40 flex flex-1 justify-center py-5">
          <div className="flex flex-col max-w-[1200px] flex-1">
            
            {/* Hero Section */}
            <div className="@container">
              <div className="flex flex-col gap-6 px-4 py-10 @[480px]:gap-8 lg:flex-row items-center">
                {/* Left Content */}
                <div className="flex flex-col gap-6 flex-1 lg:max-w-[50%]">
                  <div className="flex flex-col gap-4 text-left">
                    <h1 className="text-slate-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em] md:text-5xl">
                      Transforma la Ansiedad en Confianza
                    </h1>
                    <h2 className="text-slate-600 dark:text-gray-300 text-lg font-normal leading-relaxed">
                      Domina tus habilidades para entrevistas utilizando principios científicos de aprendizaje y técnicas de regulación emocional. Convierte el potencial en máximo rendimiento.
                    </h2>
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    <Link to="/dashboard" className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-blue-600 transition-all shadow-lg shadow-primary/20">
                      <span className="truncate">Comenzar Ahora</span>
                    </Link>
                    <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-transparent border border-slate-200 dark:border-border-dark text-slate-900 dark:text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-slate-100 dark:hover:bg-card-dark transition-all">
                      <span className="truncate">Cómo Funciona</span>
                    </button>
                  </div>
                </div>
                {/* Right Image */}
                <div className="w-full flex-1 aspect-video rounded-xl overflow-hidden shadow-2xl bg-slate-800 relative group mt-8 lg:mt-0">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent z-10"></div>
                  <div 
                    className="w-full h-full bg-center bg-no-repeat bg-cover transform transition-transform duration-700 group-hover:scale-105" 
                    style={{backgroundImage: 'url("https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=2576&auto=format&fit=crop")'}}
                  ></div>
                </div>
              </div>
            </div>

            {/* Feature Section */}
            <div className="flex flex-col gap-10 px-4 py-20">
              <div className="flex flex-col gap-4 items-center text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                  <span className="material-symbols-outlined text-sm">science</span>
                  <span>Metodología Probada</span>
                </div>
                <h1 className="text-slate-900 dark:text-white tracking-light text-[32px] font-bold leading-tight md:text-4xl max-w-[720px]">
                  La Ciencia del Rendimiento
                </h1>
                <p className="text-slate-600 dark:text-text-secondary text-lg font-normal leading-normal max-w-[720px]">
                  Nuestro enfoque combina la ciencia cognitiva con la regulación emocional para prepararte de manera integral, asegurando que estés listo para cualquier pregunta.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-0">
                {/* Card 1 */}
                <div className="flex flex-1 gap-4 rounded-xl border border-slate-200 dark:border-border-dark bg-white dark:bg-card-dark p-6 flex-col hover:border-primary/50 transition-colors shadow-sm dark:shadow-none group">
                  <div className="text-primary p-3 bg-primary/10 rounded-lg w-fit group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-3xl">psychology</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight">Ciencia Cognitiva</h2>
                    <p className="text-slate-600 dark:text-text-secondary text-base font-normal leading-relaxed">Repetición espaciada y recuerdo activo adaptados específicamente a tu industria y rol.</p>
                  </div>
                </div>
                {/* Card 2 */}
                <div className="flex flex-1 gap-4 rounded-xl border border-slate-200 dark:border-border-dark bg-white dark:bg-card-dark p-6 flex-col hover:border-primary/50 transition-colors shadow-sm dark:shadow-none group">
                  <div className="text-primary p-3 bg-primary/10 rounded-lg w-fit group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-3xl">self_improvement</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight">Control Emocional</h2>
                    <p className="text-slate-600 dark:text-text-secondary text-base font-normal leading-relaxed">Técnicas inspiradas en biofeedback para mantenerte calmado, concentrado y elocuente bajo presión.</p>
                  </div>
                </div>
                {/* Card 3 */}
                <div className="flex flex-1 gap-4 rounded-xl border border-slate-200 dark:border-border-dark bg-white dark:bg-card-dark p-6 flex-col hover:border-primary/50 transition-colors shadow-sm dark:shadow-none group">
                  <div className="text-primary p-3 bg-primary/10 rounded-lg w-fit group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-3xl">trending_up</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight">Seguimiento de Rendimiento</h2>
                    <p className="text-slate-600 dark:text-text-secondary text-base font-normal leading-relaxed">Insights detallados basados en datos para visualizar tu crecimiento e identificar áreas de mejora.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="@container">
              <div className="flex flex-col justify-end gap-6 px-4 py-10 md:gap-8 md:px-10 md:py-20 rounded-2xl bg-slate-200 dark:bg-gradient-to-br dark:from-card-dark dark:to-background-dark border border-slate-300 dark:border-border-dark my-10 relative overflow-hidden text-center">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                <div className="flex flex-col gap-4 text-center relative z-10">
                  <h1 className="text-slate-900 dark:text-white tracking-light text-[32px] font-bold leading-tight md:text-4xl max-w-[720px] mx-auto">
                    ¿Listo para alcanzar tu potencial?
                  </h1>
                  <p className="text-slate-600 dark:text-gray-300 text-lg font-normal leading-normal max-w-[720px] mx-auto">
                    Comienza tu evaluación hoy y construye la confianza para triunfar en tu próxima gran oportunidad.
                  </p>
                </div>
                <div className="flex flex-1 justify-center relative z-10 mt-4">
                  <div className="flex justify-center w-full max-w-[300px]">
                    <Link to="/dashboard" className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-blue-600 transition-colors shadow-lg shadow-primary/25">
                      <span className="truncate">Comenzar Ahora</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <footer className="flex flex-col gap-6 px-5 py-10 text-center border-t border-slate-200 dark:border-border-dark mt-10">
              <div className="flex flex-col items-center gap-6">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white mb-2">
                  <div className="size-5 text-primary">
                    <span className="material-symbols-outlined text-xl">psychology</span>
                  </div>
                  <span className="text-base font-bold">InterviewCoach</span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-6">
                  <a className="text-slate-500 dark:text-text-secondary text-base font-normal leading-normal min-w-40 hover:text-primary transition-colors" href="#">Metodología</a>
                  <a className="text-slate-500 dark:text-text-secondary text-base font-normal leading-normal min-w-40 hover:text-primary transition-colors" href="#">Política de Privacidad</a>
                  <a className="text-slate-500 dark:text-text-secondary text-base font-normal leading-normal min-w-40 hover:text-primary transition-colors" href="#">Términos de Servicio</a>
                </div>
                <p className="text-slate-400 dark:text-slate-600 text-sm font-normal leading-normal mt-4">© 2024 Interview Inc. All rights reserved.</p>
              </div>
            </footer>

          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;