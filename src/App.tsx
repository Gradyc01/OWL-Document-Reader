import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DocUpload from "./pages/DocUpload";
import DocValidate from "./pages/DocValidate";
import PageDashboard from "./pages/PageDashboard";
import DocEdit from "./pages/DocEdit";
import PageChangelog from "./pages/PageChangelog";
import { AuthProvider } from "./hooks/AuthContext";
import "./App.css";
import ProtectedRoute from "./components/ProtectedRouted";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>  
        <Routes>
          <Route path="/pageDashboard" element={<ProtectedRoute><PageDashboard /></ProtectedRoute>} />
          <Route path="/docUpload" element={<ProtectedRoute><DocUpload /></ProtectedRoute>} />
          <Route path="/docValidate" element={<ProtectedRoute><DocValidate /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/docEdit" element={<ProtectedRoute><DocEdit /></ProtectedRoute>} />
          <Route path="/changelog" element={<PageChangelog />} />

          {/* Default (redirect or 404) */}
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
