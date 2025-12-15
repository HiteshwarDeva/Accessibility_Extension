import { useState, useCallback } from 'react';
import { sendMessageToInspectedTab } from '../utils/messageHelpers';

export const useStructure = () => {
    const [structure, setStructure] = useState(null);
    const [isLoadingStructure, setIsLoadingStructure] = useState(false);
    const [structureError, setStructureError] = useState(null);

    const runStructureScan = useCallback(() => {
        setIsLoadingStructure(true);
        setStructureError(null);
        setStructure(null);

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
        });
    }, []);

    const showStructureBadges = useCallback(() => {
        sendMessageToInspectedTab({ type: 'show-structure-badges' }, () => { });
    }, []);

    const scrollToElement = useCallback((path) => {
        sendMessageToInspectedTab({ type: 'scroll-to-element', path }, () => { });
    }, []);

    const clearStructureBadges = useCallback(() => {
        sendMessageToInspectedTab({ type: 'clear-highlights' }, () => { });
    }, []);

    return {
        structure,
        isLoadingStructure,
        structureError,
        runStructureScan,
        showStructureBadges,
        scrollToElement,
        clearStructureBadges
    };
};
