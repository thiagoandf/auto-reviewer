chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "addReviewers") {
    chrome.storage.sync.get("usernames", ({ usernames }) => {
      if (usernames && usernames.length > 0) {
        addReviewers(usernames);
      } else {
        alert("No reviewers found. Please add them in the extension options.");
      }
    });
  }
});

function addReviewers(usernames) {
  const addReviewerDetails = document.getElementById('reviewers-select-menu');
  if (!addReviewerDetails) {
    alert("Add reviewer details element not found.");
    return;
  }

  const addReviewerButton = addReviewerDetails.querySelector('summary');
  if (!addReviewerButton) {
    alert("Add reviewer button not found.");
    return;
  }

  // Click the summary element to open the reviewers dropdown
  addReviewerButton.click();

  // Wait for reviewer elements to load after the "Everyone else" divider
  waitForReviewersToLoad(10000)
    .then(() => {
      // Now proceed to add reviewers
      addNextReviewer();
    })
    .catch(() => {
      alert("Reviewer options did not load in time.");
    });

  let index = 0;

  function addNextReviewer() {
    if (index >= usernames.length) {
      // Close the dropdown
      document.body.click();
      return;
    }

    const username = usernames[index];
    const input = document.querySelector(
      '.js-filterable-field[aria-label="Type or choose a user"]'
    );

    if (!input) {
      alert("Reviewer input field not found.");
      return;
    }

    // Simulate typing the username
    input.value = username;
    input.dispatchEvent(new Event("input", { bubbles: true }));

    setTimeout(() => {
      // Get all reviewer options excluding templates
      const everyoneElseDivider = document.querySelector('.select-menu-divider.js-divider-rest');
      let options = [];

      if (everyoneElseDivider) {
        let nextElement = everyoneElseDivider.nextElementSibling;
        while (nextElement) {
          if (nextElement.matches('label.select-menu-item.text-normal')) {
            options.push(nextElement);
          }
          nextElement = nextElement.nextElementSibling;
        }
      }

      let foundOption = null;

      options.forEach((option) => {
        const usernameSpan = option.querySelector('.js-username');
        if (usernameSpan && usernameSpan.textContent.trim() === username) {
          foundOption = option;
        }
      });

      if (foundOption) {
        foundOption.click();
        index++;
        setTimeout(addNextReviewer, 200); // Wait before adding the next reviewer
      } else {
        alert(`Reviewer "${username}" not found.`);
        index++;
        setTimeout(addNextReviewer, 200);
      }
    }, 500); // Wait for the options to update after typing
  }
}

function waitForReviewersToLoad(timeout = 10000) {
  return new Promise((resolve, reject) => {
    const intervalTime = 100;
    let timeSpent = 0;
    const interval = setInterval(() => {
      const everyoneElseDivider = document.querySelector('.select-menu-divider.js-divider-rest');
      if (everyoneElseDivider) {
        // Check if there are any reviewer elements after the divider
        let nextElement = everyoneElseDivider.nextElementSibling;
        let reviewersLoaded = false;
        while (nextElement) {
          if (nextElement.matches('label.select-menu-item.text-normal')) {
            reviewersLoaded = true;
            break;
          }
          nextElement = nextElement.nextElementSibling;
        }
        if (reviewersLoaded) {
          clearInterval(interval);
          resolve();
        } else if (timeSpent >= timeout) {
          clearInterval(interval);
          reject();
        }
      } else if (timeSpent >= timeout) {
        clearInterval(interval);
        reject();
      }
      timeSpent += intervalTime;
    }, intervalTime);
  });
}
