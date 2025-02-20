$(document).ready(async () => {
  try {
    // Load licenses and then initialize the popup UI.
    await LicenseState.load();
    PopupUI.init();
  } catch (error) {
    console.error("Error initializing LicenseState:", error);
  }
});

// Utility Module for common helper functions
const UtilityModule = (function () {
  function debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fn.apply(this, args);
      }, delay);
    };
  }
  return { debounce };
})();

// Updated Data Module to use LicenseState
const DataModule = (function () {
  let selectedLicense = null;

  function init() {
    // Licenses are already loaded in LicenseState.
    return LicenseState.getLicenses();
  }

  function setSelectedLicense(license) {
    selectedLicense = license;
  }

  function getSelectedLicense() {
    return selectedLicense;
  }

  function getLicenses() {
    return LicenseState.getLicenses();
  }

  return {
    init,
    setSelectedLicense,
    getSelectedLicense,
    getLicenses,
  };
})();

// Rename UIModule to PopupUI for clarity.
const PopupUI = (function () {
  let activeIndex = -1;
  let $licenseSearch,
    $licenseResults,
    $quantity,
    $calculationDetails,
    $result,
    $copyIcon;

  function init() {
    // Cache jQuery DOM elements
    $licenseSearch = $("#licenseSearch");
    $licenseResults = $("#licenseResults");
    $quantity = $("#quantity");
    $calculationDetails = $("#calculationDetails");
    $result = $("#result");
    $copyIcon = $("#copyIcon");

    // Enable and focus on the search input after data is loaded
    $licenseSearch.prop("disabled", false);
    $licenseSearch.focus();

    bindUIEvents();
  }

  function bindUIEvents() {
    // Debounced search handler
    const debouncedSearchHandler = UtilityModule.debounce(function () {
      const searchTerm = $licenseSearch.val().toLowerCase();
      renderDropdownItems(searchTerm);
    }, 300);
    $licenseSearch.on("input", debouncedSearchHandler);

    // Keyboard navigation for the dropdown
    $licenseSearch.on("keydown", function (e) {
      const $items = $licenseResults.find("li");
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

    // Click event for dropdown items using delegation
    $licenseResults.on("click", "li.dropdown-item:not(.disabled)", function () {
      const licenseName = $(this).find("strong").text();
      const licenses = DataModule.getLicenses();
      const license = licenses.find((lic) => lic.name === licenseName);
      DataModule.setSelectedLicense(license);
      $licenseSearch.val(license.name);
      $quantity.val("1");
      $licenseResults.hide();
      updateSourceLink(license);
      calculateTotal();
    });

    // Quantity input handler
    $quantity.on("input", function () {
      this.value = this.value.replace(/[^0-9]/g, "");
      calculateTotal();
    });

    // Copy to clipboard with visual copy feedback
    $copyIcon.on("click", function () {
      const total = $result.text();
      if (total !== "0") {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(total).catch((err) => {
            console.error("Clipboard error:", err);
          });
        } else {
          const $tempInput = $("<textarea>");
          $("body").append($tempInput);
          $tempInput.val(total).select();
          document.execCommand("copy");
          $tempInput.remove();
        }
        const $tooltip = $("<span>").addClass("copy-tooltip").text("Copied!");
        $copyIcon.addClass("text-success").append($tooltip);
        setTimeout(function () {
          $tooltip.fadeOut(300, function () {
            $(this).remove();
            $copyIcon.removeClass("text-success");
          });
        }, 1000);
      }
    });

    // Hide dropdown when clicking outside
    $(document).on("click", function (e) {
      if (!$(e.target).closest(".dropdown").length) {
        $licenseResults.hide();
      }
    });
  }

  function updateHighlightedItem() {
    $licenseResults.find("li").removeClass("active");
    if (activeIndex >= 0) {
      let $activeItem = $licenseResults.find("li").eq(activeIndex);
      $activeItem.addClass("active");
      $activeItem[0].scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function renderDropdownItems(searchTerm) {
    $licenseResults.empty().show();
    activeIndex = -1;

    if (searchTerm.length > 0) {
      const licenses = DataModule.getLicenses();
      const filtered = licenses.filter((license) =>
        license.name.toLowerCase().includes(searchTerm)
      );
      if (filtered.length === 0) {
        $("<li>")
          .addClass("dropdown-item disabled")
          .text("No Matches Found")
          .appendTo($licenseResults);
      } else {
        filtered.forEach((license) => {
          $("<li>")
            .addClass("dropdown-item")
            .html(
              `<strong>${license.name}</strong> <span class="text-muted">$${license.price}/mo</span>`
            )
            .appendTo($licenseResults);
        });
      }
    } else {
      $licenseResults.hide();
    }
  }

  function calculateTotal() {
    const selectedLicense = DataModule.getSelectedLicense();
    if (!selectedLicense || !$quantity.val()) {
      $calculationDetails.text("");
      $result.text("0");
      return;
    }
    const quantity = parseInt($quantity.val()) || 0;
    const price = selectedLicense.price;
    const calcString = `$${price} x 12 months x ${quantity} =`;
    const total = quantity * price * 12;

    $calculationDetails.text(calcString);
    $result.text(Math.round(total));
  }

  function updateSourceLink(license) {
    const $sourceLink = $("#sourceLink");
    if (license && license.sourceUrl) {
      $sourceLink.find("a").attr("href", license.sourceUrl);
      $sourceLink.show();
    } else {
      $sourceLink.hide();
    }
  }

  return {
    init,
    calculateTotal,
  };
})();
