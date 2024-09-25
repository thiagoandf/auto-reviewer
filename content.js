(function() {
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "addReviewers") {
      chrome.storage.sync.get("usernames", ({ usernames }) => {
        if (usernames && usernames.length > 0) {
          addReviewers(usernames);
        } else {
          console.error("No reviewers found. Please add them in the extension options.");
        }
      });
    }
  });

  // Main function to add reviewers
  async function addReviewers(usernames) {
    // Ensure the script runs on a GitHub Pull Request page
    if (!document.querySelector('.discussion-timeline-actions')) {
      console.error("This script should be run on a GitHub Pull Request page.");
      return;
    }

    // Open the reviewers dropdown
    const addReviewerButton = document.querySelector('#reviewers-select-menu summary');
    if (!addReviewerButton) {
      console.error("Add reviewer button not found.");
      return;
    }
    addReviewerButton.click();

    try {
      // Wait for the input field to be available
      const input = await waitForElement('.js-filterable-field[aria-label="Type or choose a user"]');

      // Remove duplicates and validate usernames
      const uniqueUsernames = [...new Set(usernames)].filter(Boolean);

      for (const username of uniqueUsernames) {
        await addReviewer(username, input);
      }

      // Close the reviewer modal
      closeReviewerModal();

      // Verify that all reviewers have been added
      await verifyReviewers(uniqueUsernames);
    } catch (error) {
      console.error(error.message);
    }
  }

  // Function to add a single reviewer
  async function addReviewer(username, input) {
    // Clear the input field
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Simulate typing the username
    for (const char of username) {
      input.value += char;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(100); // Wait for suggestions to update
    }

    // Wait for the reviewer option to appear
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
        console.error(`Reviewer "${username}" not found.`);
      }
    } catch {
      console.error(`Reviewer "${username}" not found.`);
    }
  }

  // Function to wait for a specific element to appear in the DOM
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        return resolve(element);
      }

      const observer = new MutationObserver((_, observer) => {
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

  // Function to wait for the reviewer option to be available
  function waitForReviewerOption(username, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const check = () => {
        const option = getReviewerOption(username);
        if (option) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject();
        } else {
          setTimeout(check, 100);
        }
      };

      check();
    });
  }

  // Function to get the reviewer option element
  function getReviewerOption(username) {
    const options = document.querySelectorAll('label.select-menu-item');
    for (const option of options) {
      const usernameSpan = option.querySelector('.js-username');
      if (usernameSpan && usernameSpan.textContent.trim() === username) {
        return option;
      }
    }
    return null;
  }

  // Function to close the reviewer modal
  function closeReviewerModal() {
    const modal = document.querySelector('#reviewers-select-menu[open]');
    if (modal) {
      const summary = modal.querySelector('summary');
      if (summary) {
        summary.click();
      }
    }
  }

  // Function to verify that all reviewers have been added
  async function verifyReviewers(usernames) {
    await sleep(1000); // Wait for the reviewers list to update

    const reviewerElements = document.querySelectorAll('.js-issue-sidebar-form .css-truncate .js-hovercard-left');
    const addedUsernames = Array.from(reviewerElements).map(elem => elem.textContent.trim());

    console.log('Reviewers added:', addedUsernames);

    const missingUsernames = usernames.filter(username => !addedUsernames.includes(username));

    if (missingUsernames.length > 0) {
      console.error('The following reviewers were not added:', missingUsernames);
    } else {
      console.log('All reviewers have been successfully added.');
    }
  }

  // Utility function to pause execution
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})();
