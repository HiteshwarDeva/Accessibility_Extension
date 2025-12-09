import React from 'react';
import styles from './Contrast.module.css';
import ContrastSummary from './ContrastSummary/ContrastSummary';

const ContrastSection = ({ results, highlightNode, clearHighlights }) => {
    return (
        <div>
            <ContrastSummary
                violations={results?.violations}
                passes={results?.passes}
                highlightNode={highlightNode}
                clearHighlights={clearHighlights}
            />
        </div>
    )
}

export default ContrastSection;

