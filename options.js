// options.js

/**
 * CSVHelper Module
 * Handles bidirectional conversion between license data and CSV format.
 * @namespace CSVHelper
 */
const CSVHelper = {
  /**
   * Generates CSV file from licenses array and triggers browser download
   * @param {Array.<Object>} licenses - Array of license objects to export
   * @param {string} licenses[].name - License name (preserves whitespace)
   * @param {number} licenses[].price - License price
   * @param {string} licenses[].sourceUrl - Source URL for license
   */
  exportToCsv: function (licenses) {
    const csvContent = Papa.unparse({
      fields: ["Name", "Price", "Source URL"],
      data: licenses.map((l) => [l.name, l.price, l.sourceUrl]),
    });
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "licenses.csv";
    a.click();
  },

  /**
   * Parses CSV file into license objects with validation
   * @param {File} file - CSV file uploaded by user
   * @returns {Promise.<Array.<Object>>} Promise resolving to array of sanitized license objects
   * @throws {Error} On parsing failures or invalid CSV structure
   */
  importFromCsv: function (file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        error: function (err) {
          reject(new Error(`CSV parsing failed: ${err.message}`));
        },
        complete: function (results) {
          if (results.errors.length > 0) {
            return reject(new Error(results.errors[0].message));
          }

          const importedLicenses = results.data.map((record, index) => {
            const name = record.Name || record.name;
            if (!name?.trim()) {
              throw new Error(`Missing license name at row ${index + 1}`);
            }

            return {
              name: name.trim(),
              price: parseFloat(record.Price || record.price) || 0,
              sourceUrl: (
                record["Source URL"] ||
                record.sourceUrl ||
                ""
              ).trim(),
            };
          });

          resolve(importedLicenses);
        },
      });
    });
  },
};

/**
 * OptionsUI Module
 * Manages the options page UI state and interactions. Handles:
 * - License list rendering
 * - User input validation
 * - Auto-save functionality
 * - CSV import/export
 * @namespace OptionsUI
 */
const OptionsUI = (function () {
  /**
   * Debounce function for rate-limiting expensive operations
   * @param {Function} func - Function to debounce
   * @param {number} wait - Debounce delay in milliseconds
   * @param {boolean} [immediate=false] - Trigger on leading edge
   * @returns {Function} Debounced function
   */
  function debounce(func, wait, immediate) {
    let timeout;
    return function (...args) {
      const context = this;
      const later = function () {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }

  // This variable tracks which license is pending removal.
  let pendingRemovalIndex = null;

  /**
   * Sanitizes license data while preserving user-entered whitespace
   * @param {Object} license - Raw license data from inputs
   * @returns {Object} Sanitized license with validated types
   */
  function sanitizeLicenseData(license) {
    return {
      name: license.name || "",
      price: parseFloat(license.price) || 0,
      sourceUrl: (license.sourceUrl || "").trim(),
    };
  }

  /**
   * Shows the auto-save success toast notification
   * Uses Bootstrap 5 toast component
   */
  function showToast() {
    const toast = document.getElementById("autoSaveToast");
    if (toast) {
      new bootstrap.Toast(toast).show();
    }
  }

  /**
   * Auto-save handler with final validation check
   * @type {Function}
   * @description Debounced function that:
   * 1. Checks all licenses have non-whitespace names
   * 2. Persists to storage if valid
   * 3. Shows success toast
   */
  const autoSave = debounce(function () {
    const licenses = LicenseState.getLicenses();
    const hasValidNames = licenses.every((l) => l.name.trim().length > 0);

    if (hasValidNames) {
      LicenseState.save().then(() => showToast());
    }
  }, 800);

  return {
    /**
     * Initializes options page UI:
     * - Binds event handlers
     * - Sets up license list sorting
     * - Renders initial license list
     * - Subscribes to license state changes
     */
    init: function () {
      // Bind UI events.
      $("#addLicense").click(() => this.handleAddLicense());
      $("#exportCsv").click(() => this.handleExportCsv());
      $("#importCsvBtn").click(() => $("#importCsv").click());
      $("#confirmRemoveBtn").click(() => this.handleConfirmRemoval());

      // Handle license price events.
      $(document).on(
        "keydown",
        ".license-price",
        this.handleLicensePriceKeydown
      );
      $(document).on("input", ".license-price", this.handleLicensePriceInput);

      // Bind an input event for license name changes so that these modifications are auto-saved:
      $(document).on("input", ".license-name", this.handleLicenseNameInput);

      // Wire up removal events for license rows: when the remove button is clicked...
      $("#licenseList").on("click", ".remove-btn", (e) => {
        const $row = $(e.currentTarget).closest(".row");
        const index = parseInt($row.attr("data-index"), 10);
        // If index cannot be determined, just bail.
        if (isNaN(index)) return;
        // Update the modal's text with the license name.
        const name = $row.find(".license-name").val() || "this license";
        $("#licenseName").text(name);
        // Store the index for removal.
        pendingRemovalIndex = index;
        $("#confirmRemovalModal").modal("show");
      });

      // Clear the pending removal index if the modal is dismissed (e.g. by clicking Cancel).
      $("#confirmRemovalModal").on("hidden.bs.modal", () => {
        pendingRemovalIndex = null;
      });

      // Subscribe to changes from LicenseState so that the UI updates automatically.
      LicenseState.subscribe(debounce(() => this.renderLicenses(), 300));

      // Add event listener for URL input
      $(document).on("change", ".license-url", function () {
        const $row = $(this).closest(".row");
        const index = parseInt($row.attr("data-index"), 10);
        const license = LicenseState.getLicenses()[index];
        const url = $(this).val().trim();

        if (url && !isValidUrl(url)) {
          $(this).addClass("is-invalid");
          if (!$(this).next(".invalid-feedback").length) {
            $(this).after(
              '<div class="invalid-feedback">Please enter a valid http:// or https:// URL</div>'
            );
          }
          // Revert to last valid value
          $(this).val(license.sourceUrl);
          return; // Prevent saving invalid URL
        }

        $(this).removeClass("is-invalid");
        $(this).next(".invalid-feedback").remove();

        LicenseState.updateLicense(index, {
          ...license,
          sourceUrl: url,
        });

        // Add name validation check before saving
        const nameValid = $row.find(".license-name").val().trim().length > 0;
        if (nameValid) {
          autoSave();
        }
      });

      // Modify the event handlers to update LicenseState
      $(document).on("input", ".license-name", function () {
        const $row = $(this).closest(".row");
        const index = parseInt($row.attr("data-index"), 10);
        const license = LicenseState.getLicenses()[index];
        LicenseState.updateLicense(index, {
          ...license,
          name: $(this).val(),
        });
        autoSave();
      });

      $(document).on("input", ".license-price", function () {
        const $row = $(this).closest(".row");
        const index = parseInt($row.attr("data-index"), 10);
        const license = LicenseState.getLicenses()[index];

        // Get raw input value
        let rawValue = $(this).val();

        // Filter invalid characters
        const filteredValue = rawValue.replace(/[^0-9.,]/g, "");

        // Update input display immediately
        if (filteredValue !== rawValue) {
          $(this).val(filteredValue);
        }

        // Parse numeric value
        const numericValue = parseFloat(filteredValue.replace(/,/g, ".")) || 0;

        // Update state with numeric value
        LicenseState.updateLicense(index, {
          ...license,
          price: numericValue,
        });

        // Add name validation check before saving
        const nameValid = $row.find(".license-name").val().trim().length > 0;
        if (nameValid) {
          autoSave();
        }
      });

      // Add this event listener:
      $("#importCsv").on("change", (e) => this.handleImportCsv(e));
    },

    /**
     * Renders license list while preserving user input:
     * - Maintains existing input values
     * - Manages row count and indices
     * - Initializes sortable once
     */
    renderLicenses: function () {
      const licenseList = $("#licenseList");
      const licenses = LicenseState.getLicenses();
      const currentCount = licenses.length;
      const previousCount = licenseList.children(".row").length;

      // Full re-render when count changes
      if (currentCount !== previousCount) {
        licenseList.empty();
        licenses.forEach((license, index) => {
          licenseList.append(this.createLicenseRow(license, index));
        });

        // Re-initialize sortable
        if (licenseList.hasClass("ui-sortable")) {
          licenseList.sortable("destroy");
          licenseList.removeClass("ui-sortable");
        }
        this.initializeSortable();
      } else {
        // Just update indices when count remains the same
        licenseList.children(".row").each(function (index) {
          const $row = $(this);
          $row.attr("data-index", index);
          $row.find(".license-index").text(index + 1 + ".");
        });
      }
    },

    initializeSortable: function () {
      const licenseList = $("#licenseList");
      licenseList.sortable({
        handle: ".handle",
        update: function () {
          const newLicenses = [];
          licenseList.children(".row").each(function (i) {
            const name = $(this).find(".license-name").val();
            const price = parseFloat($(this).find(".license-price").val()) || 0;
            const sourceUrl = $(this).find(".license-url").val() || "";
            newLicenses.push({ name, price, sourceUrl });
          });
          LicenseState.setLicenses(newLicenses);
          autoSave();
        },
      });
      licenseList.addClass("ui-sortable");
    },

    createLicenseRow: function (license, index) {
      const escapedName = $("<div>").text(license.name).html();
      const escapedUrl = $("<div>")
        .text(license.sourceUrl || "")
        .html();

      return $(`
        <div class="row g-3 mb-3 align-items-center sortable-item" data-index="${index}">
          <div class="col-auto" style="width: 60px;">
            <div class="d-flex align-items-center">
              <i class="bi bi-grip-vertical handle" style="cursor: move; margin-right: 4px;"></i>
              <span class="license-index">${index + 1}.</span>
            </div>
          </div>
          <div class="col">
            <input type="text" class="form-control license-name" value="${escapedName}" placeholder="License name" autocomplete="off">
          </div>
          <div class="col-md-3">
            <input type="number" class="form-control license-price" step="0.01" min="0" value="${
              license.price
            }" placeholder="Price" autocomplete="off">
          </div>
          <div class="col">
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-link-45deg"></i></span>
              <input type="url" class="form-control license-url" value="${escapedUrl}" placeholder="Pricing source URL" autocomplete="off">
            </div>
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
      LicenseState.addLicense({ name: "", price: 0, sourceUrl: "" });
      // No autoSave call here - new empty row won't trigger save
    },

    handleExportCsv: function () {
      CSVHelper.exportToCsv(LicenseState.getLicenses());
    },

    handleImportCsv: async function (e) {
      const fileInput = e.target;
      const file = fileInput.files[0];

      if (!file) return;

      try {
        const importedLicenses = await CSVHelper.importFromCsv(file);
        const sanitizedLicenses = importedLicenses.map(sanitizeLicenseData);

        // Update state and wait for save completion
        await LicenseState.setLicenses(sanitizedLicenses);

        this.renderLicenses();
        showToast(); // Only show after successful save
      } catch (error) {
        console.error("CSV Import Error:", error);
        alert(`Import failed: ${error.message}`);
      } finally {
        fileInput.value = "";
      }
    },

    handleConfirmRemoval: function () {
      if (pendingRemovalIndex !== null) {
        LicenseState.removeLicense(pendingRemovalIndex);
        pendingRemovalIndex = null;
        autoSave(); // Auto-save after removal.
      }
      $("#confirmRemovalModal").modal("hide");
    },

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

      // Add name validation check before saving
      const $row = $(this).closest(".row");
      const nameValid = $row.find(".license-name").val().trim().length > 0;
      if (nameValid) {
        autoSave();
      }
    },

    /**
     * Handles license name input events:
     * - Updates license state with raw value
     * - Queues auto-save with validation
     */
    handleLicenseNameInput: function () {
      const $input = $(this);
      const inputValue = $input.val();

      // Update state immediately with raw value
      const $row = $input.closest(".row");
      const index = parseInt($row.attr("data-index"), 10);
      const license = LicenseState.getLicenses()[index];
      LicenseState.updateLicense(index, {
        ...license,
        name: inputValue,
      });

      // Always queue auto-save - final check happens in autoSave itself
      autoSave();
    },
  };
})();

// Initialize OptionsUI on document ready.
$(document).ready(() => {
  LicenseState.load().catch((error) => {
    console.error("Failed to load licenses:", error);
  });
  OptionsUI.init();
});

function isValidUrl(string) {
  if (!string) return true; // Empty URLs are considered valid
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}
