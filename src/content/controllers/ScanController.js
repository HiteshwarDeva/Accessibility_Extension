/**
 * ScanController.js
 * Handles data retrieval and scan operations.
 */

import { ScanModel } from '../models/ScanModel.js';
import { DomModel } from '../models/DomModel.js';

export class ScanController {
    static async runAxe(message, sendResponse) {
        try {
            const results = await ScanModel.run(message.options);
            sendResponse({ ok: true, results });
        } catch (error) {
            sendResponse({ ok: false, error: error.message });
        }
    }

    static getTabOrder(message, sendResponse) {
        try {
            const data = DomModel.getTabOrder();
            const metadata = {
                url: window.location.href,
                title: document.title
            };
            sendResponse({ ok: true, data, metadata });
        } catch (error) {
            sendResponse({ ok: false, error: error.message });
        }
    }

    static getStructure(message, sendResponse) {
        try {
            const structure = DomModel.getStructure();
            sendResponse({ ok: true, structure });
        } catch (error) {
            sendResponse({ ok: false, error: error.message });
        }
    }
}
