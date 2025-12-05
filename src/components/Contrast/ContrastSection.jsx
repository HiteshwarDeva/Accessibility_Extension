import React from 'react';
import styles from './Contrast.module.css';
import ContrastSummary from './ContrastSummary/ContrastSummary';

const ContrastSection = ({ results }) => {
    return (
        <div>
            <ContrastSummary
                violations={results?.violations}
                passes={results?.passes}
            />
        </div>
    )
}

export default ContrastSection;

