/**
 * scanStorage.js
 * Utilities for persisting and retrieving accessibility scans using chrome.storage.local.
 */

const STORAGE_KEY_PREFIX = 'axe_scan_';
const MANIFEST_KEY = 'axe_scans_manifest';

/**
 * Generates a UUID for scan identification.
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Storage wrapper to handle chrome.storage.local promises
 */
const storage = {
    get: (keys) => new Promise((resolve, reject) => {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(keys, (result) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(result);
                    }
                });
            } else {
                // Fallback for non-extension environment (e.g. dev/test)
                const result = {};
                const keyList = Array.isArray(keys) ? keys : [keys];
                keyList.forEach(k => {
                    const val = localStorage.getItem(k);
                    if (val) result[k] = JSON.parse(val);
                });
                resolve(result);
            }
        } catch (e) {
            reject(e);
        }
    }),
    set: (items) => new Promise((resolve, reject) => {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set(items, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            } else {
                // Fallback
                Object.keys(items).forEach(k => {
                    localStorage.setItem(k, JSON.stringify(items[k]));
                });
                resolve();
            }
        } catch (e) {
            reject(e);
        }
    }),
    remove: (keys) => new Promise((resolve, reject) => {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.remove(keys, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            } else {
                // Fallback
                const keyList = Array.isArray(keys) ? keys : [keys];
                keyList.forEach(k => localStorage.removeItem(k));
                resolve();
            }
        } catch (e) {
            reject(e);
        }
    })
};

export const ScanStorage = {
    /**
     * Save a new scan.
     * @param {string} type - 'tab-order' | 'structure'
     * @param {Array|Object} data - The scan data
     * @param {Object} metadata - Optional metadata (title, url)
     * @returns {Promise<string>} The new Scan ID
     */
    async saveScan(type, data, metadata = {}) {
        console.log('Saving scan', data);
        const id = generateUUID();
        const timestamp = Date.now();
        const url = metadata.url || (typeof window !== 'undefined' ? window.location.href : '');
        const title = metadata.title || (typeof document !== 'undefined' ? document.title : 'Untitled Page');

        const scanRecord = {
            id,
            timestamp,
            url,
            title,
            type,
            data,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };

        // Save the actual data record
        await storage.set({ [`${STORAGE_KEY_PREFIX}${id}`]: scanRecord });

        // Update the manifest (list of scans)
        const manifest = await this.getScans();
        manifest.unshift({
            id,
            timestamp,
            url,
            title,
            type
        }); // Add to beginning
        await storage.set({ [MANIFEST_KEY]: manifest });

        return id;
    },

    /**
     * Get list of all saved scans (metadata only).
     * @returns {Promise<Array>} List of scan summaries
     */
    async getScans() {
        const result = await storage.get(MANIFEST_KEY);
        return result[MANIFEST_KEY] || [];
    },

    /**
     * Get full data for a specific scan.
     * @param {string} id 
     * @returns {Promise<Object>} Full scan record
     */
    async getScan(id) {
        const key = `${STORAGE_KEY_PREFIX}${id}`;
        const result = await storage.get(key);
        return result[key] || null;
    },

    /**
     * Delete a scan.
     * @param {string} id 
     */
    async deleteScan(id) {
        // Remove data
        await storage.remove(`${STORAGE_KEY_PREFIX}${id}`);

        // Update manifest
        const manifest = await this.getScans();
        const newManifest = manifest.filter(s => s.id !== id);
        await storage.set({ [MANIFEST_KEY]: newManifest });
    },

    /**
     * Clear all scans
     */
    async clearAll() {
        const manifest = await this.getScans();
        const keys = manifest.map(s => `${STORAGE_KEY_PREFIX}${s.id}`);
        keys.push(MANIFEST_KEY);
        await storage.remove(keys);
    }
};
