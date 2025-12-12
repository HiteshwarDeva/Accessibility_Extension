import React from 'react';
import styles from './Dashboard.module.css';
import ImpactBadge from './ImpactBadge';
import TagList from './TagList';

const parseHelpSections = (helpText = '') => {
    const lines = helpText.split('\n');
    const sections = [];
    let current = null;

    lines.forEach((line) => {
        const trimmed = line.trim();

        if (!trimmed) {
            if (current) {
                sections.push(current);
                current = null;
            }
            return;
        }

        if (!current) {
            current = { title: trimmed, items: [] };
            return;
        }

        current.items.push(trimmed);
    });

    if (current) {
        sections.push(current);
    }

    return sections;
};

const HelpCallout = ({ help }) => {
    const sections = parseHelpSections(help);

    if (!sections.length) {
        return null;
    }

    return (
        <div className={styles['help-card']} role="note" aria-label="How to fix">
            {sections.map((section, sectionIndex) => (
                <div key={`${section.title}-${sectionIndex}`} className={styles['help-section']}>
                    <p className={styles['help-title']}>{section.title}</p>
                    {section.items.length > 0 && (
                        <ul className={styles['help-list']}>
                            {section.items.map((entry, entryIndex) => (
                                <li key={`${entry}-${entryIndex}`}>{entry}</li>
                            ))}
                        </ul>
                    )}
                </div>
            ))}
        </div>
    );
};

const ItemViewer = ({ item, index, total, onPrev, onNext, onHighlight, highlightedItemId }) => {
    if (!item) {
        return <p className={styles['empty-copy']}>No details available for this rule.</p>;
    }

    const itemId = `${item.element_location || ''}-${item.description || ''}`;
    const isHighlighted = highlightedItemId === itemId;

    return (
        <div className={styles['item-card']}>
            <div className={styles['item-card-header']}>
                <span className={styles['item-progress']}>
                    {index + 1} of {total}
                </span>
                <div className={styles['item-actions']}>
                    <button
                        className={`${styles['highlight-btn']} ${isHighlighted ? styles.active : ''}`}
                        type="button"
                        onClick={onHighlight}
                        aria-pressed={isHighlighted}
                    >
                        {isHighlighted ? 'Remove Highlight' : 'Highlight'}
                    </button>
                    <div className={styles['item-nav']}>
                        <button className={styles['nav-btn']} onClick={onPrev} disabled={total <= 1} aria-label="Previous item">
                            ‹
                        </button>
                        <button className={styles['nav-btn']} onClick={onNext} disabled={total <= 1} aria-label="Next item">
                            ›
                        </button>
                    </div>
                </div>
            </div>
            <p className={styles['item-title']}>{item.description}</p>
            <pre className={styles['code-snippet']} aria-label="Element location">
                {item.element_location || 'Selector not available'}
            </pre>
            {item.help && <HelpCallout help={item.help} />}
            <div className={styles['item-meta']}>
                <ImpactBadge impact={item.impact} />
                <TagList tags={item.wcag_tags} />
            </div>
            <details className={styles['code-details']}>
                <summary>Code snippet</summary>
                <pre>{item.code_snippet || 'No snippet provided'}</pre>
            </details>
        </div>
    );
};

export default ItemViewer;

