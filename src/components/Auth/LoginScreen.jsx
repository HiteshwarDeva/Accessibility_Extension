import React from 'react';
import { useAuth } from '../../context/AuthContext';

const LoginScreen = () => {
    const { login } = useAuth();

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            padding: '20px',
            textAlign: 'center',
            backgroundColor: '#fff',
            color: '#333'
        }}>
            <h1 style={{ fontSize: '24px', marginBottom: '10px', color: '#2563EB' }}>ArmourAI</h1>
            <p style={{ marginBottom: '30px', color: '#666' }}>
                Please sign in to your account to access the accessibility testing suite.
            </p>

            <button
                onClick={login}
                style={{
                    backgroundColor: '#2563EB',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#1D4ED8'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#2563EB'}
            >
                Sign In / Register
            </button>

            <div style={{ marginTop: '20px', fontSize: '12px', color: '#999' }}>
                Redirects to armourwebcomply.duckdns.org
            </div>
        </div>
    );
};

export default LoginScreen;
