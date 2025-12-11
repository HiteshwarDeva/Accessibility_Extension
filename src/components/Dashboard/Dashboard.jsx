import React, { useEffect, useMemo } from 'react';
import styles from './Dashboard.module.css';
import DetailsSection from './DetailsSection';

const buildSummary = (results) => {
    console.log(results);
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

const Dashboard = ({ results, isScanning, error, runScan, highlightNode }) => {
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
        highlightTargetsContrast(item.selectors);
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
                />
            )}

            {error && <p className={styles.errorMessage}>{error}</p>}
        </div>
    );
};

export default Dashboard;
