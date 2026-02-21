// Default configuration matches the original hardcoded values
const DEFAULTS = {
  enabled: true,
  targetModelName: "Pro",
  targetModelDesc: "Advanced math and code with 3.1 Pro",
  modelSwitcherSelector: "button.mdc-button.mat-mdc-button-base.input-area-switch.mat-mdc-button.mat-unthemed.ng-star-inserted",
  delay: 10
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
  chrome.storage.sync.get(
    DEFAULTS,
    (items) => {
      document.getElementById('enabled').checked = items.enabled;
      const badgeText = document.querySelector('.footer-badge span:last-child');
      const badgeDot = document.querySelector('.footer-badge .dot');
      badgeText.textContent = items.enabled ? 'Extension Active' : 'Extension Disabled';
      badgeDot.style.background = items.enabled ? 'var(--success)' : 'var(--text-muted)';
      document.getElementById('targetModelName').value = items.targetModelName;
      document.getElementById('targetModelDesc').value = items.targetModelDesc;
      document.getElementById('modelSwitcherSelector').value = items.modelSwitcherSelector;
      document.getElementById('delay').value = items.delay;
    }
  );
};

// Saves options to chrome.storage
const saveOptions = () => {
  const enabled = document.getElementById('enabled').checked;
  const targetModelName = document.getElementById('targetModelName').value;
  const targetModelDesc = document.getElementById('targetModelDesc').value;
  const modelSwitcherSelector = document.getElementById('modelSwitcherSelector').value;
  const delay = parseInt(document.getElementById('delay').value, 10);

  chrome.storage.sync.set(
    {
      enabled,
      targetModelName,
      targetModelDesc,
      modelSwitcherSelector,
      delay
    },
    () => {
      // Update status to let user know options were saved.
      const status = document.getElementById('status');
      status.style.display = 'block';
      setTimeout(() => {
        status.style.display = 'none';
      }, 750);
    }
  );
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('enabled').addEventListener('change', (e) => {
  const enabled = e.target.checked;
  chrome.storage.sync.set({ enabled });
  
  const badgeText = document.querySelector('.footer-badge span:last-child');
  const badgeDot = document.querySelector('.footer-badge .dot');
  badgeText.textContent = enabled ? 'Extension Active' : 'Extension Disabled';
  badgeDot.style.background = enabled ? 'var(--success)' : 'var(--text-muted)';
});
