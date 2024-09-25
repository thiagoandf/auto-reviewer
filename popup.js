document.addEventListener("DOMContentLoaded", () => {
  const usernamesTextarea = document.getElementById("usernames");
  const saveButton = document.getElementById("save");
  const addReviewersButton = document.getElementById("add-reviewers");
  const messageDiv = document.getElementById("message");

  // Load saved usernames
  chrome.storage.sync.get("usernames", ({ usernames }) => {
    if (usernames && usernames.length > 0) {
      usernamesTextarea.value = usernames.join("\n");
    }
  });

  // Save usernames
  saveButton.addEventListener("click", () => {
    const usernames = usernamesTextarea.value
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u);

    chrome.storage.sync.set({ usernames }, () => {
      // Display a success message
      messageDiv.textContent = "Usernames saved.";
      messageDiv.style.color = "green";

      // Close the popup after a short delay
      setTimeout(() => {
        window.close();
      }, 1000); // Delay in milliseconds
    });
  });
});
