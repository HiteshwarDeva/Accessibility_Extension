import React, { useEffect, useState } from 'react';
import styles from './Dashboard.module.css';
import SummaryCard from './SummaryCard';
import CategoryPanel from './CategoryPanel';

const DetailsSection = ({ summary, violations, passed, onHighlight, onReRun, onDownloadReport, highlightedItemId }) => {
    const [openViolationIndex, setOpenViolationIndex] = useState(violations.length ? 0 : -1);
    const [openPassedIndex, setOpenPassedIndex] = useState(passed.length ? 0 : -1);
    const [violationItemIndexes, setViolationItemIndexes] = useState(Array(violations.length).fill(0));
    const [passedItemIndexes, setPassedItemIndexes] = useState(Array(passed.length).fill(0));

    const cycleIndex = (items, current, direction) => {
        if (items.length <= 1) return current ?? 0;
        return (current + direction + items.length) % items.length;
    };

    const updateIndex = (setter, idx, direction, source) =>
        setter((prev) => {
            if (!source[idx]) return prev;
            const next = [...prev];
            next[idx] = cycleIndex(source[idx].items, prev[idx] ?? 0, direction);
            return next;
        });

    useEffect(() => {
        setViolationItemIndexes(Array(violations.length).fill(0));
        setPassedItemIndexes(Array(passed.length).fill(0));
        setOpenViolationIndex(violations.length ? 0 : -1);
        setOpenPassedIndex(passed.length ? 0 : -1);
    }, [violations, passed]);

    return (
        <main className={styles['content-grid']}>
            <SummaryCard summary={summary} onReRun={onReRun} onDownloadReport={onDownloadReport} />

            <section className={styles.panel}>
                <h2 className={styles['panel-title']}>Violations</h2>
                {violations.length === 0 && <p className={styles['empty-copy']}>No violations detected 🎉</p>}
                {violations.map((violation, index) => (
                    <CategoryPanel
                        key={violation.category}
                        title={violation.category}
                        count={violation.count}
                        items={violation.items}
                        isOpen={openViolationIndex === index}
                        onToggle={() => setOpenViolationIndex((prev) => (prev === index ? -1 : index))}
                        activeIndex={violationItemIndexes[index] ?? 0}
                        onPrev={() => updateIndex(setViolationItemIndexes, index, -1, violations)}
                        onNext={() => updateIndex(setViolationItemIndexes, index, 1, violations)}
                        onHighlight={(item) => onHighlight(item)}
                        highlightedItemId={highlightedItemId}
                    />
                ))}
            </section>

            <section className={styles.panel}>
                <h2 className={styles['panel-title']}>Success</h2>
                {passed.length === 0 && <p className={styles['empty-copy']}>No passing rules yet.</p>}
                {passed.map((item, index) => (
                    <CategoryPanel
                        key={item.category}
                        title={item.category}
                        count={item.count}
                        items={item.items}
                        isOpen={openPassedIndex === index}
                        onToggle={() => setOpenPassedIndex((prev) => (prev === index ? -1 : index))}
                        activeIndex={passedItemIndexes[index] ?? 0}
                        onPrev={() => updateIndex(setPassedItemIndexes, index, -1, passed)}
                        onNext={() => updateIndex(setPassedItemIndexes, index, 1, passed)}
                        onHighlight={(entry) => onHighlight(entry)}
                        highlightedItemId={highlightedItemId}
                    />
                ))}
            </section>
        </main>
    );
};

export default DetailsSection;

