document.addEventListener("DOMContentLoaded", () => {
  const usernamesTextarea = document.getElementById("usernames");
  const saveButton = document.getElementById("save");
  const hubspotSuffixCheckbox = document.getElementById("hubspot-suffix");
  const messageDiv = document.getElementById("message");

  // Load saved settings
  chrome.storage.sync.get(["usernames", "hubspotSuffix"], ({ usernames, hubspotSuffix }) => {
    if (usernames && usernames.length > 0) {
      usernamesTextarea.value = usernames.join("\n");
    }
    hubspotSuffixCheckbox.checked = !!hubspotSuffix;
  });

  // Save settings
  saveButton.addEventListener("click", () => {
    const usernames = usernamesTextarea.value
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u);

    const hubspotSuffix = hubspotSuffixCheckbox.checked;

    chrome.storage.sync.set({ usernames, hubspotSuffix }, () => {
      messageDiv.textContent = "Settings saved.";
      messageDiv.style.color = "green";

      setTimeout(() => {
        window.close();
      }, 1000);
    });
  });
});
