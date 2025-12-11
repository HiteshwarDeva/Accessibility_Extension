import React from 'react';
import styles from './Contrast.module.css';
import ContrastSummary from './ContrastSummary/ContrastSummary';
import { useRunner } from '../../context/AxeRunnerContext';

const ContrastSection = () => {
    const { results, highlightTargetsContrast, clearHighlightsContrast } = useRunner();
    console.log(results, 'ContrastSection')
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

