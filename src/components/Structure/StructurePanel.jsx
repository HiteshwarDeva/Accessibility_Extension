import React, { useEffect } from 'react';
import styles from './StructurePanel.module.css';
import { useAccessibility } from '../../context/AccessibilityContext';
import Toast from '../Dashboard/Toast';

const StructurePanel = () => {
    const { structure: structureContext, axe, history } = useAccessibility();
    const {
        structure,
        isLoadingStructure,
        structureError,
        runStructureScan,
        showStructureBadges,
        scrollToElement,
        structureMetadata,
        setStructureMetadata
    } = structureContext;
    const { clearHighlights } = axe;
    const { saveScan, scanHistory, loadScanData } = history;
    const { setStructure } = structureContext;
    const [toastMessage, setToastMessage] = React.useState(null);

    const [isOverlayVisible, setIsOverlayVisible] = React.useState(false);

    useEffect(() => {
        // Run structure scan when component mounts
        runStructureScan();

        // Cleanup: Clear highlights when panel unmounts
        return () => {
            clearHighlights();
        };
    }, [runStructureScan, clearHighlights]);

    // Show badges after structure is loaded
    useEffect(() => {
        if (structure && structure.length > 0) {
            // Default to NOT showing badges automatically, let user toggle (requested "Add button")
            // Or if user wants auto-show, we can uncomment:
            // showStructureBadges();
            // setIsOverlayVisible(true);
        }
    }, [structure, showStructureBadges]);

    const toggleOverlay = () => {
        if (isOverlayVisible) {
            clearHighlights();
            setIsOverlayVisible(false);
        } else {
            showStructureBadges();
            setIsOverlayVisible(true);
        }
    };

    const handleSaveScan = async () => {
        if (!structure) return;
        try {
            const metadata = structureMetadata || {
                title: document.title,
                url: window.location.href
            };
            await saveScan('structure', structure, metadata);
            setToastMessage('Structure scan saved to history!');
        } catch (e) {
            console.error(e);
            setToastMessage('Failed to save scan.');
        }
    };

    if (isLoadingStructure) return <div className={styles.container}>Loading structure...</div>;

    const handleLoadPrevious = async () => {
        // Find most recent structure scan in history
        const previousScan = scanHistory
            .filter(s => s.type === 'structure')
            .sort((a, b) => b.timestamp - a.timestamp)[0];

        if (!previousScan) {
            setToastMessage('No previous Structure scans found.');
            return;
        }

        try {
            const fullScan = await loadScanData(previousScan.id);
            if (fullScan) {
                setStructure(fullScan.data);
                if (fullScan.metadata) setStructureMetadata(fullScan.metadata);
                showStructureBadges(fullScan.data);
                setIsOverlayVisible(true);
                setToastMessage('Previous Structure overlay loaded.');
            }
        } catch (e) {
            console.error(e);
            setToastMessage('Failed to load previous scan.');
        }
    };

    if (structureError) return (
        <div className={styles.container}>
            <p>Error: {structureError}</p>
            <button
                onClick={handleLoadPrevious}
                className={styles.overlayBtn}
                style={{ marginTop: '12px' }}
            >
                📂 Load Previous
            </button>
        </div>
    );

    if (!structure || structure.length === 0) return (
        <div className={styles.container}>
            <p>No structural elements found.</p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button onClick={runStructureScan} className={styles.overlayBtn}>🔄 Run Scan</button>
                <button onClick={handleLoadPrevious} className={styles.overlayBtn}>📂 Load Previous</button>
            </div>
        </div>
    );

    return (
        <div className={styles.container}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div className={styles.title} style={{ marginBottom: 0, borderBottom: 'none' }}>Structure</div> {/* Remove border/margin from title wrapper for alignment */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={handleSaveScan}
                        className={styles.overlayBtn}
                    >
                        💾 Save
                    </button>
                    <button
                        onClick={runStructureScan}
                        className={styles.overlayBtn}
                    >
                        🔄 Re-run Scan
                    </button>
                    <button
                        onClick={toggleOverlay}
                        className={`${styles.overlayBtn} ${isOverlayVisible ? styles.overlayBtnActive : ''}`}
                    >
                        {isOverlayVisible ? '👁️ Hide Overlay' : '👁️ Show Overlay'}
                    </button>
                </div>
            </div>
            <div className={styles.list}>
                {structure.map((item, index) => (
                    <StructureItem key={index} item={item} scrollToElement={scrollToElement} />
                ))}
            </div>

            {
                toastMessage && (
                    <Toast
                        message={toastMessage}
                        onClose={() => setToastMessage(null)}
                    />
                )
            }
        </div >
    );
};

const StructureItem = ({ item, scrollToElement }) => {
    // Adapt to new fields: tag, name, type, attributes
    // Fallback to old fields if present
    const tagName = item.tag || item.tagName;
    const text = item.name || item.text || '';
    const type = item.type || 'other';
    const attributes = item.attributes || {};

    // Determine icon and style based on tagName/type
    let icon = null;
    let iconClass = '';

    // Simple mapping for icons
    if (type === 'heading') {
        icon = <span>{tagName}</span>;
        iconClass = styles.iconH1; // Use generic H style or specific
    } else if (type === 'landmark' || type === 'region') {
        icon = <NavIcon />; // Generic landmark icon
        iconClass = styles.iconNav;
    } else if (tagName === 'button' || type === 'button') {
        icon = <span>Btn</span>;
        iconClass = styles.iconHeader;
    } else if (tagName === 'label') {
        icon = <span>Lbl</span>;
        iconClass = styles.iconHeader;
    } else {
        icon = <span>{tagName.substring(0, 2)}</span>;
        iconClass = styles.iconHeader;
    }

    // Indentation: use level from structure
    const level = typeof item.level === 'number' ? item.level : 0;
    const indentation = level * 16; // 16px per level

    // Construct label text including attributes if relevant
    let displayLabel = text;
    if (!displayLabel && attributes.ariaLabel) displayLabel = `[aria-label] ${attributes.ariaLabel}`;
    if (!displayLabel) displayLabel = `<${tagName}>`;

    const handleClick = () => {
        if (item.path) {
            scrollToElement(item.path);
        }
    };

    return (
        <div
            className={styles.item}
            title={JSON.stringify(attributes)}
            onClick={handleClick}
            style={{ cursor: 'pointer', marginLeft: `${indentation}px` }}
        >
            <div className={`${styles.iconWrapper} ${iconClass}`}>
                {icon}
            </div>
            <div className={styles.content}>
                <span className={styles.label}>{displayLabel}</span>
                {attributes.ariaLabel && <span className={styles.subLabel}>aria-label: {attributes.ariaLabel}</span>}
                {attributes.role && <span className={styles.subLabel}>role: {attributes.role}</span>}
            </div>
        </div>
    );
};

// Simple SVG Icons
const HeaderIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <rect x="2" y="4" width="20" height="6" rx="1" />
        <rect x="2" y="12" width="20" height="8" rx="1" opacity="0.5" />
    </svg>
);

const NavIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="6" width="16" height="2" rx="1" />
        <rect x="4" y="11" width="16" height="2" rx="1" />
        <rect x="4" y="16" width="16" height="2" rx="1" />
    </svg>
);

export default StructurePanel;
