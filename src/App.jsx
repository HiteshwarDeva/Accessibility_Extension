import React from 'react';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import ContrastSection from './components/Contrast/ContrastSection';
import { AccessibilityProvider } from './context/AccessibilityContext';
import TabOrderSection from './components/TabOrder/TabOrderSection';

function App() {
  return (
    <AccessibilityProvider>
      <Layout>
        <Content />
      </Layout>
    </AccessibilityProvider>

  );
}

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
      return <Placeholder message="Structure View (Coming Soon)" />;
    default:
      return <Dashboard />;
  }
};

export default App;
