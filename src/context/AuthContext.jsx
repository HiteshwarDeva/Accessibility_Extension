import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // Initial Load
    useEffect(() => {
        chrome.storage.local.get(['extension_auth_token'], (result) => {
            if (result.extension_auth_token) {
                setToken(result.extension_auth_token);
            }
            setLoading(false);
        });
    }, []);

    // Listen for changes (from the content script injector)
    useEffect(() => {
        const handleStorageChange = (changes, area) => {
            if (area === 'local' && changes.extension_auth_token) {
                const newValue = changes.extension_auth_token.newValue;
                setToken(newValue || null);
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }, []);

    const login = () => {
        chrome.tabs.create({ url: 'https://armourwebcomply.duckdns.org/login' });
    };

    const logout = () => {
        chrome.storage.local.remove('extension_auth_token', () => {
            setToken(null);
        });
    };

    return (
        <AuthContext.Provider value={{ token, loading, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
