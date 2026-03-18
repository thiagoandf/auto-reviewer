document.addEventListener("DOMContentLoaded", () => {
  const usernamesTextarea = document.getElementById("usernames");
  const saveButton = document.getElementById("save");
  const hubspotSuffixCheckbox = document.getElementById("hubspot-suffix");
  const messageSpan = document.getElementById("message");

  function showMessage(text, type) {
    messageSpan.textContent = text;
    messageSpan.className = "message " + type;
  }

  loadSettings(({ usernames, hubspotSuffix }) => {
    if (usernames.length > 0) {
      usernamesTextarea.value = usernames.join("\n");
    }
    hubspotSuffixCheckbox.checked = hubspotSuffix;
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
    });
  });
});
