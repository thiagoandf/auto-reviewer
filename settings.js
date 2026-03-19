const GITHUB_USERNAME_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;

function parseUsernames(raw) {
  return raw
    .split("\n")
    .map((u) => u.trim())
    .filter((u) => u);
}

function validateUsernames(usernames) {
  const invalid = usernames.filter((u) => !GITHUB_USERNAME_REGEX.test(u));
  if (invalid.length > 0) {
    return { valid: false, invalid };
  }
  return { valid: true, invalid: [] };
}

function loadSettings(callback) {
  chrome.storage.sync.get(["usernames", "hubspotSuffix"], ({ usernames, hubspotSuffix }) => {
    callback({
      usernames: usernames || [],
      hubspotSuffix: !!hubspotSuffix,
    });
  });
}

function saveSettings({ usernames, hubspotSuffix }, callback) {
  chrome.storage.sync.set({ usernames, hubspotSuffix }, callback);
}
