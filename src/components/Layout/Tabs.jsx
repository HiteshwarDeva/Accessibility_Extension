import React from 'react';
import styles from './Tabs.module.css';

const Tabs = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'details', label: 'Details' },
        { id: 'order', label: 'Order' },
        { id: 'structure', label: 'Structure' },
        { id: 'contrast', label: 'Contrast' },
    ];

    return (
        <div className={styles.tabs}>
            {tabs.map(tab => (
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
