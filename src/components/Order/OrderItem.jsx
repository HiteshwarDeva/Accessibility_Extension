import React from 'react';
import styles from './Order.module.css';

const OrderItem = ({ order, role, name, onHighlight }) => {
    const handleClick = () => {
        if (onHighlight) {
            onHighlight(order);
        }
    };

    return (
        <div className={styles.orderItem} onClick={handleClick}>
            <div className={styles.orderBadge}>{order}</div>
            <div className={styles.orderContent}>
                <span className={styles.orderRole}>{role}:</span>
                <span className={styles.orderName}>{name}</span>
            </div>
        </div>
    );
};

export default OrderItem;
