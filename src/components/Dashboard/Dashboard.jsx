import React, { useEffect, useMemo, useState } from 'react';
import styles from './Dashboard.module.css';
import { useAxeRunner } from '../../hooks/useAxeRunner';
import DetailsSection from './DetailsSection';
import Toast from './Toast';

const buildSummary = (results, bestPracticesRuleCount = 0, bestPracticesNodeCount = 0, impacts = {}) => {
    const passed = results?.passes?.length || 0;
    const strictViolationsCount = results?.violations?.length || 0;
    const strictViolationsRuleCount = strictViolationsCount - bestPracticesRuleCount;

    return {
        total_tests: passed + strictViolationsRuleCount + bestPracticesRuleCount,
        passed,
        violations: strictViolationsRuleCount,
        bestPractices: bestPracticesRuleCount, // Rule count for left side
        bestPracticesNodes: bestPracticesNodeCount, // Node count for right side
        critical: impacts.critical || 0,
        serious: impacts.serious || 0,
        moderate: impacts.moderate || 0,
        minor: impacts.minor || 0,
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
    const { results, isScanning, error, runScan, toggleHighlight, clearHighlights } = useAxeRunner();
    const hasResults = Boolean(results);
    const [toastMessage, setToastMessage] = useState(null);
    const [highlightedItemId, setHighlightedItemId] = useState(null);
    const [showBestPractices, setShowBestPractices] = useState(false);

    useEffect(() => {
        if (!results && !isScanning) {
            runScan();
        }
    }, [results, isScanning, runScan]);

    // Clear highlights when results change
    useEffect(() => {
        if (results) {
            clearHighlights();
            setHighlightedItemId(null);
        }
    }, [results, clearHighlights]);

    const { strictViolations, bestPractices, impacts, bestPracticesNodeCount } = useMemo(() => {
        const allViolations = results?.violations || [];
        const strict = [];
        const best = [];
        const impactCounts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
        let bpNodeCount = 0;

        allViolations.forEach(violation => {
            const nodeCount = violation.nodes?.length || 0;
            if (violation.tags && violation.tags.includes('best-practice')) {
                best.push(violation);
                bpNodeCount += nodeCount;
            } else {
                strict.push(violation);
                const impact = violation.impact; // 'critical', 'serious', 'moderate', 'minor'
                if (impact && impactCounts.hasOwnProperty(impact)) {
                    impactCounts[impact] += nodeCount;
                }
            }
        });

        return { strictViolations: strict, bestPractices: best, impacts: impactCounts, bestPracticesNodeCount: bpNodeCount };
    }, [results]);

    const summary = useMemo(() => buildSummary(results || {}, bestPractices.length, bestPracticesNodeCount, impacts), [results, bestPractices.length, bestPracticesNodeCount, impacts]);

    const violationCategories = useMemo(() => formatCategories(strictViolations, 'violations'), [strictViolations]);
    const bestPracticeCategories = useMemo(() => formatCategories(bestPractices, 'violations'), [bestPractices]);
    const successCategories = useMemo(() => formatCategories(results?.passes || [], 'passes'), [results]);

    const handleHighlight = (item) => {
        if (!item) return;

        // Create unique ID for this item
        const itemId = `${item.element_location || ''}-${item.description || ''}`;
        const isCurrentlyHighlighted = highlightedItemId === itemId;

        if (isCurrentlyHighlighted) {
            // Turn off highlight
            clearHighlights();
            setHighlightedItemId(null);
        } else {
            // Turn on highlight
            const selectorData = {
                selectors: item.selectors || [],
                element_location: item.element_location
            };

            toggleHighlight(selectorData, (response) => {
                if (response && response.ok) {
                    if (response.isHighlighted) {
                        setHighlightedItemId(itemId);
                    } else {
                        setHighlightedItemId(null);
                    }
                } else {
                    setToastMessage(response && response.error ? response.error : 'Component not found on this page.');
                    setHighlightedItemId(null);
                }
            });
        }
    };

    const handleDownloadReport = () => {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            console.warn('Download not supported in this environment.');
            return;
        }

        const reportData = {
            summary,
            violations: violationCategories,
            bestPractices: bestPracticeCategories,
            success: successCategories
        };

        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `accessibility-report-${new Date().toISOString()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className={styles.dashboard}>
            {isScanning && (
                <div className={styles.statusMessage}>
                    <p>Running accessibility scan...</p>
                </div>
            )}



            {hasResults && (
                <DetailsSection
                    summary={summary}
                    violations={violationCategories}
                    bestPractices={bestPracticeCategories}
                    passed={successCategories}
                    onHighlight={handleHighlight}
                    onReRun={runScan}
                    onDownloadReport={handleDownloadReport}
                    highlightedItemId={highlightedItemId}
                    showBestPractices={showBestPractices}
                    setShowBestPractices={setShowBestPractices}
                />
            )}

            {error && <p className={styles.errorMessage}>{error}</p>}

            {toastMessage && (
                <Toast
                    message={toastMessage}
                    onClose={() => setToastMessage(null)}
                />
            )}
        </div>
    );
};

export default Dashboard;
