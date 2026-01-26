// content.js

// Default Config
let config = {
  targetModelName: "Pro",
  targetModelDesc: "Thinks longer",
  modelSwitcherSelector: "button.mdc-button.mat-mdc-button-base.input-area-switch.mat-mdc-button.mat-unthemed.ng-star-inserted",
  delay: 10
};

// Function to update config from storage
function updateConfig(items) {
  if (items.targetModelName) config.targetModelName = items.targetModelName;
  if (items.targetModelDesc) config.targetModelDesc = items.targetModelDesc;
  if (items.modelSwitcherSelector) config.modelSwitcherSelector = items.modelSwitcherSelector;
  if (items.delay) config.delay = items.delay;
}

// Initialize config from storage
chrome.storage.sync.get(config, (items) => {
  updateConfig(items);
  // Start observing only after we have the initial config (optional, but good practice)
  startObserver();
});

// Listen for changes in storage
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    for (let key in changes) {
      if (config.hasOwnProperty(key)) {
        config[key] = changes[key].newValue;
      }
    }
    console.log("Gemini Auto-Pro: Configuration updated.", config);
  }
});

function switchModel() {
  // 1. Find the button using the specific configured selector
  const switcherButton = document.querySelector(config.modelSwitcherSelector);

  if (!switcherButton) return;

  // 2. Check if we are ALREADY on the target model
  // We check the text inside the button.
  if (switcherButton.innerText.includes(config.targetModelName)) {
    // We are already on the target model, so we do nothing.
    return;
  }

  console.log(`Gemini Auto-Pro: Detected different model. Switching to ${config.targetModelName}...`);

  // 3. Open the Menu
  switcherButton.click();

  // 4. Find and Click the specific option in the dropdown
  setTimeout(() => {
    // We use a specific XPath to find the menu item text container directly
    const xpath = `//span[contains(@class, 'mat-mdc-menu-item-text') and contains(., '${config.targetModelName}') and contains(., '${config.targetModelDesc}')]`;
    
    const menuItems = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );

    console.log(menuItems);

    if (menuItems.snapshotLength > 0) {
      // Click the matching menu item directly
      menuItems.snapshotItem(0).click();
      console.log(`Gemini Auto-Pro: Switched to ${config.targetModelName}.`);
    } else {
      console.log(`Gemini Auto-Pro: Could not find '${config.targetModelName}' model in menu.`);
      // Optional: Close the menu if we failed so it doesn't block the screen
      switcherButton.click(); 
    }
  }, config.delay); 
}

// 5. Run loop to watch for page changes
let switchTimeout;
let observer;

function startObserver() {
  if (observer) return; // Already started

  observer = new MutationObserver((mutations) => {
    clearTimeout(switchTimeout);
    // We wait a bit after page activity to let elements settle before checking
    switchTimeout = setTimeout(switchModel, config.delay); 
  });

  // Start observing the page
  observer.observe(document.body, { childList: true, subtree: true });
}