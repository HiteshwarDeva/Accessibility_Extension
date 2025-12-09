import React from 'react';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import ContrastSection from './components/Contrast/ContrastSection';
import { useAxeRunner } from './hooks/useAxeRunner';

function App() {
  const axeRunnerData = useAxeRunner();

  return (
    <Layout>
      <Content axeRunnerData={axeRunnerData} />
    </Layout>
  );
}

const Placeholder = ({ message }) => (
  <div style={{ padding: 20, textAlign: 'center' }}>{message}</div>
);

const Content = ({ activeTab, axeRunnerData }) => {
  switch (activeTab) {
    case 'details':
      return <Dashboard {...axeRunnerData} />;
    case 'contrast':
      return <ContrastSection results={axeRunnerData.results} highlightNode={axeRunnerData.highlightNode} clearHighlights={axeRunnerData.clearHighlights} />;
    case 'order':
      return <Placeholder message="Order View (Coming Soon)" />;
    case 'structure':
      return <Placeholder message="Structure View (Coming Soon)" />;
    default:
      return <Dashboard {...axeRunnerData} />;
  }
};

export default App;
