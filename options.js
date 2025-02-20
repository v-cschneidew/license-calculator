// options.js

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
 * OptionsUI Module
 * Manages the Options page UI rendering and event handling.
 * Encapsulates its state variables internally.
 */
const OptionsUI = (function () {
  // A helper for debouncing functions.
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

  // Create an auto-save function that gathers current state from the DOM
  // and saves it using LicenseStorage. We debounce here so that rapidly occurring
  // events (like typing) do not trigger too many saves.
  const autoSave = debounce(function () {
    const updatedLicenses = [];
    $("#licenseList .row").each(function () {
      updatedLicenses.push({
        name: $(this).find(".license-name").val(),
        price: parseFloat($(this).find(".license-price").val()) || 0,
      });
    });
    LicenseStorage.saveLicenses(updatedLicenses)
      .then(() => {
        // Optionally, you could show a "saved" indicator instead of logging.
        console.log("Licenses auto-saved.");
      })
      .catch((error) => console.error("Error auto-saving licenses:", error));
  }, 800);

  return {
    init: function () {
      // Bind UI events.
      $("#addLicense").click(() => this.handleAddLicense());
      $("#exportCsv").click(() => this.handleExportCsv());
      $("#importCsv").change((e) => this.handleImportCsv(e));
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
      LicenseState.subscribe(() => this.renderLicenses());
    },

    renderLicenses: function () {
      const licenseList = $("#licenseList");
      licenseList.empty();
      const licenses = LicenseState.getLicenses();

      licenses.forEach((license, index) => {
        const licenseItem = this.createLicenseRow(license, index);
        licenseList.append(licenseItem);
      });

      if (!licenseList.hasClass("ui-sortable")) {
        licenseList.sortable({
          handle: ".handle",
          update: function () {
            const newLicenses = [];
            licenseList.children(".row").each(function (i) {
              $(this).attr("data-index", i);
              $(this)
                .find(".license-index")
                .text(i + 1 + ".");
              const name = $(this).find(".license-name").val();
              const price =
                parseFloat($(this).find(".license-price").val()) || 0;
              newLicenses.push({ name, price });
            });
            LicenseState.setLicenses(newLicenses);
            autoSave(); // Auto-save after the new order is set.
          },
        });
      }
    },

    createLicenseRow: function (license, index) {
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
      const currentState = [];
      $("#licenseList .row").each(function () {
        currentState.push({
          name: $(this).find(".license-name").val(),
          price: parseFloat($(this).find(".license-price").val()) || 0,
        });
      });
      LicenseState.setLicenses(currentState);
      LicenseState.addLicense({ name: "", price: 0 });
      autoSave(); // Auto-save after adding a license.
    },

    handleExportCsv: function () {
      CSVHelper.exportToCsv(LicenseState.getLicenses());
    },

    handleImportCsv: async function (e) {
      const file = e.target.files[0];
      if (file) {
        try {
          const importedLicenses = await CSVHelper.importFromCsv(file);
          LicenseState.setLicenses(importedLicenses);
          autoSave(); // Auto-save after importing CSV data.
        } catch (error) {
          console.error("Error importing CSV:", error);
        }
      }
      // Reset file input to allow re-importing the same file if needed.
      $(e.target).val("");
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
      autoSave(); // Auto-save on changes to the license price.
    },

    handleLicenseNameInput: function () {
      autoSave(); // Auto-save when the license name changes.
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
