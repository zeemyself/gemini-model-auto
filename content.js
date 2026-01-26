// content.js

// CONFIGURATION
const TARGET_MODEL_NAME = "Pro";
const TARGET_MODEL_DESC = "Thinks longer"; // Helps confirm it's the high-reasoning model

// Selector based on the specific class found in your HTML snippet
const MODEL_SWITCHER_SELECTOR = "button.mdc-button.mat-mdc-button-base.input-area-switch.mat-mdc-button.mat-unthemed.ng-star-inserted";

const DELAY = 10;

function switchModel() {
  // 1. Find the button using the specific Angular class
  const switcherButton = document.querySelector(MODEL_SWITCHER_SELECTOR);

  if (!switcherButton) return;

  // 2. Check if we are ALREADY on the Pro model
  // We check the text inside the button. Your snippet showed <span>Pro</span> inside it.
  if (switcherButton.innerText.includes(TARGET_MODEL_NAME)) {
    // We are already on Pro, so we do nothing.
    return;
  }

  console.log("Gemini Auto-Pro: Detected different model. Switching to Pro...");

  // 3. Open the Menu
  switcherButton.click();

  // 4. Find and Click the specific "Pro" option in the dropdown
  setTimeout(() => {
    // We use a specific XPath to find the menu item text container directly
    // This targets the specific span class seen in the logs, avoiding parent containers
    const menuItems = document.evaluate(
      `//span[contains(@class, 'mat-mdc-menu-item-text') and contains(., '${TARGET_MODEL_NAME}') and contains(., '${TARGET_MODEL_DESC}')]`,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );

    console.log(menuItems);

    if (menuItems.snapshotLength > 0) {
      // Click the matching menu item directly
      menuItems.snapshotItem(0).click();
      console.log("Gemini Auto-Pro: Switched to Pro.");
    } else {
      console.log("Gemini Auto-Pro: Could not find 'Pro' model in menu.");
      // Optional: Close the menu if we failed so it doesn't block the screen
      switcherButton.click(); 
    }
  }, DELAY); // 500ms delay to let the menu animation finish
}

// 5. Run loop to watch for page changes
// Since Gemini is a "Single Page App", the button might re-appear or change text without a reload.
let switchTimeout;
const observer = new MutationObserver((mutations) => {
  clearTimeout(switchTimeout);
  // We wait 1.5 seconds after page activity to let elements settle before checking
  switchTimeout = setTimeout(switchModel, DELAY); 
});

// Start observing the page
observer.observe(document.body, { childList: true, subtree: true });