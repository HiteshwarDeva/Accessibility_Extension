import React from 'react';
import styles from './Contrast.module.css';
import ContrastChecker from './ContrastChecker';
import ContrastSummary from './ContrastSummary';

const ContrastSection = () => (
    <div className={styles.contrastLayout}>
        <section className={styles.subSection}>
            <ContrastSummary />
        </section>
        <section className={styles.subSection}>
            <ContrastChecker />
        </section>
    </div>
);

export default ContrastSection;

