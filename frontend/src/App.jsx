import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CentreAuthProvider, useCentreAuth } from './context/CentreAuthContext';
import { DirectoryProvider, useDirectory } from './context/DirectoryContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import CentreProtectedRoute from './components/CentreProtectedRoute';

// Layout Components
import Navbar from './components/Navbar';
import CentreNavbar from './components/CentreNavbar';
import Footer from './components/Footer';
import CentresDirectory from './components/CentresDirectory';

// Public Informational Pages
import LandingPage from './pages/LandingPage';
import HowItWorksPage from './pages/HowItWorksPage';
import AboutPage from './pages/AboutPage';
import AcceptedWastePage from './pages/AcceptedWastePage';
import FAQPage from './pages/FAQPage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

// Private Authenticated Customer Pages
import DashboardPage from './pages/DashboardPage';
import RegisterPage from './pages/RegisterPage';
import CentersPage from './pages/CentersPage';
import RequestsPage from './pages/RequestsPage';
import AccountPage from './pages/AccountPage';

// Recycling Centre Portal Pages
import CentreLoginPage from './pages/centre/CentreLoginPage';
import CentreRegisterPage from './pages/centre/CentreRegisterPage';
import CentreDashboardPage from './pages/centre/CentreDashboardPage';
import CentreRequestsPage from './pages/centre/CentreRequestsPage';
import CentreAppointmentsPage from './pages/centre/CentreAppointmentsPage';
import CentreProfilePage from './pages/centre/CentreProfilePage';

function AppShell() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { isCentreAuthenticated } = useCentreAuth();
  const { isDirectoryOpen, closeDirectory, previousTitle } = useDirectory();

  const isCentreRoute =
    location.pathname.startsWith('/centre') || location.pathname.startsWith('/center');
  const showCentreNavbar = isCentreRoute;

  // Close in-page directory if user navigates to a new route path
  useEffect(() => {
    closeDirectory();
  }, [location.pathname, closeDirectory]);

  const returnLabel = previousTitle
    ? `Return to ${previousTitle}`
    : isCentreRoute
    ? 'Return to Facility Dashboard'
    : isAuthenticated
    ? 'Return to Dashboard'
    : 'Return to Home Overview';

  return (
    <div className="min-h-screen flex flex-col bg-offwhite text-charcoal dark:bg-[#0A0A0A] dark:text-[#F5F5F5] selection:bg-[#FF7028]/20 selection:text-[#FF7028] transition-colors duration-150">
      
      {/* Dynamic Header: CentreNavbar for Facility Portal, Navbar for Customer site */}
      {showCentreNavbar ? <CentreNavbar /> : <Navbar />}

      {/* Main Content Router */}
      <main className="flex-1">
        {/* In-Page Centres Directory View (displays directly within the active layout) */}
        {isDirectoryOpen && (
          <div className="page-enter">
            <CentresDirectory
              onReturn={closeDirectory}
              returnLabel={returnLabel}
              isCustomer={isAuthenticated}
            />
          </div>
        )}

        {/* Existing Route Components (kept mounted to preserve user form inputs and state) */}
        <div className={isDirectoryOpen ? 'hidden' : 'contents'}>
          <Routes>
          {/* PUBLIC INFORMATIONAL ROUTES */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/accepted-waste" element={<AcceptedWastePage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/centers" element={<CentersPage />} />
          <Route path="/centres" element={<Navigate to="/centers" replace />} />

          {/* PROTECTED CUSTOMER APPLICATION ROUTES */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/register"
            element={
              <ProtectedRoute>
                <RegisterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests"
            element={
              <ProtectedRoute>
                <RequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            }
          />

          {/* RECYCLING CENTRE PORTAL ROUTES */}
          <Route path="/centre/login" element={<CentreLoginPage />} />
          <Route path="/center/login" element={<Navigate to="/centre/login" replace />} />
          <Route path="/centre/register" element={<CentreRegisterPage />} />
          <Route path="/center/register" element={<Navigate to="/centre/register" replace />} />

          <Route
            path="/centre/dashboard"
            element={
              <CentreProtectedRoute>
                <CentreDashboardPage />
              </CentreProtectedRoute>
            }
          />
          <Route path="/center/dashboard" element={<Navigate to="/centre/dashboard" replace />} />

          <Route
            path="/centre/requests"
            element={
              <CentreProtectedRoute>
                <CentreRequestsPage />
              </CentreProtectedRoute>
            }
          />
          <Route path="/center/requests" element={<Navigate to="/centre/requests" replace />} />

          <Route
            path="/centre/appointments"
            element={
              <CentreProtectedRoute>
                <CentreAppointmentsPage />
              </CentreProtectedRoute>
            }
          />
          <Route path="/center/appointments" element={<Navigate to="/centre/appointments" replace />} />

          <Route
            path="/centre/capacity"
            element={
              <CentreProtectedRoute>
                <Navigate to="/centre/settings?tab=schedule" replace />
              </CentreProtectedRoute>
            }
          />
          <Route path="/center/capacity" element={<Navigate to="/centre/settings?tab=schedule" replace />} />

          <Route
            path="/centre/profile"
            element={
              <CentreProtectedRoute>
                <CentreProfilePage />
              </CentreProtectedRoute>
            }
          />
          <Route path="/center/profile" element={<Navigate to="/centre/profile" replace />} />

          <Route
            path="/centre/settings"
            element={
              <CentreProtectedRoute>
                <CentreProfilePage />
              </CentreProtectedRoute>
            }
          />
          <Route path="/center/settings" element={<Navigate to="/centre/settings" replace />} />

          {/* Wildcard Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </div>
      </main>

      {/* Conventional SaaS Footer */}
      <Footer />

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CentreAuthProvider>
          <DirectoryProvider>
            <BrowserRouter>
              <AppShell />
            </BrowserRouter>
          </DirectoryProvider>
        </CentreAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
