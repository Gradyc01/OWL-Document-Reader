import { useAuth } from "./AuthContext";

export const useAuthedFetch = () => {
    const { accessToken, logout } = useAuth();

    const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: accessToken ?? "",
                "Content-Type": "application/json",
            },
        });

        if (response.status === 401) {
            logout();
        }

        return response;
    };

    return { fetchWithAuth };
}