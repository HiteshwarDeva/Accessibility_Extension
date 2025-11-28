import React from 'react';
import styles from './Contrast.module.css';

const ContrastSummary = () => {
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
                            background: 'conic-gradient(#4CAF50 0% 63%, #F44336 63% 100%)',
                            margin: '10px auto'
                        }}></div>
                        <div>5 / 8 passed</div>
                        <div style={{ fontSize: 12, color: '#666' }}>63% compliant</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <h4>AAA Standard</h4>
                        <div style={{
                            width: 100, height: 100, borderRadius: '50%',
                            background: 'conic-gradient(#4CAF50 0% 38%, #F44336 38% 100%)',
                            margin: '10px auto'
                        }}></div>
                        <div>3 / 8 passed</div>
                        <div style={{ fontSize: 12, color: '#666' }}>38% compliant</div>
                    </div>
                </div>

                <h4>Tested Color Pairs</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <ColorPairRow fg="#000000" bg="#ffffff" ratio="21:1" aa={true} aaa={true} />
                    <ColorPairRow fg="#666666" bg="#ffffff" ratio="5.7:1" aa={true} aaa={false} />
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
