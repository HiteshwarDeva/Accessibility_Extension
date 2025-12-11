import React from 'react';
import styles from './Dashboard.module.css';

const percentage = (value, total) => (total === 0 ? 0 : Math.round((value / total) * 100));



const SummaryCard = ({ summary, onReRun, onDownloadReport, showBestPractices, toggleBestPractices }) => {
    const passedPercent = percentage(summary.passed, summary.total_tests);
    const chartStyle = {
        backgroundImage: `conic-gradient(var(--green) 0 ${passedPercent}%, var(--orange) ${passedPercent}% 100%)`
    };

    // Calculate total issues based on toggle state
    const totalIssuesWithoutBP = summary.minor + summary.moderate + summary.serious + summary.critical;
    const totalIssuesWithBP = totalIssuesWithoutBP + summary.bestPracticesNodes;
    const displayTotalIssues = showBestPractices ? totalIssuesWithBP : totalIssuesWithoutBP;

    return (
        <section className={styles['summary-card']} style={{ '--green': '#22c55e', '--orange': '#f97316' }}>
            <div className={styles['summary-header']}>
                <p className={styles['summary-title']}>Accessibility Rules Tested: {summary.total_tests}</p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span className={styles.badge}>WCAG 2.1 AA</span>
                </div>
            </div>

            <div className={styles['summary-split-layout']}>
                {/* Left Side: Chart, Violations, Success, (Best Practices) */}
                <div className={styles['summary-left-panel']}>
                    <div className={styles['chart-container-vertical']}>
                        <div className={styles['summary-chart']} role="img" aria-label={`${summary.passed} passed, ${summary.violations} violations`} style={chartStyle} />
                    </div>

                    <div className={styles['left-content-stack']}>
                        {/* Violations */}
                        <div className={styles['total-item']} style={{ width: '100%' }}>
                            <span className={`${styles.dot} ${styles['dot-orange']}`} />
                            <span className={styles['total-label']}>Violations</span>
                            <span className={styles['total-value']}>{summary.violations}</span>
                        </div>

                        {/* Success */}
                        <div className={styles['total-item']} style={{ width: '100%' }}>
                            <span className={`${styles.dot} ${styles['dot-green']}`} />
                            <span className={styles['total-label']}>Passes</span>
                            <span className={styles['total-value']}>{summary.passed}</span>
                        </div>

                        {/* Best Practices with Toggle in Middle */}
                        <div className={styles['total-item']} style={{ width: '100%', borderColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className={styles['issue-label']}>Best Practices</span>
                                <button
                                    className={`${styles['toggle-btn']} ${showBestPractices ? styles['toggle-btn--active'] : ''}`}
                                    style={{
                                        padding: '6px 16px',
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        borderRadius: '6px',
                                        minHeight: '32px',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onClick={toggleBestPractices}
                                    aria-pressed={showBestPractices}
                                    aria-label={showBestPractices ? "Hide Best Practices section" : "Show Best Practices section"}
                                    title={showBestPractices ? "Hide Best Practices" : "Show Best Practices"}
                                >
                                    {showBestPractices ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            <span className={styles['total-value']}>{summary.bestPractices}</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Issue Counts (Using Node Counts) */}
                <div className={styles['summary-right-panel']}>
                    <div className={styles['issues-header']} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0 }}>Issues by Severity</h3>
                        <span className={styles.badge} style={{ background: '#fef3c7', color: '#92400e' }}>
                            Total: {displayTotalIssues}
                        </span>
                    </div>
                    <div className={styles['vertical-issue-list']}>
                        {showBestPractices && (
                            <div className={styles['issue-list-item']}>
                                <span className={styles['issue-name']}>Best Practices Issues</span>
                                <span className={styles['issue-value']}>{summary.bestPracticesNodes}</span>
                            </div>
                        )}
                        <div className={styles['issue-list-item']}>
                            <span className={styles['issue-name']}>Minor Issues</span>
                            <span className={styles['issue-value']}>{summary.minor}</span>
                        </div>
                        <div className={styles['issue-list-item']}>
                            <span className={styles['issue-name']}>Moderate Issues</span>
                            <span className={styles['issue-value']}>{summary.moderate}</span>
                        </div>
                        <div className={styles['issue-list-item']}>
                            <span className={styles['issue-name']}>Serious Issues</span>
                            <span className={styles['issue-value']}>{summary.serious}</span>
                        </div>
                        <div className={styles['issue-list-item']}>
                            <span className={styles['issue-name']}>Critical Issues</span>
                            <span className={styles['issue-value']}>{summary.critical}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles['summary-footer']}>
                <div className={styles['summary-meta']} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={styles['summary-timestamp']}>
                        Last scan · {new Date(summary.timestamp).toLocaleString()}
                    </span>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <div className={styles['summary-url-pill']} style={{ marginTop: 0, padding: '4px 12px', fontSize: '0.75rem' }}>
                        {summary.url}
                    </div>
                </div>
                <div className={styles['summary-buttons']}>
                    <button className={`${styles.btn} ${styles['btn-secondary']}`} onClick={onReRun}>
                        Re-run Tests
                    </button>
                    <button className={`${styles.btn} ${styles['icon-btn']}`} onClick={onDownloadReport} aria-label="Download accessibility report">
                        <span className={styles['download-icon']} aria-hidden="true">⬇</span>
                        <span>Download JSON</span>
                    </button>
                </div>
            </div>
        </section>
    );
};

export default SummaryCard;
