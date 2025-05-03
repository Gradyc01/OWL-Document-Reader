import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    ReactNode,
    useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
    exp: number; // in seconds
    [key: string]: any;
}

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    accessToken: string | null;
    login: (token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

const ACCESS_TOKEN_KEY = 'access_token';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const navigate = useNavigate();

    const validateToken = useCallback((): boolean => {
        const token = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (!token) {
            return false;
        }

        try {
            const decodedToken = jwtDecode<DecodedToken>(token);
            const currentTime = Date.now() / 1000; // convert ms to seconds
            
            if (decodedToken.exp < currentTime) {
                return false;
            }
            
            return true; 
        } catch (error) {
            console.error('Failed to decode token:', error);
            return false;
        }
    }, []);

    const performLogout = useCallback(() => {
        console.log('Performing log out.');
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem('user');
        localStorage.removeItem('isAdmin');
        setAccessToken(null);
        setIsAuthenticated(false);
        navigate('/login');
    }, [navigate]);

    useEffect(() => {
        if (validateToken()) {
            const token = localStorage.getItem(ACCESS_TOKEN_KEY);
            console.log('Token found and valid on load.');
            setAccessToken(token);
            setIsAuthenticated(true);
        } else {
            if (accessToken) {
                console.log('Token found but invalid on load. Logging out.');
                performLogout();
            } else {
                console.log('No token found on load.');
                setIsAuthenticated(false);
                setAccessToken(null);
            }
        }
        setIsLoading(false);
    }, [validateToken, performLogout]);

    const login = (token: string) => {
        try {
            const decodedToken = jwtDecode<DecodedToken>(token);
            const currentTime = Date.now() / 1000; // convert ms to seconds

            if (decodedToken.exp < currentTime) {
                console.error('Authentication expired. Logging out.');
                performLogout();
                return;
            }

            console.log('Logging in. Storing token.');
            localStorage.setItem(ACCESS_TOKEN_KEY, token);
            setAccessToken(token);
            setIsAuthenticated(true);
        } catch(error) {
            console.error("Failed to decode token during login:", error);
            performLogout();
        }
    };

    const logout = () => {
        performLogout();
    };

    const contextValue: AuthContextType = {
        isAuthenticated,
        isLoading,
        accessToken,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
};