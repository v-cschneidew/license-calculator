$(document).ready(async () => {
  try {
    // Load licenses and then initialize the popup UI.
    await LicenseState.load();
    PopupUI.init();
  } catch (error) {
    console.error("Error initializing LicenseState:", error);
  }
});

/**
 * Utility Module for common helper functions
 * @namespace UtilityModule
 */
const UtilityModule = (function () {
  /**
   * Creates a debounced function that delays execution
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
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

/**
 * Data Module handling license selection and state management
 * @namespace DataModule
 */
const DataModule = (function () {
  let selectedLicense = null;

  /**
   * Initializes the data module by loading licenses
   * @returns {Array} Array of available licenses
   */
  function init() {
    // Licenses are already loaded in LicenseState.
    return LicenseState.getLicenses();
  }

  /**
   * Sets the currently selected license
   * @param {Object} license - License object to select
   */
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

/**
 * PopupUI Module handling all UI interactions and rendering
 * @namespace PopupUI
 */
const PopupUI = (function () {
  let activeIndex = -1;
  let $licenseSearch,
    $licenseResults,
    $quantity,
    $calculationDetails,
    $result,
    $copyIcon;

  /**
   * Initializes the popup UI components and event handlers
   */
  function init() {
    // Cache jQuery DOM elements
    $licenseSearch = $("#licenseSearch");
    $licenseResults = $("#licenseResults");
    $quantity = $("#quantity");
    $calculationDetails = $("#calculationDetails");
    $result = $("#result");
    $copyIcon = $("#copyIcon");
    const $card = $(".result-card");
    const $quantityContainer = $("#quantityContainer");

    // Hide all non-search elements on init
    $quantityContainer.hide();
    $card.hide();
    $licenseResults.hide();
    $("#sourceLink").hide();

    // Enable and focus on the search input
    $licenseSearch.prop("disabled", false).focus();

    bindUIEvents();
  }

  /**
   * Binds all UI event handlers with debouncing where appropriate
   */
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
      calculateTotal();

      // New: Auto-focus quantity input
      $quantity.focus().select();
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
        navigator.clipboard
          .writeText(total)
          .then(() => {
            const $tooltip = $("<span>")
              .addClass("copy-tooltip")
              .text("Copied!");
            $copyIcon.addClass("text-success").append($tooltip);
            setTimeout(() => {
              $tooltip.fadeOut(300, () => {
                $(this).remove();
                $copyIcon.removeClass("text-success");
              });
            }, 1000);
          })
          .catch((err) => {
            console.error("Clipboard error:", err);
          });
      }
    });

    // Hide dropdown when clicking outside
    $(document).on("click", function (e) {
      if (!$(e.target).closest(".dropdown").length) {
        $licenseResults.hide();
      }
    });

    // In bindUIEvents, add these keyboard handlers
    $quantity.on("keydown", (e) => {
      if (e.key === "Enter" && DataModule.getSelectedLicense()?.sourceUrl) {
        window.open(DataModule.getSelectedLicense().sourceUrl, "_blank");
      }
    });

    $licenseSearch.on("focus", () => {
      $licenseResults.show();
      renderDropdownItems($licenseSearch.val());
    });
  }

  /**
   * Updates the highlighted item in the dropdown list
   */
  function updateHighlightedItem() {
    $licenseResults.find("li").removeClass("active");
    if (activeIndex >= 0) {
      let $activeItem = $licenseResults.find("li").eq(activeIndex);
      $activeItem.addClass("active");
      $activeItem[0].scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  /**
   * Renders dropdown items based on search term
   * @param {string} searchTerm - Filter term for license search
   */
  function renderDropdownItems(searchTerm) {
    console.log("Fuse available?", typeof Fuse !== "undefined"); // Should log true
    $licenseResults.empty().show();
    activeIndex = -1;

    if (searchTerm.length > 0) {
      const licenses = DataModule.getLicenses();
      const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);

      const filtered = licenses.filter((license) => {
        const licenseWords = license.name.toLowerCase().split(/\s+/);
        return searchWords.every((word) =>
          licenseWords.some((lWord) => lWord.includes(word))
        );
      });

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

  /**
   * Calculates and displays the total cost based on selections
   * Handles three display cases:
   * 1. Valid price with source URL
   * 2. Valid price without source URL
   * 3. Source URL without valid price
   */
  function calculateTotal() {
    const selectedLicense = DataModule.getSelectedLicense();
    const $card = $(".result-card");
    const $cardBody = $card.find(".card-body");
    const $cardFooter = $card.find("#sourceLink");
    const $quantityContainer = $("#quantityContainer");

    // Reset all states
    $card.hide();
    $quantityContainer.hide();
    $cardBody.hide();
    $cardFooter.hide();
    $calculationDetails.text("");
    $result.text("0");

    if (!selectedLicense) return;

    const quantity = parseInt($quantity.val()) || 0;
    const hasValidPrice = selectedLicense.price > 0;
    const hasSourceUrl = !!selectedLicense.sourceUrl;

    // Reset card styling FIRST
    $card.css({
      background: "",
      boxShadow: "",
      padding: "",
    });
    $cardFooter.css({
      padding: "",
      borderTop: "", // Ensure border reset
    });

    // Re-attach card body if it was previously detached
    if (!$cardBody.parent().length) {
      $card.prepend($cardBody);
    }

    // Case 1: Valid price and source URL
    if (hasValidPrice && hasSourceUrl) {
      $quantityContainer.show();
      $cardBody.show();
      $cardFooter.show();
      const total = quantity * selectedLicense.price * 12;
      $calculationDetails.text(
        `$${selectedLicense.price} x 12 months x ${quantity} =`
      );
      $result.text(Math.round(total));
      $card.show();
    }
    // Case 2: Valid price only
    else if (hasValidPrice) {
      $quantityContainer.show();
      $cardBody.show();
      const total = quantity * selectedLicense.price * 12;
      $calculationDetails.text(
        `$${selectedLicense.price} x 12 months x ${quantity} =`
      );
      $result.text(Math.round(total));
      $card.show();
    }
    // Case 3: Source URL only (show JUST the source link WITHOUT the card body)
    else if (hasSourceUrl) {
      // Remove card body from DOM completely
      $cardBody.detach();

      // Show minimal card container with default styling
      $card.show().css({
        background: "",
        boxShadow: "",
      });

      // Show source link in footer with proper styling
      $cardFooter.show().css({
        padding: "0.75rem",
        borderTop: "1px solid rgba(0,0,0,.125)",
      });

      // Hide quantity and reset result
      $quantityContainer.hide();
      $result.text("0");

      // Update source link
      $cardFooter.find("a").attr("href", selectedLicense.sourceUrl);
    }

    // Update source link if present in normal cases
    if (hasSourceUrl && hasValidPrice) {
      $cardFooter.find("a").attr("href", selectedLicense.sourceUrl);
    }
  }

  return {
    init,
    calculateTotal,
  };
})();
