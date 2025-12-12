import { useState, useCallback } from 'react';
import { sendMessageToInspectedTab } from '../utils/messageHelpers';

export const useAxeRunner = () => {
    const [results, setResults] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState(null);

    const runScan = useCallback(() => {
        setIsScanning(true);
        setError(null);
        setResults(null);

        sendMessageToInspectedTab({ type: 'run-axe' }, (response) => {
            setIsScanning(false);
            if (!response) {
                setError('No response from content script (page may block extensions).');
                return;
            }
            if (!response.ok) {
                setError(response.error || 'Unknown issue running axe.');
                return;
            }
            setResults(response.results);
        });
    }, []);

    const highlightNode = useCallback((selectors) => {
        sendMessageToInspectedTab({ type: 'highlight-nodes', selectors: selectors || [] }, () => { });
    }, []);

    const clearHighlights = useCallback(() => {
        sendMessageToInspectedTab({ type: 'clear-highlights' }, () => { });
    }, []);

    const highlightTargetsContrast = useCallback((selectors) => {
        sendMessageToInspectedTab({ type: 'highlight-nodes-contrast', selectors: selectors || [] }, () => { });
    }, []);

    const clearHighlightsContrast = useCallback(() => {
        sendMessageToInspectedTab({ type: 'clear-highlights-contrast' }, () => { });
    }, []);

    const toggleHighlight = useCallback((selectorData, callback) => {
        sendMessageToInspectedTab(
            { type: 'toggle-highlight', selectorData },
            (response) => {
                if (callback) callback(response);
            }
        );
    }, []);

    return {
        results,
        isScanning,
        error,
        runScan,
        highlightTargetsContrast,
        clearHighlightsContrast,
        highlightNode,
        clearHighlights,
        toggleHighlight
    };
};
