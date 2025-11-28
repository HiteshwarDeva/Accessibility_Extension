import React from 'react';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import ContrastChecker from './components/Contrast/ContrastChecker';
import ContrastSummary from './components/Contrast/ContrastSummary';

function App() {
  return (
    <Layout>
      <Content />
    </Layout>
  );
}

const Content = ({ activeTab }) => {
  switch (activeTab) {
    case 'details':
      return <Dashboard />;
    case 'contrast':
      return <ContrastChecker />;
    case 'order':
      return <div style={{ padding: 20, textAlign: 'center' }}>Order View (Coming Soon)</div>;
    case 'structure':
      return <ContrastSummary />;
    default:
      return <Dashboard />;
  }
};

export default App;
