import React, { useEffect, useState } from 'react';
import styles from './StructurePanel.module.css';
import { useAccessibility } from '../../context/AccessibilityContext';

const StructurePanel = () => {
    const { structure: structureContext } = useAccessibility();
    const [isAllShown, setIsAllShown] = useState(true);

    const {
        structure,
        isLoadingStructure,
        structureError,
        runStructureScan,
        showStructureBadges,
        scrollToElement,
        clearStructureBadges
    } = structureContext;

    useEffect(() => {
        // Run structure scan when component mounts
        runStructureScan();

        // Cleanup: Clear highlights when panel unmounts
        return () => {
            clearStructureBadges();
        };
    }, [runStructureScan, clearStructureBadges]);

    // Auto-show badges if isAllShown is true and structure loads
    useEffect(() => {
        if (structure && structure.length > 0 && isAllShown) {
            showStructureBadges();
        }
    }, [structure, showStructureBadges, isAllShown]);

    const handleToggle = () => {
        if (isAllShown) {
            clearStructureBadges();
            setIsAllShown(false);
        } else {
            showStructureBadges();
            setIsAllShown(true);
        }
    };

    const handleItemClick = (item) => {
        if (item.path) {
            scrollToElement(item.path);
            setIsAllShown(false); // Single selection mode implies not "All Shown"
        }
    };

    if (isLoadingStructure) return <div className={styles.container}>Loading structure...</div>;
    if (structureError) return <div className={styles.container}>Error: {structureError}</div>;
    if (!structure || structure.length === 0) return <div className={styles.container}>No structural elements found.</div>;

    return (
        <div className={styles.container}>
            <div className={styles.headerRow} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div className={styles.title} style={{ margin: 0 }}>Structure</div>
                <button
                    onClick={handleToggle}
                    style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        backgroundColor: isAllShown ? '#555' : '#005a9c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px'
                    }}
                >
                    {isAllShown ? 'Hide All' : 'Show All'}
                </button>
            </div>
            <div className={styles.list}>
                {structure.map((item, index) => (
                    <StructureItem key={index} item={item} onItemClick={handleItemClick} />
                ))}
            </div>
        </div>
    );
};

const StructureItem = ({ item, onItemClick }) => {
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
        if (onItemClick) {
            onItemClick(item);
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
