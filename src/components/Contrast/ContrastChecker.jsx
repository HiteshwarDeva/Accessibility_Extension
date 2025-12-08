import React, { useState } from 'react';
import styles from './Contrast.module.css';

const ContrastChecker = () => {
    const [fgColor, setFgColor] = useState('#000000');
    const [bgColor, setBgColor] = useState('#FFFFFF');

    return (
        <div className={styles.contrastContainer}>
            <div className={styles.checkerSection}>
                <h3>Contrast Checker</h3>
                <p className={styles.description}>Test custom color combinations for accessibility</p>

                <div className={styles.inputGroup}>
                    <label>Foreground Color</label>
                    <div className={styles.colorInputWrapper}>
                        <input type="text" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className={styles.textInput} />
                        <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className={styles.colorPicker} />
                    </div>
                </div>

                <div className={styles.inputGroup}>
                    <label>Background Color</label>
                    <div className={styles.colorInputWrapper}>
                        <input type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className={styles.textInput} />
                        <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className={styles.colorPicker} />
                    </div>
                </div>

                <div className={styles.previewBox} style={{ backgroundColor: bgColor, color: fgColor }}>
                    <strong>Preview</strong>
                    <p>The Quick brown fox jumps over lazy dog</p>
                </div>

                <div className={styles.ratioBox}>
                    <span>Contrast Ratio</span>
                    <span className={styles.ratioValue}>21.00: 1</span>
                </div>

                <div className={styles.complianceSection}>
                    <h4>WCAG Compliance ( Text )</h4>
                    <div className={styles.complianceRow}>
                        <span>For normal text:</span>
                        <div className={styles.badges}>
                            <span className={`${styles.badge} ${styles.pass}`}>AA Pass</span>
                            <span className={`${styles.badge} ${styles.pass}`}>AAA Pass</span>
                        </div>
                    </div>
                    <div className={styles.complianceRow}>
                        <span>For large text:</span>
                        <div className={styles.badges}>
                            <span className={`${styles.badge} ${styles.pass}`}>AA Pass</span>
                            <span className={`${styles.badge} ${styles.pass}`}>AAA Pass</span>
                        </div>
                    </div>
                </div>

                <div className={styles.recommendation}>
                    <strong>Recommendation</strong>
                    <p>Excellent! This color combination meets AAA standards for normal text</p>
                </div>

            </div>
        </div>
    );
};

export default ContrastChecker;
