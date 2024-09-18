document.getElementById("save").addEventListener("click", () => {
  const usernames = document
    .getElementById("usernames")
    .value.split("\n")
    .map((u) => u.trim())
    .filter((u) => u);

  chrome.storage.sync.set({ usernames }, () => {
    alert("Usernames saved.");
  });
});

// Load saved usernames on page load
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.sync.get("usernames", ({ usernames }) => {
    if (usernames && usernames.length > 0) {
      document.getElementById("usernames").value = usernames.join("\n");
    }
  });
});
