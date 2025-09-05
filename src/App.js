// src/App.js
import './debug-env'; // Add this line at the top
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Header from './components/common/Header';
import PublicLanding from './components/common/PublicLanding';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import Dashboard from './components/dashboard/Dashboard';
import ProjectDetail from './components/projects/ProjectDetail';
import DocumentViewer from './components/DocumentViewer';
import './index.css';



function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<PublicLanding />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/document-viewer" element={<DocumentViewer />} />
              
              {/* Protected Application Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/projects/:id" 
                element={
                  <ProtectedRoute>
                    <ProjectDetail />
                  </ProtectedRoute>
                } 
              />
              {/* Note: client-specific routes are disabled until components are added */}
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;