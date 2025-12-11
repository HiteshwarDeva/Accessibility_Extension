import React from 'react';
import styles from './Tabs.module.css';

const Tabs = ({ activeTab, onTabChange, tabs }) => {
    const defaultTabs = [
        { id: 'details', label: 'Details' },
        { id: 'order', label: 'Order' },
        { id: 'structure', label: 'Structure' },
        { id: 'contrast', label: 'Contrast' }
    ];

    const displayTabs = tabs || defaultTabs;

    return (
        <div className={styles.tabs}>
            {displayTabs.map(tab => (
                <button
                    key={tab.id}
                    className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
                    onClick={() => onTabChange(tab.id)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

export default Tabs;
