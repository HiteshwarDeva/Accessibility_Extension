import React, { useMemo } from 'react';
import styles from './Dashboard.module.css';
import { DiffEngine } from '../../utils/diffEngine';

const DiffView = ({ oldScan, newScan, onClose }) => {
    const diff = useMemo(() => {
        if (!oldScan || !newScan) return null;
        return DiffEngine.compareScans(oldScan, newScan);
    }, [oldScan, newScan]);

    if (!diff) return <div>Loading diff...</div>;
    if (diff.error) return <div className={styles.errorMessage}>{diff.error}</div>;

    return (
        <div className={styles.panel}>
            <div className={styles.categoryHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={onClose} className={styles.btn} style={{ fontSize: '1.2rem', padding: '4px 8px' }}>
                        ←
                    </button>
                    <h3 className={styles.panelTitle}>
                        Scan Comparison ({oldScan.type === 'tab-order' ? 'Tab Order' : 'Structure'})
                    </h3>
                </div>
            </div>

            <div className={styles.categoryBody}>
                <div className={styles.summaryStatsContainer} style={{ justifyContent: 'space-around', marginBottom: '24px' }}>
                    <div className={styles.totalItem}>
                        <span className={styles.totalLabel}>Removed</span>
                        <span className={styles.totalValue} style={{ color: '#dc2626' }}>-{diff.removed.length}</span>
                    </div>
                    <div className={styles.totalItem}>
                        <span className={styles.totalLabel}>Added</span>
                        <span className={styles.totalValue} style={{ color: '#16a34a' }}>+{diff.added.length}</span>
                    </div>
                    <div className={styles.totalItem}>
                        <span className={styles.totalLabel}>Baseline</span>
                        <span className={styles.totalValue}>{diff.totalOld} items</span>
                    </div>
                    <div className={styles.totalItem}>
                        <span className={styles.totalLabel}>Current</span>
                        <span className={styles.totalValue}>{diff.totalNew} items</span>
                    </div>
                </div>

                <div className={styles.summarySplitLayout}>
                    {/* Left: Removed Items */}
                    <div className={styles.summaryLeftPanel} style={{ borderRight: '1px solid #f1f5f9' }}>
                        <h4 className={styles.issuesHeader} style={{ color: '#dc2626' }}>Missing in Current Scan</h4>
                        {diff.removed.length === 0 ? (
                            <p className={styles.emptyCopy}>Nothing removed.</p>
                        ) : (
                            <div className={styles.verticalIssueList}>
                                {diff.removed.map((item, idx) => (
                                    <div key={idx} className={styles.issueListItem}>
                                        <div className={styles.issueName}>
                                            {item.name || item.tag || 'Element'}
                                            <span style={{ fontSize: '0.8em', color: '#999', marginLeft: '8px' }}>
                                                ({item.role || item.type})
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Added Items */}
                    <div className={styles.summaryRightPanel}>
                        <h4 className={styles.issuesHeader} style={{ color: '#16a34a' }}>New in Current Scan</h4>
                        {diff.added.length === 0 ? (
                            <p className={styles.emptyCopy}>Nothing added.</p>
                        ) : (
                            <div className={styles.verticalIssueList}>
                                {diff.added.map((item, idx) => (
                                    <div key={idx} className={styles.issueListItem}>
                                        <div className={styles.issueName}>
                                            {item.name || item.tag || 'Element'}
                                            <span style={{ fontSize: '0.8em', color: '#999', marginLeft: '8px' }}>
                                                ({item.role || item.type})
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiffView;
