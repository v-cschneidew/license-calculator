const LicenseStorage = {
  getLicenses: function () {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(["licenses"], (data) => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve(data.licenses || []);
      });
    });
  },

  saveLicenses: function (lics) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ licenses: lics }, () => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve();
      });
    });
  },
};
