import React from 'react';
import { useAccessibility } from '../../context/AccessibilityContext';
import styles from './Dashboard.module.css'; // Reusing dashboard styles for consistency

const HistoryPanel = ({ onLoadScan, onDiffScan }) => {
    const { history } = useAccessibility();
    const { scanHistory, deleteScan } = history;

    if (!scanHistory || scanHistory.length === 0) {
        return (
            <div className={styles.historyEmpty}>
                <p>No saved scans yet.</p>
                <small>Run a Tab Order or Structure scan and click "Save" to keep a history.</small>
            </div>
        );
    }

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className={styles.historyPanel}>
            <h3 className={styles.sectionTitle}>Scan History</h3>
            <div className={styles.historyList}>
                {scanHistory.map((scan) => (
                    <div key={scan.id} className={styles.historyItem}>
                        <div className={styles.historyInfo}>
                            <div className={styles.historyHeader}>
                                <span className={styles.historyType}>
                                    {scan.type === 'tab-order' ? 'TAB' : 'STR'}
                                </span>
                                <span className={styles.historyDate}>{formatDate(scan.timestamp)}</span>
                            </div>
                            <div className={styles.historyTitle} title={scan.url}>
                                {scan.title || scan.url}
                            </div>
                        </div>
                        <div className={styles.historyActions}>
                            <button
                                onClick={() => onLoadScan(scan.id)}
                                className={styles.actionBtn}
                                title="Load this scan"
                            >
                                📂
                            </button>
                            <button
                                onClick={() => onDiffScan(scan.id)}
                                className={styles.actionBtn}
                                title="Compare with current"
                            >
                                ⚖️
                            </button>
                            <button
                                onClick={() => deleteScan(scan.id)}
                                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                title="Delete scan"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HistoryPanel;
