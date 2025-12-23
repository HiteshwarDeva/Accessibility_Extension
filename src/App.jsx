import React from 'react';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import ContrastSection from './components/Contrast/ContrastSection';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import TabOrderSection from './components/TabOrder/TabOrderSection';
import StructurePanel from './components/Structure/StructurePanel';
import LoginScreen from './components/Auth/LoginScreen';

function App() {
  return (
    <AuthProvider>
      <AccessibilityProvider>
        <AuthWrapper />
      </AccessibilityProvider>
    </AuthProvider>
  );
}

const AuthWrapper = () => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        Loading...
      </div>
    );
  }

  if (!token) {
    return <LoginScreen />;
  }

  return (
    <Layout>
      <Content />
    </Layout>
  );
};

const Placeholder = ({ message }) => (
  <div style={{ padding: 20, textAlign: 'center' }}>{message}</div>
);

const Content = ({ activeTab }) => {
  switch (activeTab) {
    case 'details':
      return <Dashboard />;
    case 'contrast':
      return <ContrastSection />;
    case 'order':
      return <TabOrderSection />;
    case 'structure':
      return <StructurePanel />;
    default:
      return <Dashboard />;
  }
};

export default App;
