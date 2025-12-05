import React, { useEffect, useMemo, useState } from 'react';
import styles from './Dashboard.module.css';
import { useAxeRunner } from '../../hooks/useAxeRunner';
import DetailsSection from './DetailsSection';
import Toast from './Toast';

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
    const { results, isScanning, error, runScan, toggleHighlight, clearHighlights } = useAxeRunner();
    const hasResults = Boolean(results);
    const [toastMessage, setToastMessage] = useState(null);
    const [highlightedItemId, setHighlightedItemId] = useState(null);

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

    const summary = useMemo(() => buildSummary(results || {}), [results]);
    const violationCategories = useMemo(() => formatCategories(results?.violations || [], 'violations'), [results]);
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
                    onDownloadReport={handleDownloadReport}
                    highlightedItemId={highlightedItemId}
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
