import React, { useEffect, useMemo, useState } from 'react';
import styles from './Dashboard.module.css';
import { useAxeRunner } from '../../hooks/useAxeRunner';

const ImpactBadge = ({ impact }) => {
    if (!impact) return null;
    const level = impact.toLowerCase();
    return (
        <span className={`${styles['impact-badge']} ${styles[`impact-${level}`] || ''}`}>
            {impact}
        </span>
    );
};

const TagList = ({ tags }) => (
    <div className={styles['tag-list']}>
        {(tags || []).length ? (
            tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                    {tag}
                </span>
            ))
        ) : (
            <span className={styles.tag}>No tags</span>
        )}
    </div>
);

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

const CategoryPanel = ({
    title,
    count,
    items,
    isOpen,
    onToggle,
    activeIndex,
    onPrev,
    onNext,
    onHighlight
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
                    />
                ) : (
                    <p className={styles['empty-copy']}>No entries to display.</p>
                )}
            </div>
        )}
    </div>
);

const percentage = (value, total) => (total === 0 ? 0 : Math.round((value / total) * 100));

const SummaryCard = ({ summary, onReRun }) => {
    const passedPercent = percentage(summary.passed, summary.total_tests);
    const chartStyle = {
        backgroundImage: `conic-gradient(var(--green) 0 ${passedPercent}%, var(--orange) ${passedPercent}% 100%)`
    };

    return (
        <section className={styles['summary-card']} style={{ '--green': '#22c55e', '--orange': '#f97316' }}>
            <div className={styles['summary-top']}>
                <p className={styles['summary-title']}>Total tests performed: {summary.total_tests}</p>
                <span className={styles.badge}>WCAG 2.1 AA</span>
            </div>
            <div className={styles['summary-content']}>
                <div
                    className={styles['summary-chart']}
                    role="img"
                    aria-label={`${summary.passed} passed, ${summary.violations} violations`}
                    style={chartStyle}
                />
                <div className={styles['summary-list']}>
                    <p>
                        <span className={`${styles.dot} ${styles['dot-green']}`} />
                        Passed: <strong>{summary.passed}</strong>
                    </p>
                    <p>
                        <span className={`${styles.dot} ${styles['dot-orange']}`} />
                        Violations: <strong>{summary.violations}</strong>
                    </p>
                </div>
            </div>
            <div className={styles['summary-url-pill']}>
                <span>{summary.url}</span>
            </div>
            <div className={styles['summary-footer']}>
                <div className={styles['summary-meta']}>
                    <span className={styles['summary-timestamp']}>
                        Last scan · {new Date(summary.timestamp).toLocaleString()}
                    </span>
                </div>
                <div className={styles['summary-buttons']}>
                    <button className={`${styles.btn} ${styles['btn-secondary']}`} onClick={onReRun}>
                        Re-run Tests
                    </button>
                    <button className={`${styles.btn} ${styles['icon-btn']}`} aria-label="Download report">
                        ⬇️
                    </button>
                </div>
            </div>
        </section>
    );
};

const DetailsSection = ({ summary, violations, passed, onHighlight, onReRun }) => {
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
            <SummaryCard summary={summary} onReRun={onReRun} />

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
                    />
                ))}
            </section>
        </main>
    );
};

const buildSummary = (results) => {
    const passed = results?.passes?.length || 0;
    const violations = results?.violations?.length || 0;
    return {
        total_tests: passed + violations,
        passed,
        violations,
        url: results?.url || (typeof window !== 'undefined' ? window.location.href : 'Current page'),
        timestamp: results?.timestamp || Date.now()
    };
};

const normalizeNodes = (entry) => {
    if (Array.isArray(entry?.nodes) && entry.nodes.length) {
        return entry.nodes;
    }
    return [
        {
            html: entry?.html || '',
            target: entry?.target || [],
            failureSummary: entry?.description || ''
        }
    ];
};

const formatCategories = (entries, type) =>
    (entries || []).map((entry) => {
        const nodes = normalizeNodes(entry);
        return {
            category: entry.help || entry.description || entry.id || 'Untitled rule',
            count: nodes.length,
            items: nodes.map((node, idx) => ({
                description: entry.description || entry.help || entry.id || `Rule ${idx + 1}`,
                element_location: Array.isArray(node.target) && node.target.length ? node.target.join(' ') : 'Selector not available',
                help: node.failureSummary || entry.help || entry.description || '',
                impact: type === 'violations' ? entry.impact || 'moderate' : 'pass',
                wcag_tags: entry.tags || [],
                code_snippet: node.html || '',
                selectors: node.target || []
            }))
        };
    });

const Dashboard = () => {
    const { results, isScanning, error, runScan, highlightNode } = useAxeRunner();
    const hasResults = Boolean(results);

    useEffect(() => {
        if (!results && !isScanning) {
            runScan();
        }
    }, [results, isScanning, runScan]);

    const summary = useMemo(() => buildSummary(results || {}), [results]);
    const violationCategories = useMemo(() => formatCategories(results?.violations || [], 'violations'), [results]);
    const successCategories = useMemo(() => formatCategories(results?.passes || [], 'passes'), [results]);

    const handleHighlight = (item) => {
        if (!item?.selectors?.length) return;
        highlightNode(item.selectors);
    };

    return (
        <div className={styles.dashboard}>
            {isScanning && (
                <div className={styles.statusMessage}>
                    <p>Running accessibility scan...</p>
                </div>
            )}

            {!isScanning && !hasResults && (
                <div className={styles.emptyState}>
                    <p>Trigger a scan to view accessibility insights.</p>
                    <button className={styles.primaryBtn} type="button" onClick={runScan}>
                        Run Tests
                    </button>
                </div>
            )}

            {hasResults && (
                <DetailsSection
                    summary={summary}
                    violations={violationCategories}
                    passed={successCategories}
                    onHighlight={handleHighlight}
                    onReRun={runScan}
                />
            )}

            {error && <p className={styles.errorMessage}>{error}</p>}
        </div>
    );
};

export default Dashboard;
