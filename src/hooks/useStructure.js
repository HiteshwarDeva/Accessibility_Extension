import { useState, useCallback } from 'react';
import { sendMessageToInspectedTab } from '../utils/messageHelpers';

export const useStructure = () => {
    const [structure, setStructure] = useState(null);
    const [structureMetadata, setStructureMetadata] = useState(null);
    const [isLoadingStructure, setIsLoadingStructure] = useState(false);
    const [structureError, setStructureError] = useState(null);
    const [isDiffOverlayVisible, setIsDiffOverlayVisible] = useState(false);

    const runStructureScan = useCallback(() => {
        setIsLoadingStructure(true);
        setStructureError(null);
        setStructure(null);
        setStructureMetadata(null);

        sendMessageToInspectedTab({ type: 'get-structure' }, (response) => {
            setIsLoadingStructure(false);
            if (!response) {
                setStructureError('No response from content script (page may block extensions).');
                return;
            }
            if (!response.ok) {
                setStructureError(response.error || 'Unknown issue getting structure.');
                return;
            }
            // Handle new structure format: response.structure.structuralElements
            const elements = response.structure?.structuralElements || response.structure || [];
            setStructure(elements);
            if (response.structure && response.structure.url) {
                setStructureMetadata({
                    url: response.structure.url,
                    title: response.structure.title
                });
            }
        });
    }, []);

    const showStructureBadges = useCallback((data = null) => {
        sendMessageToInspectedTab({ type: 'show-structure-badges', data }, () => { });
    }, []);

    const scrollToElement = useCallback((path) => {
        sendMessageToInspectedTab({ type: 'scroll-to-element', path }, () => { });
    }, []);

    const showStructureDiffOverlay = useCallback((diff) => {
        sendMessageToInspectedTab({ type: 'show-structure-diff-overlay', diff }, (response) => {
            if (response && response.ok) {
                setIsDiffOverlayVisible(true);
            }
        });
    }, []);

    const hideDiffOverlay = useCallback(() => {
        sendMessageToInspectedTab({ type: 'hide-tab-order-overlay' }, (response) => {
            if (response && response.ok) {
                setIsDiffOverlayVisible(false);
            }
        });
    }, []);

    return {
        structure,
        isLoadingStructure,
        structureError,
        runStructureScan,
        showStructureBadges,
        scrollToElement,
        showStructureDiffOverlay,
        hideDiffOverlay,
        setStructure,
        setStructureMetadata,
        structureMetadata,
        isDiffOverlayVisible
    };
};
