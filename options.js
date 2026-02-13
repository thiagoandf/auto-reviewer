document.getElementById("save").addEventListener("click", () => {
  const usernames = document
    .getElementById("usernames")
    .value.split("\n")
    .map((u) => u.trim())
    .filter((u) => u);

  const hubspotSuffix = document.getElementById("hubspot-suffix").checked;

  chrome.storage.sync.set({ usernames, hubspotSuffix }, () => {
    alert("Settings saved.");
  });
});

// Load saved settings on page load
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.sync.get(["usernames", "hubspotSuffix"], ({ usernames, hubspotSuffix }) => {
    if (usernames && usernames.length > 0) {
      document.getElementById("usernames").value = usernames.join("\n");
    }
    document.getElementById("hubspot-suffix").checked = !!hubspotSuffix;
  });
});
