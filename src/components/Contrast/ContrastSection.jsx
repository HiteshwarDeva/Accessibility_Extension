import React from 'react';
import styles from './Contrast.module.css';
import ContrastSummary from './ContrastSummary/ContrastSummary';
import { useAccessibility } from '../../context/AccessibilityContext';

const ContrastSection = () => {
    const { axe } = useAccessibility();
    const { results, highlightTargetsContrast, clearHighlightsContrast, runScan } = axe;
    console.log(results, 'ContrastSection')
    return (
        <div>
            <ContrastSummary
                violations={results?.violations}
                passes={results?.passes}
                highlightTargetsContrast={highlightTargetsContrast}
                clearHighlightsContrast={clearHighlightsContrast}
                onReRun={runScan}
            />
        </div>
    )
}

export default ContrastSection;

