import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';

// Layout Components
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Navbar from './components/navigation/Navbar';


// Page Components
import Dashboard from './components/projects/Dashboard';
import ProjectView from './components/projects/ProjectView';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import PublicLanding from './components/common/PublicLanding';

// Add import
import SupabaseDebug from './components/debug/SupabaseDebug';

// Add component
<SupabaseDebug />

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App page-container">
          {/* Header */}
          <Header />
          
          {/* Main Content */}
          <main className="flex-1">
            <div className="content-container">
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/public" element={<PublicLanding />} />
                
                {/* Protected Application Routes */}
                <Route path="/" element={
                  <ProtectedRoute fallback={<PublicLanding />}>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="/project/:id" element={
                  <ProtectedRoute>
                    <ProjectView />
                  </ProtectedRoute>
                } />
                
                {/* Default Route - Show landing page for unauthenticated, dashboard for authenticated */}
                <Route path="*" element={
                  <ProtectedRoute fallback={<PublicLanding />}>
                    <Dashboard />
                  </ProtectedRoute>
                } />
              </Routes>
            </div>
          </main>
          
          {/* Footer */}
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;