import React, { useEffect } from 'react';
import styles from './Order.module.css';
import { useAccessibilityTree } from '../../hooks/useAccessibilityTree';
import OrderInfo from './OrderInfo';
import OrderItem from './OrderItem';

const OrderSection = () => {
    const { orderData, isScanning, error, overlayVisible, runScan, showOverlay, hideOverlay, highlightElement } = useAccessibilityTree();
    const hasData = Boolean(orderData && orderData.length > 0);

    useEffect(() => {
        if (!orderData && !isScanning) {
            runScan();
        }
    }, [orderData, isScanning, runScan]);

    // Clean up overlay when component unmounts
    useEffect(() => {
        return () => {
            if (overlayVisible) {
                hideOverlay();
            }
        };
    }, [overlayVisible, hideOverlay]);

    const handleToggleOverlay = () => {
        if (overlayVisible) {
            hideOverlay();
        } else {
            showOverlay();
        }
    };

    const handleHighlight = (orderNumber) => {
        // Show overlay if not already visible
        if (!overlayVisible) {
            showOverlay();
            // Wait a bit for overlay to render before highlighting
            setTimeout(() => {
                highlightElement(orderNumber);
            }, 500);
        } else {
            highlightElement(orderNumber);
        }
    };

    return (
        <div className={styles.orderSection}>
            {isScanning && (
                <div className={styles.statusMessage}>
                    <p>Scanning page for tab order...</p>
                </div>
            )}

            {!isScanning && !hasData && !error && (
                <div className={styles.emptyState}>
                    <p>Trigger a scan to view tab order.</p>
                    <button className={styles.primaryBtn} type="button" onClick={runScan}>
                        Scan Page
                    </button>
                </div>
            )}

            {hasData && (
                <>
                    <div className={styles.headerSection}>
                        <h2 className={styles.sectionTitle}>Order</h2>
                        <button
                            className={`${styles.overlayBtn} ${overlayVisible ? styles.overlayBtnActive : ''}`}
                            type="button"
                            onClick={handleToggleOverlay}
                        >
                            {overlayVisible ? '👁️ Hide Overlay' : '👁️ Show Overlay'}
                        </button>
                    </div>
                    <OrderInfo />
                    <div className={styles.orderList}>
                        {orderData.map((item) => (
                            <OrderItem
                                key={item.order}
                                order={item.order}
                                role={item.role}
                                name={item.name}
                                onHighlight={handleHighlight}
                            />
                        ))}
                    </div>
                </>
            )}

            {error && <p className={styles.errorMessage}>{error}</p>}
        </div>
    );
};

export default OrderSection;
