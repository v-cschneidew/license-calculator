/**
 * LicenseState Module
 * Manages the state of licenses and provides an interface for manipulating license data.
 * Implements the Observer pattern to notify subscribers of state changes.
 * @module LicenseState
 */
const LicenseState = (function () {
  /** @type {Array<License>} Current array of licenses */
  let licenses = [];

  /** @type {Array<Function>} Array of subscriber callback functions */
  const listeners = [];

  /**
   * @typedef {Object} License
   * @property {string} name - The name of the license
   * @property {number} price - The monthly price of the license
   * @property {string} sourceUrl - URL to the license's pricing source
   */

  /**
   * Notifies all subscribers of state changes
   * @private
   */
  function notify() {
    listeners.forEach((listener) => listener(licenses));
  }

  /**
   * Subscribes a listener to state changes
   * @param {Function} listener - Callback function to be called on state changes
   * @returns {Function} Unsubscribe function
   */
  function subscribe(listener) {
    if (typeof listener === "function") {
      listeners.push(listener);
      // Return unsubscribe function
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      };
    }
  }

  /**
   * Loads licenses from storage
   * @async
   * @returns {Promise<Array<License>>} Array of loaded licenses
   * @throws {Error} If storage operation fails
   */
  async function load() {
    licenses = await LicenseStorage.getLicenses();
    notify();
    return licenses;
  }

  /**
   * Saves current licenses to storage
   * @async
   * @returns {Promise<void>}
   * @throws {Error} If storage operation fails
   */
  function save() {
    return LicenseStorage.saveLicenses(licenses);
  }

  /**
   * Returns current licenses array
   * @returns {Array<License>} Current licenses
   */
  function getLicenses() {
    return licenses;
  }

  /**
   * Validates and sanitizes a license object
   * @private
   * @param {License} license - License object to validate
   * @returns {License} Sanitized license object
   */
  function validateLicense(license) {
    return {
      name: String(license.name || "").trim(),
      price: Math.max(0, parseFloat(license.price) || 0),
      sourceUrl: String(license.sourceUrl || "").trim(),
    };
  }

  /**
   * Updates entire licenses array
   * @param {Array<License>} newLicenses - New array of licenses
   */
  async function setLicenses(newLicenses) {
    if (!Array.isArray(newLicenses)) return;

    licenses = newLicenses.map((license) => ({
      name: String(license.name || "").trim(),
      price: Math.max(0, Number(license.price) || 0),
      sourceUrl: String(license.sourceUrl || "").trim(),
    }));

    notify();
    await save(); // Wait for save to complete
  }

  /**
   * Adds a new license to the array
   * @param {License} license - License object to add
   */
  function addLicense(license) {
    licenses.push(validateLicense(license));
    notify();
  }

  /**
   * Updates a license at specified index
   * @param {number} index - Index of license to update
   * @param {License} license - Updated license object
   */
  function updateLicense(index, license) {
    if (index >= 0 && index < licenses.length) {
      licenses[index] = validateLicense(license);
      notify();
    }
  }

  /**
   * Removes a license at specified index
   * @param {number} index - Index of license to remove
   */
  function removeLicense(index) {
    if (index >= 0 && index < licenses.length) {
      licenses.splice(index, 1);
      notify();
    }
  }

  // Public API
  return {
    load,
    save,
    getLicenses,
    setLicenses,
    addLicense,
    updateLicense,
    removeLicense,
    subscribe,
  };
})();
