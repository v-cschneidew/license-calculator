// options.js

// Global state variables maintained by the UI module.
let licenses = [];
let pendingRemovalIndex = null;

/*
 * LicenseStorage Module
 * Handles interactions with chrome.storage.
 */
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

/*
 * CSVHelper Module
 * Deals with converting licenses to and from CSV.
 */
const CSVHelper = {
  exportToCsv: function (licenses) {
    const csvContent =
      "Name,Price\n" + licenses.map((l) => `${l.name},${l.price}`).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "licenses.csv";
    a.click();
  },

  importFromCsv: function (file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true, // Use the CSV header row for keys
        skipEmptyLines: true, // Ignore empty lines in the CSV file
        error: function (err) {
          reject(err);
        },
        complete: function (results) {
          // Map parsed data to your license objects.
          // This code supports either "Name"/"Price" or "name"/"price" as headers.
          const importedLicenses = results.data.map((record) => {
            return {
              name: (record["Name"] || record["name"] || "").trim(),
              price: parseFloat(record["Price"] || record["price"]) || 0,
            };
          });
          resolve(importedLicenses);
        },
      });
    });
  },
};

/*
 * LicenseUI Module
 * Manages UI rendering, event handlers, and overall interactions.
 */
const LicenseUI = {
  init: function () {
    // Bind UI events on document ready.
    $("#addLicense").click(() => this.handleAddLicense());
    $("#saveOptions").click(() => this.handleSaveLicenses());
    $("#exportCsv").click(() => this.handleExportCsv());
    $("#importCsv").change((e) => this.handleImportCsv(e));
    $("#confirmRemoveBtn").click(() => this.handleConfirmRemoval());

    // Handle keydown and input events for license-price.
    $(document).on("keydown", ".license-price", this.handleLicensePriceKeydown);
    $(document).on("input", ".license-price", this.handleLicensePriceInput);

    // Load licenses from storage.
    LicenseStorage.getLicenses()
      .then((data) => {
        licenses = data;
        this.renderLicenses();
      })
      .catch((error) => {
        console.error("Failed to load licenses:", error);
      });

    // Delegated event: Always gets the fresh current index from the DOM.
    $(document).on("click", ".remove-btn", function () {
      // Retrieve the current data-index from the row containing the clicked button.
      const index = parseInt($(this).closest(".row").attr("data-index"), 10);
      pendingRemovalIndex = index;
      // Use .val() since the license name is in an input field.
      $("#licenseName").text(
        $(this).closest(".row").find(".license-name").val()
      );
      $("#confirmRemovalModal").modal("show");
    });
  },

  renderLicenses: function () {
    const licenseList = $("#licenseList");
    licenseList.empty();

    licenses.forEach((license, index) => {
      const licenseItem = this.createLicenseRow(license, index);
      licenseList.append(licenseItem);
    });

    // Initialize jQuery UI Sortable if it has not been initialized yet.
    if (!licenseList.hasClass("ui-sortable")) {
      licenseList.sortable({
        handle: ".handle",
        update: function () {
          const newLicenses = [];
          licenseList.children(".row").each(function (i) {
            // Update the data-index attribute for each row.
            $(this).attr("data-index", i);
            // Update the displayed index.
            $(this)
              .find(".license-index")
              .text(i + 1 + ".");
            const name = $(this).find(".license-name").val();
            const price = parseFloat($(this).find(".license-price").val()) || 0;
            newLicenses.push({ name, price });
          });
          licenses = newLicenses;
        },
      });
    }
  },

  createLicenseRow: function (license, index) {
    // Returns a jQuery element for a license row.
    return $(`
      <div class="row g-3 mb-3 align-items-center sortable-item" data-index="${index}">
        <div class="col-auto" style="width: 60px;">
          <div class="d-flex align-items-center">
            <i class="bi bi-grip-vertical handle" style="cursor: move; margin-right: 4px;"></i>
            <span class="license-index">${index + 1}.</span>
          </div>
        </div>
        <div class="col">
          <input type="text" class="form-control license-name" value="${
            license.name
          }" placeholder="License name">
        </div>
        <div class="col-md-3">
          <input type="number" class="form-control license-price" step="0.01" min="0" value="${
            license.price
          }" placeholder="Price">
        </div>
        <div class="col-auto" style="width: 50px;">
          <button class="btn btn-danger remove-btn" title="Remove">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `);
  },

  handleAddLicense: function () {
    // Capture current state from UI before adding a new license.
    const currentState = [];
    $("#licenseList .row").each(function () {
      currentState.push({
        name: $(this).find(".license-name").val(),
        price: parseFloat($(this).find(".license-price").val()) || 0,
      });
    });
    licenses = currentState;
    licenses.push({ name: "", price: 0 });
    this.renderLicenses();
  },

  handleSaveLicenses: function () {
    const updatedLicenses = [];
    $(".license-name").each(function () {
      updatedLicenses.push({
        name: $(this).val(),
        price:
          parseFloat($(this).closest(".row").find(".license-price").val()) || 0,
      });
    });
    LicenseStorage.saveLicenses(updatedLicenses)
      .then(() => {
        licenses = updatedLicenses;
        // Show a Bootstrap toast for feedback.
        const toastElement = document.getElementById("saveToast");
        if (toastElement) {
          const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
          toast.show();
        } else {
          console.error("Save toast element not found!");
        }
      })
      .catch((error) => {
        console.error("Error saving licenses:", error);
      });
  },

  handleExportCsv: function () {
    CSVHelper.exportToCsv(licenses);
  },

  handleImportCsv: function (e) {
    const file = e.target.files[0];
    if (file) {
      CSVHelper.importFromCsv(file)
        .then((importedLicenses) => {
          licenses = importedLicenses;
          this.renderLicenses();
        })
        .catch((error) => {
          console.error("Error importing CSV:", error);
        });
    }
  },

  handleConfirmRemoval: function () {
    if (pendingRemovalIndex !== null) {
      licenses.splice(pendingRemovalIndex, 1);
      this.renderLicenses();
      pendingRemovalIndex = null;
    }
    $("#confirmRemovalModal").modal("hide");
  },

  // Handlers for license-price event processing.
  handleLicensePriceKeydown: function (e) {
    const allowedKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
      "ArrowUp",
      "ArrowDown",
    ];

    if (allowedKeys.includes(e.key)) return;
    if (!/^[0-9,.]$/.test(e.key)) {
      e.preventDefault();
    }
  },

  handleLicensePriceInput: function () {
    let currentValue = $(this).val();
    const filteredValue = currentValue.replace(/[^0-9,.]/g, "");
    if (filteredValue !== currentValue) {
      $(this).val(filteredValue);
    }
  },
};

// Initialize the LicenseUI module on document ready.
$(document).ready(() => {
  LicenseUI.init();
});
