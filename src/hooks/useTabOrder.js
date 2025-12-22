/* eslint-disable no-undef */
import { useState, useCallback } from 'react';
import { sendMessageToInspectedTab } from '../utils/messageHelpers';

export const useTabOrder = () => {
    const [orderData, setOrderData] = useState(null);
    const [tabOrderMetadata, setTabOrderMetadata] = useState(null);
    const [isScanningTabOrder, setIsScanningTabOrder] = useState(false);
    const [tabOrderError, setTabOrderError] = useState(null);
    const [overlayVisible, setOverlayVisible] = useState(false);

    const runTabOrderScan = useCallback(() => {
        setIsScanningTabOrder(true);
        setTabOrderError(null);
        setOrderData(null);
        setTabOrderMetadata(null);

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
            setTabOrderMetadata(response.metadata || null);
        });
    }, []);

    const showOverlay = useCallback((data = null) => {
        sendMessageToInspectedTab({ type: 'show-tab-order-overlay', data }, (response) => {
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

    const highlightElement = useCallback((orderNumber, path = null) => {
        sendMessageToInspectedTab({ type: 'highlight-tab-order-element', orderNumber, path }, (response) => {
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
        highlightElement,
        setOrderData,
        setTabOrderMetadata,
        tabOrderMetadata
    };
};
