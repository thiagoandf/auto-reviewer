(function() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "addReviewers") {
      chrome.storage.sync.get(["usernames", "hubspotSuffix"], ({ usernames, hubspotSuffix }) => {
        if (usernames && usernames.length > 0) {
          let effectiveUsernames = usernames;
          if (hubspotSuffix && window.location.hostname === "github.com") {
            effectiveUsernames = usernames.map(u => u + "_hubspot");
          }
          addReviewers(effectiveUsernames);
        } else {
          console.error("No reviewers found. Please add them in the extension options.");
        }
      });
    }
  });

  async function addReviewers(usernames) {
    if (!document.querySelector('.discussion-timeline-actions')) {
      console.error("This script should be run on a GitHub Pull Request page.");
      return;
    }

    const addReviewerButton = document.querySelector('#reviewers-select-menu summary');
    if (!addReviewerButton) {
      console.error("Add reviewer button not found.");
      return;
    }

    // Only open the dropdown if it isn't already open
    const menu = document.querySelector('#reviewers-select-menu');
    if (menu && !menu.hasAttribute('open')) {
      addReviewerButton.click();
    }

    try {
      const input = await waitForElement('.js-filterable-field[aria-label="Type or choose a user"]');

      const uniqueUsernames = [...new Set(usernames)].filter(Boolean);

      for (const username of uniqueUsernames) {
        await addReviewer(username, input);
      }

      closeReviewerModal();

      await verifyReviewers(uniqueUsernames);
    } catch (error) {
      console.error("Failed to add reviewers:", error.message);
    }
  }

  async function addReviewer(username, input) {
    // Clear the input field
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(50);

    // Try pasting the full username first
    if (await tryPasteUsername(username, input)) {
      await selectReviewerIfReady(username);
      return;
    }

    // Fallback: type char-by-char, checking for the match after each keystroke
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(50);

    for (const char of username) {
      input.value += char;
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // Check immediately if the target reviewer is already visible
      const option = getReviewerOption(username);
      if (option) {
        await selectReviewerIfReady(username);
        return;
      }

      await sleep(100);
    }

    // Final attempt after all characters are typed
    await selectReviewerIfReady(username);
  }

  async function tryPasteUsername(username, input) {
    input.value = username;
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Give GitHub a moment to filter results
    await sleep(300);

    return !!getReviewerOption(username);
  }

  async function selectReviewerIfReady(username) {
    try {
      await waitForReviewerOption(username);
      const option = getReviewerOption(username);

      if (option) {
        const inputElement = option.querySelector('input[type="checkbox"]');
        const isAlreadySelected = inputElement && inputElement.checked;

        if (!isAlreadySelected) {
          option.click();
        } else {
          console.log(`Reviewer "${username}" is already selected.`);
        }
      } else {
        console.error(`Reviewer "${username}" not found in the dropdown.`);
      }
    } catch (error) {
      console.error(`Reviewer "${username}" not found after waiting: ${error.message}`);
    }
  }

  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        return resolve(element);
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element "${selector}" not found within ${timeout}ms`));
      }, timeout);
    });
  }

  function waitForReviewerOption(username, timeout = 5000) {
    return new Promise((resolve, reject) => {
      // Check immediately
      if (getReviewerOption(username)) {
        return resolve();
      }

      const observer = new MutationObserver(() => {
        if (getReviewerOption(username)) {
          observer.disconnect();
          resolve();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Reviewer option "${username}" did not appear within ${timeout}ms`));
      }, timeout);
    });
  }

  function getReviewerOption(username) {
    const options = document.querySelectorAll('label.select-menu-item');
    for (const option of options) {
      const usernameSpan = option.querySelector('.js-username');
      if (usernameSpan && usernameSpan.textContent.trim().toLowerCase() === username.toLowerCase()) {
        return option;
      }
    }
    return null;
  }

  function closeReviewerModal() {
    const modal = document.querySelector('#reviewers-select-menu[open]');
    if (modal) {
      const summary = modal.querySelector('summary');
      if (summary) {
        summary.click();
      }
    }
  }

  async function verifyReviewers(usernames) {
    // Wait for the sidebar to update after closing the modal using MutationObserver
    const sidebar = document.querySelector('.js-issue-sidebar-form');
    if (sidebar) {
      await waitForSidebarUpdate(sidebar);
    }

    const reviewerElements = document.querySelectorAll('.js-issue-sidebar-form .css-truncate .js-hovercard-left');
    const addedUsernames = Array.from(reviewerElements).map(elem => elem.textContent.trim().toLowerCase());

    const missingUsernames = usernames.filter(
      username => !addedUsernames.includes(username.toLowerCase())
    );

    if (missingUsernames.length > 0) {
      console.error('The following reviewers were not added:', missingUsernames);
    } else {
      console.log('All reviewers have been successfully added.');
    }
  }

  function waitForSidebarUpdate(sidebar, timeout = 3000) {
    return new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        observer.disconnect();
        resolve();
      });

      observer.observe(sidebar, {
        childList: true,
        subtree: true,
      });

      // Resolve after timeout even if no mutation is observed,
      // since the sidebar may already be up to date
      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, timeout);
    });
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})();
