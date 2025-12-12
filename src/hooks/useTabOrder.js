/* eslint-disable no-undef */
import { useState, useCallback } from 'react';
import { sendMessageToInspectedTab } from '../utils/messageHelpers';

export const useTabOrder = () => {
    const [orderData, setOrderData] = useState(null);
    const [isScanningTabOrder, setIsScanningTabOrder] = useState(false);
    const [tabOrderError, setTabOrderError] = useState(null);
    const [overlayVisible, setOverlayVisible] = useState(false);

    const runTabOrderScan = useCallback(() => {
        setIsScanningTabOrder(true);
        setTabOrderError(null);
        setOrderData(null);

        sendMessageToInspectedTab({ type: 'get-tab-order' }, (response) => {
            setIsScanningTabOrder(false);
            if (!response) {
                setTabOrderError('No response from content script (page may block extensions).');
                return;
            }
            if (!response.ok) {
                setTabOrderError(response.error || 'Unknown issue getting tab order.');
                return;
            }
            setOrderData(response.data);
        });
    }, []);

    const showOverlay = useCallback(() => {
        sendMessageToInspectedTab({ type: 'show-tab-order-overlay' }, (response) => {
            if (response && response.ok) {
                setOverlayVisible(true);
            }
        });
    }, []);

    const hideOverlay = useCallback(() => {
        sendMessageToInspectedTab({ type: 'hide-tab-order-overlay' }, (response) => {
            if (response && response.ok) {
                setOverlayVisible(false);
            }
        });
    }, []);

    const highlightElement = useCallback((orderNumber) => {
        sendMessageToInspectedTab({ type: 'highlight-tab-order-element', orderNumber }, (response) => {
            // Optional: handle response if needed
        });
    }, []);

    return {
        orderData,
        isScanningTabOrder,
        tabOrderError,
        overlayVisible,
        runTabOrderScan,
        showOverlay,
        hideOverlay,
        highlightElement
    };
};
