document.addEventListener("DOMContentLoaded", () => {
  const usernamesTextarea = document.getElementById("usernames");
  const saveButton = document.getElementById("save");
  const hubspotSuffixCheckbox = document.getElementById("hubspot-suffix");
  const messageDiv = document.getElementById("message");

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = "message " + type;
  }

  loadSettings(({ usernames, hubspotSuffix }) => {
    if (usernames.length > 0) {
      usernamesTextarea.value = usernames.join("\n");
    }
    hubspotSuffixCheckbox.checked = hubspotSuffix;
  });

  // Display the current keyboard shortcut
  const shortcutHint = document.getElementById("shortcut-hint");
  chrome.commands.getAll((commands) => {
    const cmd = commands.find((c) => c.name === "add-reviewers");
    if (cmd && cmd.shortcut) {
      const keys = cmd.shortcut.split("+").map((k) => k.trim());
      shortcutHint.innerHTML =
        "Trigger with " + keys.map((k) => `<kbd>${k}</kbd>`).join(" + ");
    } else {
      shortcutHint.innerHTML =
        'No shortcut set — <a href="chrome://extensions/shortcuts" target="_blank">configure</a>';
    }
  });

  saveButton.addEventListener("click", () => {
    const usernames = parseUsernames(usernamesTextarea.value);

    if (usernames.length === 0) {
      showMessage("Please enter at least one username.", "error");
      return;
    }

    const { valid, invalid } = validateUsernames(usernames);
    if (!valid) {
      showMessage(`Invalid username(s): ${invalid.join(", ")}`, "error");
      return;
    }

    const hubspotSuffix = hubspotSuffixCheckbox.checked;

    saveSettings({ usernames, hubspotSuffix }, () => {
      showMessage("Settings saved.", "success");

      setTimeout(() => {
        window.close();
      }, 1000);
    });
  });
});
