import React from 'react';
import styles from './Dashboard.module.css';

const ImpactBadge = ({ impact }) => {
    if (!impact) return null;
    const level = impact.toLowerCase();
    return (
        <span className={`${styles['impact-badge']} ${styles[`impact-${level}`] || ''}`}>
            {impact}
        </span>
    );
};

export default ImpactBadge;

