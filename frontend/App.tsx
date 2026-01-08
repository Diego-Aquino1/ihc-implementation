import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import { SimulationConfig, SessionData, SimulationStage } from './types';

// Pages
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import PrepImport from './pages/PrepImport';
import PrepConfig from './pages/PrepConfig';
import Ritual from './pages/Ritual';
import SimulationStagePage from './pages/SimulationStagePage';
import FeedbackAnalysis from './pages/FeedbackAnalysis';
import StrategicBuilder from './pages/StrategicBuilder';
import History from './pages/History';
import Profile from './pages/Profile';
import LiveInterviewPage from './pages/LiveInterviewPage';
import LiveInterviewList from './pages/LiveInterviewList';
import LiveInterviewDetail from './pages/LiveInterviewDetail';
import LiveInterviewResults from './pages/LiveInterviewResults';

const AppContent: React.FC = () => {
    // Global Session State
    const [sessionData, setSessionData] = useState<SessionData>({
        config: { vibe: 'challenger', jdText: '' },
        stageData: {
            [SimulationStage.ELEVATOR_PITCH]: null,
            [SimulationStage.STAR_METHOD]: null,
            [SimulationStage.PRESSURE]: null,
            [SimulationStage.CLOSING]: null
        },
        currentStage: SimulationStage.ELEVATOR_PITCH
    });

    const updateConfig = (newConfig: Partial<SimulationConfig>) => {
        setSessionData(prev => ({ ...prev, config: { ...prev.config, ...newConfig } }));
    };

    const updateStageData = (stage: SimulationStage, data: any) => {
        setSessionData(prev => ({
            ...prev,
            stageData: { ...prev.stageData, [stage]: data }
        }));
    };

    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />

            <Route path="/*" element={
                <Layout>
                    <Routes>
                        <Route path="/dashboard" element={<Dashboard session={sessionData} />} />
                        <Route path="/history" element={<History />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/live/list" element={<LiveInterviewList />} />
                        <Route path="/live/:sessionId" element={<LiveInterviewPage />} />
                        <Route path="/live/:sessionId/results" element={<LiveInterviewResults />} />
                        <Route path="/live/:sessionId/detail" element={<LiveInterviewDetail />} />
                        <Route path="/prep-import" element={<PrepImport onNext={(text) => updateConfig({ jdText: text })} />} />
                        <Route path="/prep-config" element={<PrepConfig config={sessionData.config} onChange={updateConfig} />} />
                        <Route path="/ritual" element={<Ritual />} />

                        {/* Elevator Pitch */}
                        <Route path="/sim/pitch" element={
                            <SimulationStagePage
                                stage={SimulationStage.ELEVATOR_PITCH}
                                title="Elevator Pitch"
                                description="Háblame de ti. Cuéntame brevemente sobre tu experiencia."
                                nextPath="/sim/pitch/feedback"
                                sessionData={sessionData}
                                onSave={(data) => updateStageData(SimulationStage.ELEVATOR_PITCH, data)}
                            />
                        } />
                        <Route path="/sim/pitch/feedback" element={<FeedbackAnalysis stage={SimulationStage.ELEVATOR_PITCH} data={sessionData.stageData[SimulationStage.ELEVATOR_PITCH]} nextPath="/sim/star" />} />

                        {/* STAR Method */}
                        <Route path="/sim/star" element={
                            <SimulationStagePage
                                stage={SimulationStage.STAR_METHOD}
                                title="Laboratorio STAR"
                                description="Cuéntame sobre un proyecto desafiante en el que trabajaste recientemente."
                                nextPath="/sim/star/feedback"
                                sessionData={sessionData}
                                onSave={(data) => updateStageData(SimulationStage.STAR_METHOD, data)}
                            />
                        } />
                        <Route path="/sim/star/feedback" element={<FeedbackAnalysis stage={SimulationStage.STAR_METHOD} data={sessionData.stageData[SimulationStage.STAR_METHOD]} nextPath="/sim/pressure" />} />

                        {/* Pressure */}
                        <Route path="/sim/pressure" element={
                            <SimulationStagePage
                                stage={SimulationStage.PRESSURE}
                                title="Simulador de Presión"
                                description="Imagina que un cliente clave amenaza con cancelar su contrato. ¿Qué harías en las primeras 24 horas?"
                                nextPath="/sim/pressure/feedback"
                                sessionData={sessionData}
                                onSave={(data) => updateStageData(SimulationStage.PRESSURE, data)}
                            />
                        } />
                        <Route path="/sim/pressure/feedback" element={<FeedbackAnalysis stage={SimulationStage.PRESSURE} data={sessionData.stageData[SimulationStage.PRESSURE]} nextPath="/sim/closing/question" />} />

                        {/* Closing Phase */}
                        <Route path="/sim/closing/question" element={
                            <SimulationStagePage
                                stage={SimulationStage.CLOSING}
                                title="Cierre: Pregunta Estratégica"
                                description="Gracias por tu tiempo. Antes de terminar, ¿tienes alguna pregunta para mí?"
                                nextPath="/sim/closing/builder"
                                sessionData={sessionData}
                                isClosing={true}
                                onSave={(data) => updateStageData(SimulationStage.CLOSING, data)}
                            />
                        } />
                        <Route path="/sim/closing/builder" element={
                            <StrategicBuilder jdText={sessionData.config.jdText} nextPath="/sim/closing/feedback" />
                        } />

                        <Route path="/sim/closing/feedback" element={<FeedbackAnalysis stage={SimulationStage.CLOSING} data={sessionData.stageData[SimulationStage.CLOSING]} nextPath="/dashboard" isFinal={true} />} />
                    </Routes>
                </Layout>
            } />
        </Routes>
    );
};

const App: React.FC = () => {
    return (
        <HashRouter>
            <AppContent />
        </HashRouter>
    );
};

export default App;