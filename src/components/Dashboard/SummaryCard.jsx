import React from 'react';
import styles from './Dashboard.module.css';

const percentage = (value, total) => (total === 0 ? 0 : Math.round((value / total) * 100));

const SummaryCard = ({ summary, onReRun, onDownloadReport }) => {
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
                    <button className={`${styles.btn} ${styles['icon-btn']}`} onClick={onDownloadReport} aria-label="Download report">
                        ⬇️
                    </button>
                </div>
            </div>
        </section>
    );
};

export default SummaryCard;

