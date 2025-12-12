import React from 'react';
import styles from './TabOrder.module.css';

const TabOrderInfo = () => {
    return (
        <div className={styles.infoBox}>
            <p className={styles.infoText}>
                Order, role, and accessible name (what is read by a screen reader) for all navigable
                page elements are listed. Elements that do not have a function should not be listed.
            </p>
        </div>
    );
};

export default TabOrderInfo;
