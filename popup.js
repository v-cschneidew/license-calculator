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
  $("#quantity").on("input", function () {
    // Remove any non-digit characters to enforce whole integers
    this.value = this.value.replace(/[^0-9]/g, "");
    calculateTotal();
  });

  // Copy to clipboard with visual feedback
  $("#copyIcon").on("click", function () {
    const total = $("#result").text();
    if (total !== "0") {
      navigator.clipboard.writeText(total);
      const $copyIcon = $(this);
      $copyIcon.addClass("text-success");

      // Create the tooltip and append it as a child of the icon
      const $tooltip = $("<span>").addClass("copy-tooltip").text("Copied!");
      $copyIcon.append($tooltip);

      // Fade out and remove the tooltip after 1 second
      setTimeout(() => {
        $tooltip.fadeOut(300, function () {
          $(this).remove();
        });
        $copyIcon.removeClass("text-success");
      }, 1000);
    }
  });

  // Hide dropdown when clicking outside
  $(document).on("click", (e) => {
    if (!$(e.target).closest(".dropdown").length) {
      $("#licenseResults").hide();
    }
  });
});
