import React from 'react';
import styles from './Dashboard.module.css';
import ItemViewer from './ItemViewer';

const CategoryPanel = ({
    title,
    count,
    items,
    isOpen,
    onToggle,
    activeIndex,
    onPrev,
    onNext,
    onHighlight,
    highlightedItemId
}) => (
    <div className={styles['category-panel']}>
        <button className={styles['category-header']} aria-expanded={isOpen} onClick={onToggle} type="button">
            <span>{title}</span>
            <div className={styles['count-group']}>
                <span className={styles['count-pill']}>{count}</span>
                <span className={`${styles.chevron} ${isOpen ? styles.open : ''}`} aria-hidden>
                    ▾
                </span>
            </div>
        </button>
        {isOpen && (
            <div className={styles['category-body']}>
                {items.length ? (
                    <ItemViewer
                        item={items[activeIndex]}
                        index={activeIndex}
                        total={items.length}
                        onPrev={onPrev}
                        onNext={onNext}
                        onHighlight={() => onHighlight(items[activeIndex])}
                        highlightedItemId={highlightedItemId}
                    />
                ) : (
                    <p className={styles['empty-copy']}>No entries to display.</p>
                )}
            </div>
        )}
    </div>
);

export default CategoryPanel;

