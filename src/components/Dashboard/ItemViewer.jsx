import React from 'react';
import styles from './Dashboard.module.css';
import ImpactBadge from './ImpactBadge';
import TagList from './TagList';

const ItemViewer = ({ item, index, total, onPrev, onNext, onHighlight }) => {
    if (!item) {
        return <p className={styles['empty-copy']}>No details available for this rule.</p>;
    }

    return (
        <div className={styles['item-card']}>
            <div className={styles['item-card-header']}>
                <span className={styles['item-progress']}>
                    {index + 1} of {total}
                </span>
                <div className={styles['item-actions']}>
                    <button className={styles['highlight-btn']} type="button" onClick={onHighlight}>
                        Highlight
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
            {item.help && <p className={styles['item-help']}>{item.help}</p>}
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

