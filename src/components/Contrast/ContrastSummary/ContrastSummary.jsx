import React, { useState } from 'react';
import styles from '../Contrast.module.css';
import ContrastChecker from '../ContrastChecker/ContrastChecker';

const ContrastSummary = ({ violations = [], passes = [], highlightNode, clearHighlights }) => {
    const [expandedIndex, setExpandedIndex] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all', 'aa', 'aaa'

    // Helper to extract color data from nodes
    const extractColorData = (list, isViolation) => {
        const contrastRule = list.find(item => item.id === 'color-contrast');
        if (!contrastRule || !contrastRule.nodes) return [];

        return contrastRule.nodes.map(node => {
            // Find the specific color-contrast check data
            const check = node.any.find(item => item.id === 'color-contrast');
            if (!check || !check.data) return null;

            const { fgColor, bgColor, contrastRatio, fontSize, fontWeight } = check.data;

            // Determine AA/AAA pass status
            // Logic based on WCAG 2.0:
            // AA: 4.5:1 for normal text, 3:1 for large text
            // AAA: 7:1 for normal text, 4.5:1 for large text
            // Large text is defined as 14pt (approx 18.66px) bold or 18pt (approx 24px) normal

            // Parse font size to number (assuming "12pt (16px)" format or similar)
            const sizeMatch = fontSize ? fontSize.match(/\((\d+(\.\d+)?)px\)/) : null;
            const sizePx = sizeMatch ? parseFloat(sizeMatch[1]) : 16; // Default to 16 if unknown
            const isBold = fontWeight === 'bold' || parseInt(fontWeight) >= 700;
            const isLarge = sizePx >= 24 || (sizePx >= 18.66 && isBold);

            const ratio = parseFloat(contrastRatio);

            const aaPassed = ratio >= (isLarge ? 3.0 : 4.5);
            const aaaPassed = ratio >= (isLarge ? 4.5 : 7.0);

            return {
                fg: fgColor,
                bg: bgColor,
                ratio: ratio,
                aa: aaPassed,
                aaa: aaaPassed,
                isLarge,
                isViolation, // Mark as violation if it came from the violations list (though individual checks might vary, usually if it's in violations, it failed something)
                target: node.target // Include the target for highlighting
            };
        }).filter(item => item !== null);
    };

    const violationPairs = extractColorData(violations, true);
    const passPairs = extractColorData(passes, false);

    // Combine, filter, and sort
    const allPairs = [...violationPairs, ...passPairs]
        .filter(pair => pair.fg && pair.bg && !isNaN(pair.ratio)) // Filter invalid data
        .filter(pair => {
            if (filter === 'aa') return !pair.aa;
            if (filter === 'aaa') return !pair.aaa;
            return true;
        })
        .sort((a, b) => {
            if (filter === 'aa' || filter === 'aaa') {
                // For failures, sort by contrast ratio ascending (worst first)
                return a.ratio - b.ratio;
            } else {
                // Default 'all': Sort by score (both passed -> one passed -> both failed)
                const getScore = (p) => {
                    if (p.aa && p.aaa) return 2;
                    if (p.aa) return 1;
                    return 0;
                };
                return getScore(a) - getScore(b);
            }
        });

    const calculateStatsFromPairs = (pairs, type) => {
        const total = pairs.length;
        const passedCount = pairs.filter(p => p[type]).length;
        const failedCount = total - passedCount;
        const percentage = total === 0 ? 0 : Math.round((passedCount / total) * 100);
        return { passed: passedCount, failed: failedCount, total, percentage };
    };

    const aaStats = calculateStatsFromPairs(allPairs, 'aa');
    const aaaStats = calculateStatsFromPairs(allPairs, 'aaa');

    const renderPieChart = (stats) => {
        const degree = (stats.percentage / 100) * 360;
        return {
            background: `conic-gradient(#4CAF50 0deg ${degree}deg, #F44336 ${degree}deg 360deg)`
        };
    };

    const handleRowClick = (index) => {
        const newExpandedIndex = expandedIndex === index ? null : index;
        setExpandedIndex(newExpandedIndex);

        if (newExpandedIndex !== null) {
            // Expanded a row
            const pair = allPairs[newExpandedIndex];
            if (pair && pair.target && highlightNode) {
                highlightNode(pair.target);
            }
        } else {
            // Collapsed only -> clear
            if (clearHighlights) {
                clearHighlights();
            }
        }
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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                        <h4>Tested Color Pairs</h4>
                        <p style={{ color: '#666', fontSize: '0.9em', margin: 0 }}>
                            All detected foreground and background combinations
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                            onClick={() => setFilter('all')}
                            style={{
                                padding: '5px 10px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                background: filter === 'all' ? '#e0e0e0' : 'white',
                                cursor: 'pointer'
                            }}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('aa')}
                            style={{
                                padding: '5px 10px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                background: filter === 'aa' ? '#e0e0e0' : 'white',
                                cursor: 'pointer'
                            }}
                        >
                            AA
                        </button>
                        <button
                            onClick={() => setFilter('aaa')}
                            style={{
                                padding: '5px 10px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                background: filter === 'aaa' ? '#e0e0e0' : 'white',
                                cursor: 'pointer'
                            }}
                        >
                            AAA
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {allPairs.length > 0 ? (
                        allPairs.map((pair, index) => (
                            <ColorPairRow
                                key={index}
                                {...pair}
                                expanded={expandedIndex === index}
                                onClick={() => handleRowClick(index)}
                            />
                        ))
                    ) : (
                        <p style={{ color: '#666', fontStyle: 'italic' }}>No color contrast data available.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const ColorPairRow = ({ fg, bg, ratio, aa, aaa, isLarge, expanded, onClick }) => (
    <div style={{ border: '1px solid #000', borderRadius: 8, overflow: 'hidden' }}>
        <div
            onClick={onClick}
            style={{
                padding: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                backgroundColor: expanded ? '#f9f9f9' : 'transparent',
                transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => !expanded && (e.currentTarget.style.backgroundColor = '#f9f9f9')}
            onMouseLeave={(e) => !expanded && (e.currentTarget.style.backgroundColor = 'transparent')}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, background: fg, border: '1px solid #ccc', borderRadius: 4 }}></div>
                <div style={{ display: 'flex', flexDirection: 'column', fontSize: 12 }}>
                    <span style={{ fontWeight: 'bold' }}>FG</span>
                    <span style={{ color: '#666' }}>{fg}</span>
                </div>
                <span style={{ fontSize: 18 }}>→</span>
                <div style={{ width: 30, height: 30, background: bg, border: '1px solid #ccc', borderRadius: 4 }}></div>
                <div style={{ display: 'flex', flexDirection: 'column', fontSize: 12 }}>
                    <span style={{ fontWeight: 'bold' }}>BG</span>
                    <span style={{ color: '#666' }}>{bg}</span>
                </div>
                <div style={{ marginLeft: 15 }}>
                    <div style={{ fontSize: 12, color: '#666' }}>Contrast Ratio</div>
                    <div style={{ fontWeight: 'bold', fontSize: 14 }}>{ratio}:1</div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 5 }}>
                    <span className={`${styles.badge} ${aa ? styles.pass : ''}`}
                        style={{
                            background: aa ? '#4CAF50' : '#F44336',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 'bold'
                        }}>
                        {aa ? 'AA Passed' : 'AA Failed'}
                    </span>
                    <span className={`${styles.badge} ${aaa ? styles.pass : ''}`}
                        style={{
                            background: aaa ? '#4CAF50' : '#F44336',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 'bold'
                        }}>
                        {aaa ? 'AAA Passed' : 'AAA Failed'}
                    </span>
                </div>
                <span style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
            </div>
        </div>
        {expanded && (
            <div style={{ borderTop: '1px solid #eee', padding: '10px 20px', backgroundColor: '#fff' }}>
                <ContrastChecker initialColors={{ fg, bg, isLarge }} embedded={true} />
            </div>
        )}
    </div>
);

export default ContrastSummary;
