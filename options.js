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
    $("#licenseList").empty();
    licenses.forEach((license, index) => {
      const licenseItem = $(`
          <div class="row g-3 mb-3" data-index="${index}">
            <div class="col-md-6">
              <input type="text" class="form-control license-name" 
                     value="${license.name}" placeholder="License name">
            </div>
            <div class="col-md-4">
              <input type="number" class="form-control license-price" 
                     step="0.01" value="${license.price}" placeholder="Price">
            </div>
            <div class="col-md-2">
              <button class="btn btn-danger w-100 remove-btn">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        `);

      licenseItem.find(".remove-btn").click(() => {
        licenses.splice(index, 1);
        renderLicenses();
      });

      $("#licenseList").append(licenseItem);
    });
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
      alert("Settings saved successfully!");
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
