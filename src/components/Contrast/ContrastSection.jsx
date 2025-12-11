import React from 'react';
import styles from './Contrast.module.css';
import ContrastSummary from './ContrastSummary/ContrastSummary';

const ContrastSection = ({ results, highlightTargetsContrast, clearHighlightsContrast }) => {
    return (
        <div>
            <ContrastSummary
                violations={results?.violations}
                passes={results?.passes}
                highlightTargetsContrast={highlightTargetsContrast}
                clearHighlightsContrast={clearHighlightsContrast}
            />
        </div>
    )
}

export default ContrastSection;

