import React from 'react';
import styles from './Dashboard.module.css';

const TagList = ({ tags }) => {
    const wcagTags = (tags || []).filter((tag) => /wcag/i.test(tag));

    return (
        <div className={styles['tag-list']}>
            {wcagTags.length ? (
                wcagTags.map((tag) => (
                    <span key={tag} className={styles.tag}>
                        {tag}
                    </span>
                ))
            ) : (
                <span className={styles.tag}>No WCAG tags</span>
            )}
        </div>
    );
};

export default TagList;

