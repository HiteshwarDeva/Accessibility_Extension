import React, { useState } from 'react';
import styles from './Contrast.module.css';
import Tabs from '../Layout/Tabs';
import ContrastChecker from './ContrastChecker/ContrastChecker';
import ContrastSummary from './ContrastSummary/ContrastSummary';

const ContrastSection = ({ results }) => {
    const [activeTab, setActiveTab] = useState('contrastSummary');

    const contrastTabs = [
        { id: 'contrastSummary', label: 'Contrast Summary' },
        { id: 'contrastChecker', label: 'Contrast Checker' }
    ];

    return (
        <div>
            <Tabs activeTab={activeTab} onTabChange={setActiveTab} tabs={contrastTabs} />
            <div>
                {activeTab === 'contrastSummary' && <ContrastSummary violations={results?.violations} passes={results?.passes} />}
                {activeTab === 'contrastChecker' && <ContrastChecker />}
            </div>
        </div>
    )
}

export default ContrastSection;

