const DEFAULT_PRESET = "pro";
const CURRENT_EXTENSION_VERSION = chrome.runtime.getManifest().version;

// Default configuration matches the original hardcoded values
const DEFAULTS = {
  enabled: true,
  modelPreset: DEFAULT_PRESET,
  modelConfigVersion: "",
  targetModelName: "Pro",
  targetModelDesc: "Advanced math and code with 3.1 Pro",
  modelSwitcherSelector: "button.mdc-button.mat-mdc-button-base.input-area-switch.mat-mdc-button.mat-unthemed.ng-star-inserted",
  delay: 10
};

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

let statusTimeout;
let currentModelPreset = DEFAULT_PRESET;

const normalize = (value) => (value || "").trim().toLowerCase();

const inferPresetFromModelName = (targetModelName) => {
  const normalizedName = normalize(targetModelName);
  if (!normalizedName) return null;

  for (const [presetKey, preset] of Object.entries(MODEL_PRESETS)) {
    if (normalize(preset.targetModelName) === normalizedName) {
      return presetKey;
    }
  }

  return null;
};

const resolvePreset = (storedPreset, targetModelName) => {
  if (storedPreset && MODEL_PRESETS[storedPreset]) return storedPreset;
  const inferred = inferPresetFromModelName(targetModelName);
  return inferred || DEFAULT_PRESET;
};

const getPresetValues = (presetKey) => MODEL_PRESETS[presetKey] || MODEL_PRESETS[DEFAULT_PRESET];

const resolveVersionedModelConfig = (items) => {
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

  return {
    resolvedPreset,
    targetModelName,
    targetModelDesc,
    needsStorageUpdate
  };
};

const updateStatusBadge = (enabled) => {
  const badgeText = document.querySelector(".footer-badge span:last-child");
  const badgeDot = document.querySelector(".footer-badge .dot");
  badgeText.textContent = enabled ? "Extension Active" : "Extension Disabled";
  badgeDot.style.backgroundColor = enabled ? "var(--good, #16a34a)" : "var(--danger, #ef4444)";
  badgeDot.style.boxShadow = enabled
    ? "0 0 0 4px rgba(22, 163, 74, 0.18)"
    : "0 0 0 4px rgba(239, 68, 68, 0.22)";
};

const showStatus = (message = "Settings Saved!") => {
  const status = document.getElementById("status");
  status.textContent = message;
  status.classList.add("show");

  clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => {
    status.classList.remove("show");
  }, 900);
};

const setPresetButtonState = (presetKey) => {
  document.querySelectorAll(".preset-btn").forEach((button) => {
    const isActive = button.dataset.preset === presetKey;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
};

const applyPreset = (presetKey) => {
  const preset = getPresetValues(presetKey);
  if (!preset) return;

  currentModelPreset = presetKey;
  setPresetButtonState(presetKey);

  document.getElementById("targetModelName").value = preset.targetModelName;
  document.getElementById("targetModelDesc").value = preset.targetModelDesc;

  chrome.storage.sync.set(
    {
      modelPreset: presetKey,
      modelConfigVersion: CURRENT_EXTENSION_VERSION,
      targetModelName: preset.targetModelName,
      targetModelDesc: preset.targetModelDesc
    },
    () => showStatus(`Preset saved: ${preset.targetModelName}`)
  );
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
  chrome.storage.sync.get(
    DEFAULTS,
    (items) => {
      document.getElementById("enabled").checked = items.enabled;
      updateStatusBadge(items.enabled);

      const modelConfig = resolveVersionedModelConfig(items);
      currentModelPreset = modelConfig.resolvedPreset;

      document.getElementById("targetModelName").value = modelConfig.targetModelName;
      document.getElementById("targetModelDesc").value = modelConfig.targetModelDesc;
      document.getElementById("modelSwitcherSelector").value = items.modelSwitcherSelector;
      document.getElementById("delay").value = items.delay;
      setPresetButtonState(modelConfig.resolvedPreset);

      if (modelConfig.needsStorageUpdate) {
        chrome.storage.sync.set({
          modelPreset: modelConfig.resolvedPreset,
          modelConfigVersion: CURRENT_EXTENSION_VERSION,
          targetModelName: modelConfig.targetModelName,
          targetModelDesc: modelConfig.targetModelDesc
        });
      }
    }
  );
};

// Saves options to chrome.storage
const saveOptions = () => {
  const targetModelName = document.getElementById("targetModelName").value.trim();
  const targetModelDesc = document.getElementById("targetModelDesc").value.trim();
  const modelSwitcherSelector = document.getElementById("modelSwitcherSelector").value.trim();
  const parsedDelay = parseInt(document.getElementById("delay").value, 10);
  const delay = Number.isFinite(parsedDelay) ? parsedDelay : DEFAULTS.delay;
  const inferredPreset = inferPresetFromModelName(targetModelName);
  const modelPreset = inferredPreset || currentModelPreset || DEFAULT_PRESET;

  currentModelPreset = modelPreset;
  setPresetButtonState(modelPreset);

  chrome.storage.sync.set(
    {
      modelPreset,
      modelConfigVersion: CURRENT_EXTENSION_VERSION,
      targetModelName,
      targetModelDesc,
      modelSwitcherSelector,
      delay
    },
    () => showStatus("Settings Saved!")
  );
};

document.querySelectorAll(".preset-btn").forEach((button) => {
  button.addEventListener("click", () => {
    applyPreset(button.dataset.preset);
  });
});

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").addEventListener("click", saveOptions);
document.getElementById("enabled").addEventListener("change", (e) => {
  const enabled = e.target.checked;
  chrome.storage.sync.set({ enabled });
  updateStatusBadge(enabled);
});
