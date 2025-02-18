$(document).ready(() => {
  let licenses = [];
  let selectedLicense = null;

  // Load licenses from storage
  chrome.storage.local.get(["licenses"], (data) => {
    licenses = data.licenses || [];
    $("#licenseSearch").prop("disabled", false);
  });

  // Search functionality
  $("#licenseSearch").on("input", function () {
    const searchTerm = $(this).val().toLowerCase();
    $("#licenseResults").empty().show();

    if (searchTerm.length > 0) {
      const filtered = licenses.filter((license) =>
        license.name.toLowerCase().includes(searchTerm)
      );

      filtered.forEach((license) => {
        $("<li>")
          .addClass("dropdown-item")
          .html(
            `<strong>${license.name}</strong> <span class="text-muted">$${license.price}/mo</span>`
          )
          .click(() => {
            selectedLicense = license;
            $("#licenseSearch").val(license.name);
            $("#licenseResults").hide();
            calculateTotal();
          })
          .appendTo("#licenseResults");
      });
    }
  });

  // Calculation function
  const calculateTotal = () => {
    if (!selectedLicense || !$("#quantity").val()) {
      $("#result").text("0");
      return;
    }

    const quantity = parseInt($("#quantity").val()) || 0;
    const total = quantity * selectedLicense.price * 12;
    $("#result").text(Math.round(total));
  };

  // Quantity input handler
  $("#quantity").on("input", calculateTotal);

  // Copy to clipboard
  $("#copyIcon").on("dblclick", function () {
    const total = $("#result").text();
    if (total !== "0") {
      navigator.clipboard.writeText(total);
      $(this).addClass("text-success");
      setTimeout(() => $(this).removeClass("text-success"), 1000);
    }
  });

  // Hide dropdown when clicking outside
  $(document).on("click", (e) => {
    if (!$(e.target).closest(".dropdown").length) {
      $("#licenseResults").hide();
    }
  });
});
