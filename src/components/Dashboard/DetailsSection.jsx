import React, { useEffect, useState } from 'react';
import styles from './Dashboard.module.css';
import SummaryCard from './SummaryCard';
import CategoryPanel from './CategoryPanel';

const DetailsSection = ({ summary, violations, bestPractices = [], passed, onHighlight, onReRun, onDownloadReport, highlightedItemId, showBestPractices, setShowBestPractices }) => {
    const ITEMS_PER_PAGE = 5;

    const [openViolationIndex, setOpenViolationIndex] = useState(violations.length ? 0 : -1);
    const [openBestPracticeIndex, setOpenBestPracticeIndex] = useState(bestPractices.length ? 0 : -1);
    const [openPassedIndex, setOpenPassedIndex] = useState(passed.length ? 0 : -1);

    const [violationItemIndexes, setViolationItemIndexes] = useState(Array(violations.length).fill(0));
    const [bestPracticeItemIndexes, setBestPracticeItemIndexes] = useState(Array(bestPractices.length).fill(0));
    const [passedItemIndexes, setPassedItemIndexes] = useState(Array(passed.length).fill(0));

    // Pagination state
    const [violationsPage, setViolationsPage] = useState(0);
    const [bestPracticesPage, setBestPracticesPage] = useState(0);
    const [successPage, setSuccessPage] = useState(0);

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
        setBestPracticeItemIndexes(Array(bestPractices.length).fill(0));
        setPassedItemIndexes(Array(passed.length).fill(0));

        setOpenViolationIndex(violations.length ? 0 : -1);
        setOpenBestPracticeIndex(bestPractices.length ? 0 : -1);
        setOpenPassedIndex(passed.length ? 0 : -1);

        // Reset pagination when data changes
        setViolationsPage(0);
        setBestPracticesPage(0);
        setSuccessPage(0);
    }, [violations, bestPractices, passed]);

    return (
        <main className={styles['content-grid']}>
            {/* Summary Card */}
            <SummaryCard
                summary={summary}
                onReRun={onReRun}
                onDownloadReport={onDownloadReport}
                showBestPractices={showBestPractices}
                toggleBestPractices={() => setShowBestPractices(prev => !prev)}
            />

            {/* Best Practices Section - Controlled by Toggle */}
            {showBestPractices && (
                <section className={`${styles.panel} ${styles['best-practices-section']}`}>
                    <h2 className={styles['panel-title']}>Best Practices</h2>
                    {bestPractices.length === 0 && <p className={styles['empty-copy']}>No best practice suggestions.</p>}
                    {bestPractices.length > 0 && (
                        <>
                            {bestPractices
                                .slice(bestPracticesPage * ITEMS_PER_PAGE, (bestPracticesPage + 1) * ITEMS_PER_PAGE)
                                .map((item, index) => {
                                    const actualIndex = bestPracticesPage * ITEMS_PER_PAGE + index;
                                    return (
                                        <CategoryPanel
                                            key={item.category}
                                            title={item.category}
                                            count={item.count}
                                            items={item.items}
                                            isOpen={openBestPracticeIndex === actualIndex}
                                            onToggle={() => setOpenBestPracticeIndex((prev) => (prev === actualIndex ? -1 : actualIndex))}
                                            activeIndex={bestPracticeItemIndexes[actualIndex] ?? 0}
                                            onPrev={() => updateIndex(setBestPracticeItemIndexes, actualIndex, -1, bestPractices)}
                                            onNext={() => updateIndex(setBestPracticeItemIndexes, actualIndex, 1, bestPractices)}
                                            onHighlight={(entry) => onHighlight(entry)}
                                            highlightedItemId={highlightedItemId}
                                        />
                                    );
                                })}
                            {bestPractices.length > ITEMS_PER_PAGE && (
                                <div className={styles['pagination-controls']}>
                                    <button
                                        className={styles['pagination-btn']}
                                        onClick={() => setBestPracticesPage(prev => prev - 1)}
                                        disabled={bestPracticesPage === 0}
                                    >
                                        ← Previous
                                    </button>
                                    <span className={styles['pagination-info']}>
                                        Page {bestPracticesPage + 1} of {Math.ceil(bestPractices.length / ITEMS_PER_PAGE)}
                                    </span>
                                    <button
                                        className={styles['pagination-btn']}
                                        onClick={() => setBestPracticesPage(prev => prev + 1)}
                                        disabled={(bestPracticesPage + 1) * ITEMS_PER_PAGE >= bestPractices.length}
                                    >
                                        Next →
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </section>
            )}

            {/* Violations Section */}
            <section className={`${styles.panel} ${styles['violations-section']}`}>
                <h2 className={styles['panel-title']}>Violations</h2>
                {violations.length === 0 && <p className={styles['empty-copy']}>No violations detected 🎉</p>}
                {violations.length > 0 && (
                    <>
                        {violations
                            .slice(violationsPage * ITEMS_PER_PAGE, (violationsPage + 1) * ITEMS_PER_PAGE)
                            .map((violation, index) => {
                                const actualIndex = violationsPage * ITEMS_PER_PAGE + index;
                                return (
                                    <CategoryPanel
                                        key={violation.category}
                                        title={violation.category}
                                        count={violation.count}
                                        items={violation.items}
                                        isOpen={openViolationIndex === actualIndex}
                                        onToggle={() => setOpenViolationIndex((prev) => (prev === actualIndex ? -1 : actualIndex))}
                                        activeIndex={violationItemIndexes[actualIndex] ?? 0}
                                        onPrev={() => updateIndex(setViolationItemIndexes, actualIndex, -1, violations)}
                                        onNext={() => updateIndex(setViolationItemIndexes, actualIndex, 1, violations)}
                                        onHighlight={(item) => onHighlight(item)}
                                        highlightedItemId={highlightedItemId}
                                    />
                                );
                            })}
                        {violations.length > ITEMS_PER_PAGE && (
                            <div className={styles['pagination-controls']}>
                                <button
                                    className={styles['pagination-btn']}
                                    onClick={() => setViolationsPage(prev => prev - 1)}
                                    disabled={violationsPage === 0}
                                >
                                    ← Previous
                                </button>
                                <span className={styles['pagination-info']}>
                                    Page {violationsPage + 1} of {Math.ceil(violations.length / ITEMS_PER_PAGE)}
                                </span>
                                <button
                                    className={styles['pagination-btn']}
                                    onClick={() => setViolationsPage(prev => prev + 1)}
                                    disabled={(violationsPage + 1) * ITEMS_PER_PAGE >= violations.length}
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* Success Section */}
            <section className={`${styles.panel} ${styles['success-section']}`}>
                <h2 className={styles['panel-title']}>Success</h2>
                {passed.length === 0 && <p className={styles['empty-copy']}>No passing rules yet.</p>}
                {passed.length > 0 && (
                    <>
                        {passed
                            .slice(successPage * ITEMS_PER_PAGE, (successPage + 1) * ITEMS_PER_PAGE)
                            .map((item, index) => {
                                const actualIndex = successPage * ITEMS_PER_PAGE + index;
                                return (
                                    <CategoryPanel
                                        key={item.category}
                                        title={item.category}
                                        count={item.count}
                                        items={item.items}
                                        isOpen={openPassedIndex === actualIndex}
                                        onToggle={() => setOpenPassedIndex((prev) => (prev === actualIndex ? -1 : actualIndex))}
                                        activeIndex={passedItemIndexes[actualIndex] ?? 0}
                                        onPrev={() => updateIndex(setPassedItemIndexes, actualIndex, -1, passed)}
                                        onNext={() => updateIndex(setPassedItemIndexes, actualIndex, 1, passed)}
                                        onHighlight={(entry) => onHighlight(entry)}
                                        highlightedItemId={highlightedItemId}
                                    />
                                );
                            })}
                        {passed.length > ITEMS_PER_PAGE && (
                            <div className={styles['pagination-controls']}>
                                <button
                                    className={styles['pagination-btn']}
                                    onClick={() => setSuccessPage(prev => prev - 1)}
                                    disabled={successPage === 0}
                                >
                                    ← Previous
                                </button>
                                <span className={styles['pagination-info']}>
                                    Page {successPage + 1} of {Math.ceil(passed.length / ITEMS_PER_PAGE)}
                                </span>
                                <button
                                    className={styles['pagination-btn']}
                                    onClick={() => setSuccessPage(prev => prev + 1)}
                                    disabled={(successPage + 1) * ITEMS_PER_PAGE >= passed.length}
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>
        </main>
    );
};

export default DetailsSection;

