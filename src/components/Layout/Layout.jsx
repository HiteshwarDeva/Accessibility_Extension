import React, { useState } from 'react';
import Tabs from './Tabs';
import { useAuth } from '../../context/AuthContext';
import { MdLogout } from 'react-icons/md';
import styles from './Layout.module.css';

const Layout = ({ children }) => {
    const [activeTab, setActiveTab] = useState('details');
    const { logout } = useAuth();

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
                <button className={styles.logoutBtn} onClick={logout} title="Logout">
                    <MdLogout />
                    Logout
                </button>
            </header>
            <main className={styles.content}>
                {React.Children.map(children, child => {
                    if (React.isValidElement(child)) {
                        return React.cloneElement(child, {
                            activeTab,
                            onTabChange: setActiveTab // Pass the setter
                        });
                    }
                    return child;
                })}
            </main>
        </div>
    );
};

export default Layout;
