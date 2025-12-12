import React, { useEffect } from 'react';
import styles from './TabOrder.module.css';
import { useAccessibility } from '../../context/AccessibilityContext';
import TabOrderInfo from './TabOrderInfo';
import TabOrderItem from './TabOrderItem';

const TabOrderSection = () => {
    const { tabOrder } = useAccessibility();
    const { orderData, isScanningTabOrder, tabOrderError, overlayVisible, runTabOrderScan, showOverlay, hideOverlay, highlightElement } = tabOrder;
    const hasData = Boolean(orderData && orderData.length > 0);

    useEffect(() => {
        if (!orderData && !isScanningTabOrder) {
            runTabOrderScan();
        }
    }, [orderData, isScanningTabOrder, runTabOrderScan]);

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
            {isScanningTabOrder && (
                <div className={styles.statusMessage}>
                    <p>Scanning page for tab order...</p>
                </div>
            )}

            {!isScanningTabOrder && !hasData && !tabOrderError && (
                <div className={styles.emptyState}>
                    <p>Trigger a scan to view tab order.</p>
                    <button className={styles.primaryBtn} type="button" onClick={runTabOrderScan}>
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
                    <TabOrderInfo />
                    <div className={styles.orderList}>
                        {orderData.map((item) => (
                            <TabOrderItem
                                key={item.order}
                                order={item.order}
                                role={item.role}
                                name={item.name}
                                tabindex={item.tabindex}
                                onHighlight={handleHighlight}
                            />
                        ))}
                    </div>
                </>
            )}

            {tabOrderError && <p className={styles.errorMessage}>{tabOrderError}</p>}
        </div>
    );
};

export default TabOrderSection;
