// src/App.js
import './debug-env'; // Add this line at the top
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Header from './components/common/Header';
import GetStartedPage from './components/common/GetStartedPage';
import EnterpriseQuoteForm from './components/common/EnterpriseQuoteForm';
import PublicLanding from './components/common/PublicLanding';
import HomeRoute from './components/common/HomeRoute';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import Dashboard from './components/dashboard/Dashboard';
import ProjectDetail from './components/projects/ProjectDetail';
import DocumentViewer from './components/DocumentViewer';
import ClientBinderViewer from './components/client/ClientBinderViewer';
import ClientDashboard from './components/client/ClientDashboard';
import './index.css';



function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main>
            <Routes>
              {/* Public Routes (Home redirects logged-in users by role) */}
              <Route path="/" element={<HomeRoute />} />
              <Route path="/public" element={<PublicLanding />} />
              <Route path="/get-started" element={<GetStartedPage />} />
              <Route path="/enterprise-quote" element={<EnterpriseQuoteForm />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/document-viewer" element={<DocumentViewer />} />
              
              {/* Protected Application Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={["firm"]}>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/client" 
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <ClientDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/client/:slug" 
                element={
                  <ProtectedRoute allowedRoles={["client", "firm"]}>
                    <ClientDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/projects/:id" 
                element={
                  <ProtectedRoute allowedRoles={["firm"]}>
                    <ProjectDetail />
                  </ProtectedRoute>
                } 
              />
              {/* Public client-facing route */}
              <Route path="/client-binder/:accessCode" element={<ClientBinderViewer />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;