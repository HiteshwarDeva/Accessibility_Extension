/**
 * diffEngine.js
 * Logic for comparing two accessibility scans.
 */

export const DiffEngine = {
    /**
     * Compare two scans (Old vs New).
     * @param {Object} oldScan - The baseline scan record.
     * @param {Object} newScan - The comparison scan record.
     * @returns {Object} Diff result { added: [], removed: [], changed: [], unchanged: [] }
     */
    compareScans(oldScan, newScan) {
        if (!oldScan || !newScan) {
            return { error: 'Invalid scans provided.' };
        }

        if (oldScan.type !== newScan.type) {
            return { error: 'Cannot compare scans of different types.' };
        }

        const type = oldScan.type;
        const oldData = oldScan.data || [];
        const newData = newScan.data || [];

        if (type === 'tab-order') {
            return this.compareTabOrder(oldData, newData);
        } else if (type === 'structure') {
            return this.compareStructure(oldData, newData);
        }

        return { error: 'Unknown scan type.' };
    },

    /**
     * Compare Tab Order arrays.
     * Matches items based on 'name' + 'role' + 'tabindex' signature, likely position.
     * Tab Order is an ordered list, so index matters.
     */
    compareTabOrder(oldList, newList) {
        const added = [];
        const removed = [];
        const changed = []; // Order changed or attributes changed
        const unchanged = [];

        // Simple matching strategy: Map by Key (Role+Name)
        // If duplicates exist, this simple key strategy might fail.
        // But for accessibility, Role+Name should be somewhat unique-ish or at least identifying.

        // Matching strategy: Use element_key if available, fallback to Name+Role
        const generateKey = (item) => item.element_key || `${item.role}|${item.name}`;

        const oldMap = new Map();
        oldList.forEach(item => {
            const key = generateKey(item);
            if (!oldMap.has(key)) oldMap.set(key, []);
            oldMap.get(key).push(item);
        });

        const newMap = new Map();
        newList.forEach(item => {
            const key = generateKey(item);
            if (!newMap.has(key)) newMap.set(key, []);
            newMap.get(key).push(item);
        });

        // 1. Detect Removed
        oldMap.forEach((items, key) => {
            if (!newMap.has(key)) {
                items.forEach(item => removed.push(item));
            } else {
                // Key exists in both. Check counts.
                const newItems = newMap.get(key);
                if (items.length > newItems.length) {
                    // More in old than new -> some removed
                    for (let i = newItems.length; i < items.length; i++) {
                        removed.push(items[i]);
                    }
                }
            }
        });

        // 2. Detect Added
        newMap.forEach((items, key) => {
            if (!oldMap.has(key)) {
                items.forEach(item => added.push(item));
            } else {
                // Key exists in both. Check counts.
                const oldItems = oldMap.get(key);
                if (items.length > oldItems.length) {
                    // More in new than old -> some added
                    for (let i = oldItems.length; i < items.length; i++) {
                        added.push(items[i]);
                    }
                }
            }
        });

        // 3. Detect Changed (Position/Index)
        const oldKeyMap = new Map();
        oldList.forEach(item => {
            const key = generateKey(item);
            if (!oldKeyMap.has(key)) oldKeyMap.set(key, []);
            oldKeyMap.get(key).push(item);
        });

        const usedOldIndices = new Set();

        newList.forEach((newItem) => {
            const key = generateKey(newItem);
            if (oldKeyMap.has(key)) {
                const matches = oldKeyMap.get(key);
                // Find first unused match
                const matchIndex = matches.findIndex(m => !usedOldIndices.has(m.element_key + m.order));
                if (matchIndex !== -1) {
                    const match = matches[matchIndex];
                    usedOldIndices.add(match.element_key + match.order);

                    if (match.order !== newItem.order) {
                        changed.push({
                            ...newItem,
                            oldOrder: match.order,
                            newOrder: newItem.order
                        });
                    }
                }
            }
        });

        return {
            type: 'tab-order',
            added,
            removed,
            changed,
            totalOld: oldList.length,
            totalNew: newList.length
        };
    },

    /**
     * Compare Structure arrays (Hierarchical/Linearized).
     * Uses Path or Tag+Role+Name as key.
     */
    compareStructure(oldList, newList) {
        const added = [];
        const removed = [];

        // Use element_key if available, fallback to Tag+Role+Name
        const generateKey = (item) => {
            if (item.element_key) return item.element_key;
            return `${item.tag}|${item.role || 'no-role'}|${item.name || 'no-name'}`;
        };

        const oldSet = new Map();
        oldList.forEach(item => oldSet.set(generateKey(item), item));

        const newSet = new Map();
        newList.forEach(item => newSet.set(generateKey(item), item));

        // Removed
        oldList.forEach(item => {
            const key = generateKey(item);
            if (!newSet.has(key)) {
                removed.push(item);
            }
        });

        // Added
        newList.forEach(item => {
            const key = generateKey(item);
            if (!oldSet.has(key)) {
                added.push(item);
            }
        });

        return {
            type: 'structure',
            added,
            removed,
            totalOld: oldList.length,
            totalNew: newList.length
        };
    }
};
