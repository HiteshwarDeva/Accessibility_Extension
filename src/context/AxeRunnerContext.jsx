import React, { createContext, useContext } from 'react';
import { useAxeRunner } from '../hooks/useAxeRunner';

const AxeRunnerContext = createContext(null);

export const AxeRunnerProvider = ({ children }) => {
    const runnerData = useAxeRunner();

    return (
        <AxeRunnerContext.Provider value={runnerData}>
            {children}
        </AxeRunnerContext.Provider>
    );
};

export const useRunner = () => {
    const context = useContext(AxeRunnerContext);
    if (!context) {
        throw new Error('useRunner must be used within an AxeRunnerProvider');
    }
    return context;
};
