import React, { useEffect } from 'react';
import styles from './Dashboard.module.css';
import { useAxeRunner } from '../../hooks/useAxeRunner';

const Dashboard = () => {
    const { results, isScanning, error, runScan, highlightNode } = useAxeRunner();

    // Auto-run scan on mount (optional, or wait for user click)
    useEffect(() => {
        if (!results && !isScanning) {
            runScan();
        }
    }, []);

    const violations = results?.violations || [];
    const passes = results?.passes || [];
    const totalTests = violations.length + passes.length;

    // Calculate donut segments
    const violationCount = violations.length;
    const passCount = passes.length;
    const total = violationCount + passCount;
    const violationPercentage = total > 0 ? (violationCount / total) * 100 : 0;

    // Create conic gradient for donut
    const donutStyle = {
        background: `conic-gradient(var(--color-violation) 0% ${violationPercentage}%, var(--color-pass) ${violationPercentage}% 100%)`
    };

    return (
        <div className={styles.dashboard}>
            <div className={styles.chartSection}>
                {isScanning ? (
                    <div style={{ padding: 40 }}>Running accessibility scan...</div>
                ) : (
                    <>
                        <h3>Total tests performed: {totalTests}</h3>
                        <div className={styles.placeholderChart}>
                            <div className={styles.donut} style={donutStyle}>
                                <span className={styles.legend}>
                                    <div>● Passed: {passCount}</div>
                                    <div>● Violations: {violationCount}</div>
                                </span>
                            </div>
                        </div>
                        <div className={styles.actions}>
                            <button className={styles.tag}>WCAG 2.1 AA</button>
                            <button className={styles.btnSecondary} onClick={runScan}>Re-run Tests</button>
                            <button className={styles.btnIcon}>⬇</button>
                        </div>
                        {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
                    </>
                )}
            </div>

            <div className={styles.violationsSection}>
                <h4>Violations</h4>
                {violations.length === 0 && !isScanning && <div style={{ padding: 20, textAlign: 'center' }}>No violations found!</div>}

                {violations.map((violation) => (
                    <ViolationCard key={violation.id} violation={violation} onHighlight={highlightNode} />
                ))}
            </div>
        </div>
    );
};

const ViolationCard = ({ violation, onHighlight }) => {
    const [expanded, setExpanded] = React.useState(false);

    return (
        <div className={styles.violationCard}>
            <div className={styles.violationHeader} onClick={() => setExpanded(!expanded)}>
                <span>{violation.help}</span>
                <span>{expanded ? '▼' : '▶'}</span>
            </div>
            {expanded && (
                <div className={styles.violationContent}>
                    {violation.nodes.map((node, index) => (
                        <div key={index} style={{ marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                            <div className={styles.pagination}>Node {index + 1} of {violation.nodes.length}</div>
                            <button className={styles.btnHighlight} onClick={(e) => { e.stopPropagation(); onHighlight(node.target); }}>
                                ◎ Highlight
                            </button>
                            <div className={styles.codeBlock}>
                                {node.html}
                            </div>
                            <div className={styles.fixMessage}>
                                {node.failureSummary}
                            </div>
                        </div>
                    ))}
                    <div className={styles.tags}>
                        <span className={`${styles.tag} ${violation.impact === 'critical' || violation.impact === 'serious' ? styles.tagCritical : ''}`}>
                            Impact : {violation.impact}
                        </span>
                        <span className={styles.tag}>{violation.id}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
