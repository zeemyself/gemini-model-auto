// content.js

const DEFAULT_PRESET = "pro";
const CURRENT_EXTENSION_VERSION = chrome.runtime.getManifest().version;

const MODEL_PRESETS = {
  fast: {
    targetModelName: "Fast",
    targetModelDesc: "Answers quickly"
  },
  thinking: {
    targetModelName: "Thinking",
    targetModelDesc: "Solves complex problems"
  },
  pro: {
    targetModelName: "Pro",
    targetModelDesc: "Advanced math and code with 3.1 Pro"
  }
};

// Default Config
let config = {
  enabled: true,
  modelPreset: DEFAULT_PRESET,
  modelConfigVersion: "",
  targetModelName: "Pro",
  targetModelDesc: "Advanced math and code with 3.1 Pro",
  modelSwitcherSelector: "button.mdc-button.mat-mdc-button-base.input-area-switch.mat-mdc-button.mat-unthemed.ng-star-inserted",
  delay: 10
};

// Function to update config from storage
function updateConfig(items) {
  if (items.enabled !== undefined) config.enabled = items.enabled;
  if (items.modelPreset !== undefined) config.modelPreset = items.modelPreset;
  if (items.modelConfigVersion !== undefined) config.modelConfigVersion = items.modelConfigVersion;
  if (items.targetModelName !== undefined) config.targetModelName = items.targetModelName;
  if (items.targetModelDesc !== undefined) config.targetModelDesc = items.targetModelDesc;
  if (items.modelSwitcherSelector !== undefined) config.modelSwitcherSelector = items.modelSwitcherSelector;
  if (items.delay !== undefined) config.delay = items.delay;
}

function normalize(value) {
  return (value || "").trim().toLowerCase();
}

function inferPresetFromModelName(targetModelName) {
  const normalizedName = normalize(targetModelName);
  if (!normalizedName) return null;

  for (const [presetKey, preset] of Object.entries(MODEL_PRESETS)) {
    if (normalize(preset.targetModelName) === normalizedName) {
      return presetKey;
    }
  }

  return null;
}

function resolvePreset(storedPreset, targetModelName) {
  if (storedPreset && MODEL_PRESETS[storedPreset]) return storedPreset;
  const inferred = inferPresetFromModelName(targetModelName);
  return inferred || DEFAULT_PRESET;
}

function getPresetValues(presetKey) {
  return MODEL_PRESETS[presetKey] || MODEL_PRESETS[DEFAULT_PRESET];
}

function normalizeStoredModelConfig(items) {
  const resolvedPreset = resolvePreset(items.modelPreset, items.targetModelName);
  const presetValues = getPresetValues(resolvedPreset);
  const isCurrentVersion = items.modelConfigVersion === CURRENT_EXTENSION_VERSION;

  const targetModelName = isCurrentVersion && items.targetModelName
    ? items.targetModelName
    : presetValues.targetModelName;
  const targetModelDesc = isCurrentVersion && items.targetModelDesc
    ? items.targetModelDesc
    : presetValues.targetModelDesc;

  const needsStorageUpdate = (
    items.modelPreset !== resolvedPreset ||
    items.modelConfigVersion !== CURRENT_EXTENSION_VERSION ||
    items.targetModelName !== targetModelName ||
    items.targetModelDesc !== targetModelDesc
  );

  const normalizedItems = {
    ...items,
    modelPreset: resolvedPreset,
    modelConfigVersion: CURRENT_EXTENSION_VERSION,
    targetModelName,
    targetModelDesc
  };

  const storagePatch = needsStorageUpdate
    ? {
      modelPreset: resolvedPreset,
      modelConfigVersion: CURRENT_EXTENSION_VERSION,
      targetModelName,
      targetModelDesc
    }
    : null;

  return { normalizedItems, storagePatch };
}

// Initialize config from storage
chrome.storage.sync.get(config, (items) => {
  const { normalizedItems, storagePatch } = normalizeStoredModelConfig(items);
  updateConfig(normalizedItems);
  if (storagePatch) {
    chrome.storage.sync.set(storagePatch);
  }
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
    if (changes.enabled !== undefined) {
      if (!changes.enabled.newValue) {
        console.log("Gemini Auto-Pro: Extension disabled.");
      } else {
        console.log("Gemini Auto-Pro: Extension enabled.");
        switchModel();
      }
    }
  }
});

const PROMPT_INPUT_SELECTORS = [
  "rich-textarea .ql-editor[contenteditable='true']",
  ".ql-editor[contenteditable='true'][role='textbox']",
  "div[contenteditable='true'][aria-label*='prompt']",
  "textarea[aria-label*='prompt']"
];

function getPromptInput() {
  for (const selector of PROMPT_INPUT_SELECTORS) {
    const input = document.querySelector(selector);
    if (input) return input;
  }
  return null;
}

function focusPromptInput(retryCount = 0) {
  const input = getPromptInput();

  if (input) {
    input.focus({ preventScroll: true });
    return;
  }

  if (retryCount < 8) {
    setTimeout(() => focusPromptInput(retryCount + 1), 50);
  }
}

function switchModel() {
  if (!config.enabled) return;
  const targetName = (config.targetModelName || "").trim();
  const targetDesc = (config.targetModelDesc || "").trim();
  if (!targetName) return;

  // 1. Find the button using the specific configured selector
  const switcherButton = getSwitcherButton();

  if (!switcherButton) return;

  // 2. Check if we are ALREADY on the target model
  // We check the text inside the button.
  const currentModelLabel = (switcherButton.innerText || "").toLowerCase();
  if (currentModelLabel.includes(targetName.toLowerCase())) {
    // We are already on the target model, so we do nothing.
    return;
  }

  console.log(`Gemini Auto-Pro: Detected different model. Switching to ${targetName}...`);

  // 3. Open the Menu
  switcherButton.click();

  // 4. Find and Click the specific option in the dropdown
  setTimeout(() => {
    const menuItem = findBestMenuItem(targetName, targetDesc);

    if (menuItem) {
      const clickableMenuItem = menuItem.closest("button,[role='menuitem']") || menuItem;
      clickableMenuItem.click();
      console.log(`Gemini Auto-Pro: Switched to ${targetName}.`);
      setTimeout(() => focusPromptInput(), config.delay);
    } else {
      console.log(`Gemini Auto-Pro: Could not find '${targetName}' model in menu.`);
      // Optional: Close the menu if we failed so it doesn't block the screen
      switcherButton.click();
      setTimeout(() => focusPromptInput(), config.delay);
    }
  }, config.delay); 
}

function getSwitcherButton() {
  try {
    return document.querySelector(config.modelSwitcherSelector);
  } catch (error) {
    console.log("Gemini Auto-Pro: Invalid model switcher selector.", error);
    return null;
  }
}

function escapeXPathValue(value) {
  if (!value.includes("'")) {
    return `'${value}'`;
  }
  if (!value.includes('"')) {
    return `"${value}"`;
  }
  const fragments = value.split("'").map((part) => `'${part}'`);
  return `concat(${fragments.join(`, "'", `)})`;
}

function findMenuItemByXPath(xpath) {
  const results = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  if (results.snapshotLength === 0) return null;
  return results.snapshotItem(0);
}

function findBestMenuItem(targetName, targetDesc) {
  const escapedName = escapeXPathValue(targetName);
  const escapedDesc = targetDesc ? escapeXPathValue(targetDesc) : null;

  // Prefer exact intent: both name and description.
  if (escapedDesc) {
    const fullMatchXpath = `//span[contains(@class, 'mat-mdc-menu-item-text') and contains(., ${escapedName}) and contains(., ${escapedDesc})]`;
    const fullMatch = findMenuItemByXPath(fullMatchXpath);
    if (fullMatch) return fullMatch;
  }

  // Fallback to name-only if Gemini description text changed.
  const nameOnlyXpath = `//span[contains(@class, 'mat-mdc-menu-item-text') and contains(., ${escapedName})]`;
  return findMenuItemByXPath(nameOnlyXpath);
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
