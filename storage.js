/**
 * LicenseStorage Module
 * Handles Chrome storage operations for license data.
 * Provides a Promise-based interface for storage operations.
 * @module LicenseStorage
 */
const LicenseStorage = {
  /**
   * Retrieves licenses from Chrome local storage
   * @async
   * @returns {Promise<Array<License>>} Array of stored licenses
   * @throws {Error} If Chrome storage operation fails
   */
  getLicenses: function () {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(["licenses"], (data) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve(data.licenses || []);
      });
    });
  },

  /**
   * Saves licenses to Chrome local storage
   * @async
   * @param {Array<License>} licenses - Array of licenses to store
   * @returns {Promise<void>}
   * @throws {Error} If Chrome storage operation fails
   *
   * @typedef {Object} License
   * @property {string} name - The name of the license
   * @property {number} price - The monthly price of the license
   * @property {string} sourceUrl - URL to the license's pricing source
   */
  saveLicenses: function (licenses) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ licenses }, () => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve();
      });
    });
  },
};
