import React, { useEffect } from 'react';
import styles from './TabOrder.module.css';
import { useAccessibility } from '../../context/AccessibilityContext';
import TabOrderInfo from './TabOrderInfo';
import TabOrderItem from './TabOrderItem';
import Toast from '../Dashboard/Toast';

const TabOrderSection = () => {

    const { tabOrder, history } = useAccessibility();
    const { orderData, isScanningTabOrder, tabOrderError, overlayVisible, runTabOrderScan, showOverlay, hideOverlay, highlightElement, tabOrderMetadata, setOrderData, setTabOrderMetadata } = tabOrder;
    const { saveScan, scanHistory } = history;
    const [toastMessage, setToastMessage] = React.useState(null);
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

    const handleSaveScan = async () => {
        if (!orderData) return;
        try {
            const metadata = tabOrderMetadata || {
                title: document.title,
                url: window.location.href
            };
            await saveScan('tab-order', orderData, metadata);
            setToastMessage('Tab Order scan saved to history!');
        } catch (e) {
            console.error(e);
            setToastMessage('Failed to save scan.');
        }
    };

    const handleLoadPrevious = async () => {
        // Find most recent tab-order scan in history
        const previousScan = [...scanHistory]
            .filter(s => s.type === 'tab-order')
            .sort((a, b) => b.timestamp - a.timestamp)[0];

        if (!previousScan) {
            setToastMessage('No previous Tab Order scans found.');
            return;
        }

        try {
            const fullScan = await history.loadScanData(previousScan.id);
            if (fullScan) {
                setOrderData(fullScan.data);
                if (fullScan.metadata) setTabOrderMetadata(fullScan.metadata);
                showOverlay(fullScan.data);
                setToastMessage('Previous Tab Order overlay loaded.');
            }
        } catch (e) {
            console.error(e);
            setToastMessage('Failed to load previous scan.');
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
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button className={styles.primaryBtn} type="button" onClick={runTabOrderScan}>
                            Scan Page
                        </button>
                        <button
                            className={styles.overlayBtn}
                            type="button"
                            onClick={handleLoadPrevious}
                            style={{
                                backgroundColor: '#fff',
                                border: '1px solid #ccc',
                                color: '#333'
                            }}
                        >
                            📂 Load Previous
                        </button>
                    </div>
                </div>
            )}

            {hasData && (
                <>
                    <div className={styles.headerSection}>
                        <h2 className={styles.sectionTitle}>Order</h2>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className={styles.overlayBtn}
                                type="button"
                                onClick={handleSaveScan}
                                style={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #ccc',
                                    color: '#333'
                                }}
                            >
                                💾 Save
                            </button>
                            <button
                                className={styles.overlayBtn}
                                type="button"
                                onClick={runTabOrderScan}
                                style={{
                                    backgroundColor: 'transparent',
                                    border: '1px solid #ccc',
                                    color: '#333'
                                }}
                            >
                                🔄 Re-run Scan
                            </button>
                            <button
                                className={`${styles.overlayBtn} ${overlayVisible ? styles.overlayBtnActive : ''}`}
                                type="button"
                                onClick={handleToggleOverlay}
                            >
                                {overlayVisible ? '👁️ Hide Overlay' : '👁️ Show Overlay'}
                            </button>
                            <button
                                className={styles.overlayBtn}
                                type="button"
                                onClick={handleLoadPrevious}
                                style={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #ccc',
                                    color: '#333'
                                }}
                            >
                                📂 Load Previous
                            </button>
                        </div>
                    </div>
                    <TabOrderInfo />
                    <div className={styles.orderList}>
                        {orderData.map((item) => (
                            <TabOrderItem
                                key={item.element_key || item.order}
                                order={item.order}
                                role={item.role}
                                name={item.name}
                                tabindex={item.tabindex}
                                xpath={item.xpath}
                                onHighlight={handleHighlight}
                            />
                        ))}
                    </div>
                </>
            )}

            {tabOrderError && <p className={styles.errorMessage}>{tabOrderError}</p>}

            {toastMessage && (
                <Toast
                    message={toastMessage}
                    onClose={() => setToastMessage(null)}
                />
            )}
        </div>
    );
};

export default TabOrderSection;
