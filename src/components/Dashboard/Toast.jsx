import React, { useEffect, useState } from 'react';
import styles from './Dashboard.module.css';

const Toast = ({ message, onClose, duration = 3000 }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for fade out animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!message) return null;

    return (
        <div className={`${styles.toast} ${isVisible ? styles['toast-visible'] : ''}`}>
            <span>{message}</span>
            <button 
                className={styles['toast-close']} 
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(onClose, 300);
                }}
                aria-label="Close notification"
            >
                ×
            </button>
        </div>
    );
};

export default Toast;

