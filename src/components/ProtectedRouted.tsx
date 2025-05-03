import { useAuth } from "../hooks/AuthContext";
import { Navigate } from "react-router-dom";
import LoadingOverlay from "./LoadingOverlay";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if(isLoading) {
        return <LoadingOverlay loading={true} />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;