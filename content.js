(function() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "addReviewers") {
      chrome.storage.sync.get(["usernames", "hubspotSuffix"], ({ usernames, hubspotSuffix }) => {
        if (usernames && usernames.length > 0) {
          let effectiveUsernames = usernames;
          if (hubspotSuffix) {
            effectiveUsernames = usernames.map(u => u + "_hubspot");
          }
          addReviewers(effectiveUsernames);
        } else {
          console.error("No reviewers found. Please add them in the extension options.");
        }
      });
    }
  });

  const legacyLayout = {
    name: 'legacy',
    detect: () => !!document.querySelector('#reviewers-select-menu'),
    inputSelector: '#reviewers-select-menu input.js-filterable-field',
    isOpen: () => !!document.querySelector('#reviewers-select-menu[open]'),
    open() {
      if (!this.isOpen()) {
        document.querySelector('#reviewers-select-menu summary').click();
      }
    },
    close() {
      if (this.isOpen()) {
        document.querySelector('#reviewers-select-menu summary').click();
      }
    },
    getOption(username) {
      const options = document.querySelectorAll('#reviewers-select-menu label.select-menu-item:not([hidden])');
      for (const option of options) {
        const usernameSpan = option.querySelector('.js-username');
        if (usernameSpan && usernameSpan.textContent.trim().toLowerCase() === username.toLowerCase()) {
          return option;
        }
      }
      return null;
    },
    isSelected: option => option.getAttribute('aria-checked') === 'true',
    getAssignedReviewers: () =>
      Array.from(document.querySelectorAll('.js-issue-sidebar-form .css-truncate .js-hovercard-left[data-assignee-name]'))
        .map(elem => elem.dataset.assigneeName.toLowerCase()),
  };

  const reactLayout = {
    name: 'react',
    detect: () => !!document.querySelector('button[aria-label="Manage reviewers"]'),
    inputSelector: 'input[aria-label="Filter reviewers"]',
    isOpen() {
      return !!document.querySelector(this.inputSelector);
    },
    open() {
      if (!this.isOpen()) {
        document.querySelector('button[aria-label="Manage reviewers"]').click();
      }
    },
    close() {
      const input = document.querySelector(this.inputSelector);
      if (input) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      }
    },
    getOption(username) {
      const options = document.querySelectorAll('[role="dialog"] [role="option"][data-id]');
      for (const option of options) {
        if (option.dataset.id.toLowerCase() === username.toLowerCase()) {
          return option;
        }
      }
      return null;
    },
    isSelected: option => option.getAttribute('aria-selected') === 'true',
    getAssignedReviewers: () =>
      Array.from(document.querySelectorAll('section[aria-label="Reviewers"] a[data-hovercard-type]'))
        .map(link => link.getAttribute('href').split('/').filter(Boolean).pop().toLowerCase()),
  };

  async function addReviewers(usernames) {
    const layout = [reactLayout, legacyLayout].find(l => l.detect());
    if (!layout) {
      console.error("Reviewers menu not found. This script should be run on a GitHub Pull Request page.");
      return;
    }

    layout.open();

    try {
      const input = await waitForElement(layout.inputSelector);

      const uniqueUsernames = [...new Set(usernames)].filter(Boolean);

      for (const username of uniqueUsernames) {
        await addReviewer(layout, username, input);
      }

      layout.close();

      await verifyReviewers(layout, uniqueUsernames);
    } catch (error) {
      console.error("Failed to add reviewers:", error.message);
    }
  }

  async function addReviewer(layout, username, input) {
    setInputValue(input, '');
    await sleep(50);

    // Try pasting the full username first
    if (await tryPasteUsername(layout, username, input)) {
      await selectReviewerIfReady(layout, username);
      return;
    }

    // Fallback: type char-by-char, checking for the match after each keystroke
    setInputValue(input, '');
    await sleep(50);

    for (const char of username) {
      setInputValue(input, input.value + char);

      // Check immediately if the target reviewer is already visible
      if (layout.getOption(username)) {
        await selectReviewerIfReady(layout, username);
        return;
      }

      await sleep(100);
    }

    // Final attempt after all characters are typed
    await selectReviewerIfReady(layout, username);
  }

  // Uses the native setter so React-controlled inputs pick up the change
  function setInputValue(input, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  async function tryPasteUsername(layout, username, input) {
    setInputValue(input, username);

    try {
      await waitForReviewerOption(layout, username, 3000);
    } catch (_) {}

    return !!layout.getOption(username);
  }

  async function selectReviewerIfReady(layout, username) {
    try {
      await waitForReviewerOption(layout, username);
      const option = layout.getOption(username);

      if (option) {
        if (!layout.isSelected(option)) {
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

  function waitForReviewerOption(layout, username, timeout = 5000) {
    return new Promise((resolve, reject) => {
      // Check immediately
      if (layout.getOption(username)) {
        return resolve();
      }

      const observer = new MutationObserver(() => {
        if (layout.getOption(username)) {
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

  async function verifyReviewers(layout, usernames) {
    const getMissing = () => {
      const assigned = layout.getAssignedReviewers();
      return usernames.filter(username => !assigned.includes(username.toLowerCase()));
    };

    if (getMissing().length > 0) {
      await waitForSidebarUpdate(() => getMissing().length === 0);
    }

    const missingUsernames = getMissing();
    if (missingUsernames.length > 0) {
      console.error('The following reviewers were not added:', missingUsernames);
    } else {
      console.log('All reviewers have been successfully added.');
    }
  }

  // Observes the whole body because the React sidebar can be re-mounted after saving
  function waitForSidebarUpdate(isDone, timeout = 5000) {
    return new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        if (isDone()) {
          observer.disconnect();
          resolve();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

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
