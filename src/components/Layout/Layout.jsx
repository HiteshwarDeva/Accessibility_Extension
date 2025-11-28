import React, { useState } from 'react';
import Tabs from './Tabs';
import styles from './Layout.module.css';

const Layout = ({ children }) => {
    const [activeTab, setActiveTab] = useState('details');

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
            </header>
            <main className={styles.content}>
                {React.Children.map(children, child => {
                    if (React.isValidElement(child)) {
                        return React.cloneElement(child, { activeTab });
                    }
                    return child;
                })}
            </main>
        </div>
    );
};

export default Layout;
