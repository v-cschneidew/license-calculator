// options.js
$(document).ready(() => {
  let licenses = [];

  const loadLicenses = () => {
    chrome.storage.local.get(["licenses"], (data) => {
      licenses = data.licenses || [];
      renderLicenses();
    });
  };

  const renderLicenses = () => {
    const licenseList = $("#licenseList");
    licenseList.empty();

    licenses.forEach((license, index) => {
      const licenseItem = $(`
        <div class="row g-3 mb-3 align-items-center sortable-item" data-index="${index}">
          <div class="col-auto" style="width: 60px;">
            <div class="d-flex align-items-center">
              <i class="bi bi-grip-vertical handle" style="cursor: move; margin-right: 4px;"></i>
              <span class="license-index">${index + 1}.</span>
            </div>
          </div>
          <div class="col">
            <input type="text" class="form-control license-name" 
                   value="${license.name}" placeholder="License name">
          </div>
          <div class="col-md-3">
            <input type="number" class="form-control license-price" 
                   step="0.01" value="${license.price}" placeholder="Price">
          </div>
          <div class="col-auto" style="width: 50px;">
            <button class="btn btn-danger remove-btn" title="Remove">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `);

      // Remove button handler
      licenseItem.find(".remove-btn").click(() => {
        const index = licenseItem.data("index");
        licenses.splice(index, 1);
        renderLicenses();
      });

      licenseList.append(licenseItem);
    });

    // Initialize jQuery UI Sortable on the licenseList container if not already initialized.
    if (!licenseList.hasClass("ui-sortable")) {
      licenseList.sortable({
        handle: ".handle",
        update: function (event, ui) {
          const newLicenses = [];
          licenseList.children(".row").each(function (i) {
            // Update the displayed index in the compact handle/index column.
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
  };

  // Modified Add License button handler
  $("#addLicense").click(() => {
    // Save current state of all inputs
    const currentState = [];
    $("#licenseList .row").each(function () {
      currentState.push({
        name: $(this).find(".license-name").val(),
        price: parseFloat($(this).find(".license-price").val()) || 0,
      });
    });

    licenses = currentState;
    licenses.push({ name: "", price: 0 });
    renderLicenses();
  });

  // Save licenses
  $("#saveOptions").click(() => {
    const updatedLicenses = [];
    $(".license-name").each(function (index) {
      updatedLicenses.push({
        name: $(this).val(),
        price:
          parseFloat($(this).closest(".row").find(".license-price").val()) || 0,
      });
    });

    chrome.storage.local.set({ licenses: updatedLicenses }, () => {
      licenses = updatedLicenses;
      // Show Bootstrap Toast
      const toastElement = document.getElementById("saveToast");
      if (toastElement) {
        // Create a new toast instance with a 3-second delay
        const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
        toast.show();
      } else {
        console.error("Save toast element not found!");
      }
    });
  });

  // CSV Export
  $("#exportCsv").click(() => {
    const csvContent =
      "Name,Price\n" + licenses.map((l) => `${l.name},${l.price}`).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "licenses.csv";
    a.click();
  });

  // CSV Import
  $("#importCsv").change(function (e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const lines = event.target.result.split("\n").slice(1);
      licenses = lines
        .filter((line) => line.trim())
        .map((line) => {
          const [name, price] = line.split(",");
          return { name, price: parseFloat(price) };
        });
      renderLicenses();
    };

    reader.readAsText(file);
  });

  // Initial load
  loadLicenses();
});
