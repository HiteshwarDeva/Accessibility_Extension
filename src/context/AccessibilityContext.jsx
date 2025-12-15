import React, { createContext, useContext } from 'react';
import { useAxeRunner } from '../hooks/useAxeRunner';
import { useTabOrder } from '../hooks/useTabOrder';
import { useStructure } from '../hooks/useStructure';

const AccessibilityContext = createContext(null);

/**
 * Unified context provider that combines Axe, Tab Order, and Structure functionality
 * This provides a single source of truth for all accessibility testing features
 */
export const AccessibilityProvider = ({ children }) => {
    // Get data from all hooks
    const axeData = useAxeRunner();
    const tabOrderData = useTabOrder();
    const structureData = useStructure();

    // Combine all into a single context value
    const contextValue = {
        // Axe runner data (for Details and Contrast sections)
        axe: {
            results: axeData.results,
            isScanning: axeData.isScanning,
            error: axeData.error,
            runScan: axeData.runScan,
            highlightNode: axeData.highlightNode,
            clearHighlights: axeData.clearHighlights,
            highlightTargetsContrast: axeData.highlightTargetsContrast,
            clearHighlightsContrast: axeData.clearHighlightsContrast,
            toggleHighlight: axeData.toggleHighlight
        },
        // Tab order data (for Order section)
        tabOrder: {
            orderData: tabOrderData.orderData,
            isScanningTabOrder: tabOrderData.isScanningTabOrder,
            tabOrderError: tabOrderData.tabOrderError,
            overlayVisible: tabOrderData.overlayVisible,
            runTabOrderScan: tabOrderData.runTabOrderScan,
            showOverlay: tabOrderData.showOverlay,
            hideOverlay: tabOrderData.hideOverlay,
            highlightElement: tabOrderData.highlightElement
        },
        // Structure data (for Structure section)
        structure: {
            structure: structureData.structure,
            isLoadingStructure: structureData.isLoadingStructure,
            structureError: structureData.structureError,
            runStructureScan: structureData.runStructureScan,
            showStructureBadges: structureData.showStructureBadges,
            scrollToElement: structureData.scrollToElement,
            clearStructureBadges: structureData.clearStructureBadges
        }
    };

    return (
        <AccessibilityContext.Provider value={contextValue}>
            {children}
        </AccessibilityContext.Provider>
    );
};

/**
 * Hook to access the unified accessibility context
 * @returns {Object} Combined accessibility data and functions
 */
export const useAccessibility = () => {
    const context = useContext(AccessibilityContext);
    if (!context) {
        throw new Error('useAccessibility must be used within an AccessibilityProvider');
    }
    return context;
};

/**
 * Legacy hook for backward compatibility with existing code
 * @deprecated Use useAccessibility().axe instead
 */
export const useRunner = () => {
    const context = useContext(AccessibilityContext);
    if (!context) {
        throw new Error('useRunner must be used within an AccessibilityProvider');
    }
    return context.axe;
};
