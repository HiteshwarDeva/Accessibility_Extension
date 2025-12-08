import React from 'react';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import ContrastSection from './components/Contrast/ContrastSection';
import OrderSection from './components/Order/OrderSection';


function App() {
  return (
    <Layout>
      <Content />
    </Layout>
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
      return <OrderSection />;
    case 'structure':
      return <Placeholder message="Structure View (Coming Soon)" />;
    default:
      return <Dashboard />;
  }
};

export default App;
