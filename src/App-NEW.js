import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/navigation/Navbar';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './components/dashboard/Dashboard';
import './App.css';

function App() {
  return (
    <div className="App min-h-screen bg-gray-50">
      <AuthProvider>
        <Navbar />
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </AuthProvider>
    </div>
  );
}

export default App;