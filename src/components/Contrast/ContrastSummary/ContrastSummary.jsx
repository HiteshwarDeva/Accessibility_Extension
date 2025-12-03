import React from 'react';
import styles from '../Contrast.module.css';

const ContrastSummary = ({ violations = [], passes = [] }) => {
    console.log(violations, passes);
    const calculateStats = (tag) => {
        // Filter by specific contrast rule ID and the requested tag (AA/AAA)
        // We sum the number of nodes (elements) rather than just counting the rule itself
        const getCount = (list) => list
            .filter(item => item.id === 'color-contrast' && item.tags.includes(tag))
            .reduce((acc, item) => acc + (item.nodes ? item.nodes.length : 0), 0);

        const passedCount = getCount(passes);
        const failedCount = getCount(violations);

        const total = passedCount + failedCount;
        const percentage = total === 0 ? 0 : Math.round((passedCount / total) * 100);

        return { passed: passedCount, failed: failedCount, total, percentage };
    };

    const aaStats = calculateStats('wcag2aa');
    const aaaStats = calculateStats('wcag2aaa');

    const renderPieChart = (stats) => {
        const degree = (stats.percentage / 100) * 360;
        return {
            background: `conic-gradient(#4CAF50 0deg ${degree}deg, #F44336 ${degree}deg 360deg)`
        };
    };

    return (
        <div className={styles.contrastContainer}>
            <div className={styles.checkerSection}>
                <h3>Contrast Summary</h3>
                <p className={styles.description}>WCAG compliance statistics for tested pairs</p>

                <div style={{ display: 'flex', justifyContent: 'space-around', margin: '20px 0' }}>
                    <div style={{ textAlign: 'center' }}>
                        <h4>AA Standard</h4>
                        <div style={{
                            width: 100, height: 100, borderRadius: '50%',
                            ...renderPieChart(aaStats),
                            margin: '10px auto'
                        }}></div>
                        <div>{aaStats.passed} / {aaStats.total} passed</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{aaStats.percentage}% compliant</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <h4>AAA Standard</h4>
                        <div style={{
                            width: 100, height: 100, borderRadius: '50%',
                            ...renderPieChart(aaaStats),
                            margin: '10px auto'
                        }}></div>
                        <div>{aaaStats.passed} / {aaaStats.total} passed</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{aaaStats.percentage}% compliant</div>
                    </div>
                </div>

                <h4>Tested Color Pairs</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Placeholder for individual color pair rows if needed, or remove if not applicable to general stats */}
                    <p style={{ color: '#666', fontStyle: 'italic' }}>Detailed color pair analysis is available in the Dashboard.</p>
                </div>
            </div>
        </div>
    );
};

const ColorPairRow = ({ fg, bg, ratio, aa, aaa }) => (
    <div style={{ border: '1px solid #eee', padding: 10, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, background: fg, border: '1px solid #ccc' }}></div>
            <span>→</span>
            <div style={{ width: 30, height: 30, background: bg, border: '1px solid #ccc' }}></div>
            <div style={{ marginLeft: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 'bold' }}>Contrast Ratio</div>
                <div>{ratio}</div>
            </div>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
            <span className={`${styles.badge} ${aa ? styles.pass : ''}`} style={{ background: aa ? '#4CAF50' : '#F44336' }}>{aa ? 'AA Passed' : 'AA Failed'}</span>
            <span className={`${styles.badge} ${aaa ? styles.pass : ''}`} style={{ background: aaa ? '#4CAF50' : '#F44336' }}>{aaa ? 'AAA Passed' : 'AAA Failed'}</span>
        </div>
    </div>
);

export default ContrastSummary;
