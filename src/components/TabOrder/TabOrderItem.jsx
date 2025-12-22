import React from 'react';
import styles from './TabOrder.module.css';

const TabOrderItem = ({ order, role, name, tabindex, xpath, onHighlight }) => {
    const handleClick = () => {
        if (onHighlight) {
            onHighlight(order, xpath || null);
        }
    };

    return (
        <div className={styles.orderItem} onClick={handleClick}>
            <div className={styles.orderBadge}>{order}</div>
            <div className={styles.orderContent}>
                <span className={styles.orderRole}>{role}:</span>
                <span className={styles.orderName}>{name}</span>
                {tabindex !== null && tabindex !== undefined && tabindex !== 0 && (
                    <span className={styles.tabindexBadge}>tabindex={tabindex}</span>
                )}
            </div>
        </div>
    );
};

export default TabOrderItem;
