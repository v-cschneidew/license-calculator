const LicenseState = (function () {
  let licenses = [];
  const listeners = [];

  // Notify each subscribed listener with the latest licenses.
  function notify() {
    listeners.forEach((listener) => listener(licenses));
  }

  // Allow other modules (like UI components) to subscribe.
  function subscribe(listener) {
    if (typeof listener === "function") {
      listeners.push(listener);
    }
  }

  // Refactored load method using async/await.
  async function load() {
    licenses = await LicenseStorage.getLicenses();
    notify();
    return licenses;
  }

  function save() {
    // Save the current license state to storage.
    return LicenseStorage.saveLicenses(licenses);
  }

  function getLicenses() {
    return licenses;
  }

  function setLicenses(newLicenses) {
    licenses = newLicenses;
    notify();
  }

  function addLicense(license) {
    licenses.push(license);
    notify();
  }

  function updateLicense(index, license) {
    if (index >= 0 && index < licenses.length) {
      licenses[index] = license;
      notify();
    }
  }

  function removeLicense(index) {
    if (index >= 0 && index < licenses.length) {
      licenses.splice(index, 1);
      notify();
    }
  }

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
