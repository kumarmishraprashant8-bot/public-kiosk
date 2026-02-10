import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./pages/Dashboard";
import CrewApp from "./pages/CrewApp";
import { useState } from "react";

function App() {
  const [authenticated, setAuthenticated] = useState(
    localStorage.getItem("admin_authenticated") === "true"
  );

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            authenticated ? (
              <Navigate to="/" replace />
            ) : (
              <Login onLogin={() => setAuthenticated(true)} />
            )
          }
        />
        <Route
          path="/"
          element={
            authenticated ? (
              <Dashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        {/* Crew PWA - no auth required for demo */}
        <Route path="/crew" element={<CrewApp />} />
      </Routes>
    </Router>
  );
}

export default App;
