/**
 * ScanModel.js
 * Handles interactions with the axe-core library for accessibility scanning.
 */

export class ScanModel {
    static async run(options = {}) {
        if (!(window.axe && typeof window.axe.run === 'function')) {
            throw new Error('axe runner is not available in this context.');
        }

        try {
            const results = await window.axe.run(document, options);
            return results;
        } catch (error) {
            throw new Error(error && error.message ? error.message : String(error));
        }
    }
}
