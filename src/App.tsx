import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PublicLayout from './components/layout/PublicLayout';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import FaqPage from './pages/FaqPage';
import LegalPage from './pages/LegalPage';
import TimelineApp from './TimelineApp';
import Dashboard from './Dashboard';
import AdminDashboard from './AdminDashboard';
import StylesPage from './StylesPage';
import FeedbackPage from './FeedbackPage';
import { AuthProvider } from './context/AuthContext';
import { TimelineGuard } from './components/TimelineGuard';
import { AdminGuard } from './components/AdminGuard';


import { ThemeProvider } from './context/ThemeContext';
import { ConfirmProvider } from './context/ConfirmContext';
export default function App() {
  return (
    <ThemeProvider>
      <ConfirmProvider>
      <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/legal" element={<LegalPage />} />
        </Route>
          <Route path="/dashboard" element={
            <TimelineGuard>
              <Dashboard />
            </TimelineGuard>
          } />
          <Route path="/admin" element={
            <AdminGuard>
              <AdminDashboard />
            </AdminGuard>
          } />
          <Route path="/feedback" element={
            <TimelineGuard>
              <FeedbackPage />
            </TimelineGuard>
          } />
          <Route path="/timeline" element={
            <TimelineGuard>
              <TimelineApp />
            </TimelineGuard>
          } />
          <Route path="/styles" element={
            <TimelineGuard>
              <StylesPage />
            </TimelineGuard>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ConfirmProvider>
    </ThemeProvider>
  );
}
