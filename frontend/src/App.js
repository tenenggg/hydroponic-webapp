import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"; 
import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { NotificationProvider } from "./context/NotificationContext";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from "./components/Dashboard";
import ViewData from "./components/ViewData";
import ViewOptimisedLevel from "./components/ViewOptimisedLevel";
import ViewGraph from "./components/ViewGraph";
import SelectPlant from "./components/SelectPlant";
import Login from "./components/Login";
import Register from "./components/Register";
import ManageUsers from "./components/ManageUsers";
import ManagePlants from "./components/ManagePlants";
import RawDataView from "./components/RawDataView";
import MultiPlantSelector from "./components/MultiplantSelector";

const queryClient = new QueryClient(); // Create a new QueryClient instance

// Protected Route component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  // Check if user is authenticated and has the required role
  // If not authenticated, redirect to login page
  // If authenticated but not admin, redirect to dashboard
  // If authenticated and has the required role, render the children components
  // This component is used to protect routes that require authentication and/or admin access
  // It checks the user's authentication status and role, and redirects accordingly
  // It uses the useEffect hook to check the user's status when the component mounts  
  useEffect(() => {   
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    checkUser();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requireAdmin && localStorage.getItem('userRole') !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

function App() {
  return (
    <div className="App">
      <Router>
        <QueryClientProvider client={queryClient}>  
          {/* Wrap the app in NotificationProvider to provide notification context */}
          {/* This allows components to access notification functionality */}
          {/* NotificationProvider is used to manage notifications across the app */}
          <NotificationProvider> 
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/view-data"
                element={
                  <ProtectedRoute>
                    <ViewData />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/view-optimised-level"
                element={
                  <ProtectedRoute>
                    <ViewOptimisedLevel />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/view-graph"
                element={
                  <ProtectedRoute>
                    <ViewGraph />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/select-plant"
                element={
                  <ProtectedRoute>
                    <SelectPlant />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/raw-data"
                element={
                  <ProtectedRoute>
                    <RawDataView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/multiplant-selector"
                element={
                  <ProtectedRoute>
                    <MultiPlantSelector />
                  </ProtectedRoute>
                }
              />

              {/* Admin-only Routes */} 
              <Route
                path="/manage-users"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <ManageUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manage-plants"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <ManagePlants />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </NotificationProvider>
        </QueryClientProvider>
      </Router>
    </div>
  );
}

export default App;
