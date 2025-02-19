$(document).ready(() => {
  let licenses = [];
  let selectedLicense = null;
  let activeIndex = -1; // For keyboard navigation

  // Debounce function to limit rate of function execution
  function debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fn.apply(this, args);
      }, delay);
    };
  }

  // Update highlighted dropdown item based on activeIndex
  function updateHighlightedItem() {
    $("#licenseResults li").removeClass("active");
    if (activeIndex >= 0) {
      $("#licenseResults li").eq(activeIndex).addClass("active");
    }
  }

  // Load licenses from storage and focus on the search input automatically
  chrome.storage.local.get(["licenses"], (data) => {
    licenses = data.licenses || [];
    $("#licenseSearch").prop("disabled", false);
    $("#licenseSearch").focus(); // Auto-focus on search input upon popup open
  });

  // Render dropdown items based on the search term
  function renderDropdownItems(searchTerm) {
    $("#licenseResults").empty().show();
    activeIndex = -1; // Reset active index

    if (searchTerm.length > 0) {
      const filtered = licenses.filter((license) =>
        license.name.toLowerCase().includes(searchTerm)
      );

      if (filtered.length === 0) {
        // Provide clear "No Matches Found" feedback
        $("<li>")
          .addClass("dropdown-item disabled")
          .text("No Matches Found")
          .appendTo("#licenseResults");
      } else {
        filtered.forEach((license) => {
          $("<li>")
            .addClass("dropdown-item")
            .html(
              `<strong>${license.name}</strong> <span class="text-muted">$${license.price}/mo</span>`
            )
            .on("click", () => {
              selectedLicense = license;
              $("#licenseSearch").val(license.name);
              $("#quantity").val("1"); // Auto-set quantity to 1 on license selection
              $("#licenseResults").hide();
              calculateTotal();
            })
            .appendTo("#licenseResults");
        });
      }
    }
  }

  // Debounced search handler
  const debouncedSearchHandler = debounce(function () {
    const searchTerm = $("#licenseSearch").val().toLowerCase();
    renderDropdownItems(searchTerm);
  }, 300);

  // Search functionality (debounced)
  $("#licenseSearch").on("input", debouncedSearchHandler);

  // Keyboard navigation for the dropdown
  $("#licenseSearch").on("keydown", function (e) {
    const $items = $("#licenseResults li");
    if ($items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = activeIndex < $items.length - 1 ? activeIndex + 1 : 0;
      updateHighlightedItem();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = activeIndex > 0 ? activeIndex - 1 : $items.length - 1;
      updateHighlightedItem();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && !$items.eq(activeIndex).hasClass("disabled")) {
        $items.eq(activeIndex).click();
      }
    }
  });

  // Calculation function
  const calculateTotal = () => {
    if (!selectedLicense || !$("#quantity").val()) {
      $("#calculationDetails").text(""); // Clear previous details
      $("#result").text("0");
      return;
    }

    const quantity = parseInt($("#quantity").val()) || 0;
    const price = selectedLicense.price;

    // Build a calculation string such as "$20 x 12 months x 5 ="
    const calcString = `$${price} x 12 months x ${quantity} =`;
    const total = quantity * price * 12;

    // Update UI elements for detailed calculation and final result
    $("#calculationDetails").text(calcString);
    $("#result").text(Math.round(total));
  };

  // Quantity input handler
  $("#quantity").on("input", function () {
    // Remove non-digit characters
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

      // Create and append tooltip
      const $tooltip = $("<span>").addClass("copy-tooltip").text("Copied!");
      $copyIcon.append($tooltip);

      // Fade out and remove tooltip after 1 second
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
