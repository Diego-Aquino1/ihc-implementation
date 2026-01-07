import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

// Pages
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import PrepImport from './pages/PrepImport';
import PrepConfig from './pages/PrepConfig';
import Ritual from './pages/Ritual';
import History from './pages/History';
import Profile from './pages/Profile';
import InterviewLivePage from './pages/InterviewLivePage';

const AppContent: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />

            <Route path="/*" element={
                <Layout>
                    <Routes>
                        <Route path="/live" element={<InterviewLivePage />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/history" element={<History />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/prep-import" element={<PrepImport />} />
                        <Route path="/prep-config" element={<PrepConfig />} />
                        <Route path="/ritual" element={<Ritual />} />
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