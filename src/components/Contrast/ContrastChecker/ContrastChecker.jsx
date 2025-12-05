import React, { useState } from 'react';
import styles from '../Contrast.module.css';

const ContrastChecker = ({ initialColors, embedded = false }) => {
    const [fgColor, setFgColor] = useState('#000000');
    const [bgColor, setBgColor] = useState('#FFFFFF');
    const [ratio, setRatio] = useState(21);
    const [textSize, setTextSize] = useState('all'); // 'all', 'normal', 'large'
    const [compliance, setCompliance] = useState({
        aaNormal: true,
        aaaNormal: true,
        aaLarge: true,
        aaaLarge: true
    });

    React.useEffect(() => {
        if (initialColors) {
            setFgColor(initialColors.fg);
            setBgColor(initialColors.bg);
            // If isLarge is present, set specific text size, otherwise default to all
            if (initialColors.isLarge !== undefined) {
                setTextSize(initialColors.isLarge ? 'large' : 'normal');
            } else {
                setTextSize('all');
            }
        } else {
            if (!embedded) setTextSize('all');
        }
    }, [initialColors, embedded]);

    // Helper functions
    const hexToRgb = (hex) => {
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };

    const getLuminance = (r, g, b) => {
        const a = [r, g, b].map((v) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };

    const getContrastRatio = (fg, bg) => {
        const fgRgb = hexToRgb(fg);
        const bgRgb = hexToRgb(bg);

        if (!fgRgb || !bgRgb) return 0;

        const fgL = getLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
        const bgL = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

        const l1 = Math.max(fgL, bgL);
        const l2 = Math.min(fgL, bgL);

        return (l1 + 0.05) / (l2 + 0.05);
    };

    React.useEffect(() => {
        const newRatio = getContrastRatio(fgColor, bgColor);
        setRatio(newRatio);

        setCompliance({
            aaNormal: newRatio >= 4.5,
            aaaNormal: newRatio >= 7,
            aaLarge: newRatio >= 3,
            aaaLarge: newRatio >= 4.5
        });
    }, [fgColor, bgColor]);

    const getRecommendation = () => {
        if (compliance.aaaNormal) return "Excellent! This color combination meets AAA standards for both normal and large text.";
        if (compliance.aaNormal) return "Good. This color combination meets AA standards for normal text and AAA standards for large text.";
        if (compliance.aaLarge) return "Fair. This color combination meets AA standards for large text only.";
        return "Poor. This color combination fails WCAG contrast standards.";
    };

    return (
        <div className={embedded ? '' : styles.contrastContainer} style={embedded ? { padding: '10px 0' } : {}}>
            <div className={styles.checkerSection} style={embedded ? { boxShadow: 'none', padding: 0 } : {}}>
                {!embedded && (
                    <>
                        <h3>Contrast Checker</h3>
                        <p className={styles.description}>Test custom color combinations for accessibility</p>
                    </>
                )}

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
                    <span className={styles.ratioValue}>{ratio.toFixed(2)}: 1</span>
                </div>

                <div className={styles.complianceSection}>
                    <h4>WCAG Compliance</h4>
                    <p><strong>Level AA (WCAG - 1.4.3)</strong> : Required Color Contrast Ratio for nomral text - 4.5, for large text - 3 </p>
                    <p><strong>Level AAA (WCAG - 1.4.6)</strong> : Required Color Contrast Ratio for nomral text - 7, for large text - 4.5 </p>
                    {(textSize === 'all' || textSize === 'normal') && (
                        <div className={styles.complianceRow}>
                            <span><strong>Text Sixe : </strong> Normal </span>
                            <div className={styles.badges}>
                                <span className={`${styles.badge} ${compliance.aaNormal ? styles.pass : styles.fail}`} style={{ background: compliance.aaNormal ? '#4CAF50' : '#F44336' }}>
                                    {compliance.aaNormal ? 'AA Pass' : 'AA Fail'}
                                </span>
                                <span className={`${styles.badge} ${compliance.aaaNormal ? styles.pass : styles.fail}`} style={{ background: compliance.aaaNormal ? '#4CAF50' : '#F44336' }}>
                                    {compliance.aaaNormal ? 'AAA Pass' : 'AAA Fail'}
                                </span>
                            </div>
                        </div>
                    )}
                    {(textSize === 'all' || textSize === 'large') && (
                        <div className={styles.complianceRow}>
                            <span><strong>Text Sixe : </strong> Large </span>
                            <div className={styles.badges}>
                                <span className={`${styles.badge} ${compliance.aaLarge ? styles.pass : styles.fail}`} style={{ background: compliance.aaLarge ? '#4CAF50' : '#F44336' }}>
                                    {compliance.aaLarge ? 'AA Pass' : 'AA Fail'}
                                </span>
                                <span className={`${styles.badge} ${compliance.aaaLarge ? styles.pass : styles.fail}`} style={{ background: compliance.aaaLarge ? '#4CAF50' : '#F44336' }}>
                                    {compliance.aaaLarge ? 'AAA Pass' : 'AAA Fail'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.recommendation}>
                    <strong>Recommendation</strong>
                    <p>{getRecommendation()}</p>
                </div>

            </div>
        </div>
    );
};

export default ContrastChecker;
