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
      // Close the modal after adding the last reviewer
      closeReviewerModal();

      // Verify that all reviewers have been added
      verifyReviewers(usernames);

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
        const inputElement = foundOption.querySelector('input[type="checkbox"]');
        const isAlreadySelected = inputElement && inputElement.checked;

        if (!isAlreadySelected) {
          foundOption.click();
        } else {
          console.log(`Reviewer "${username}" is already selected.`);
        }
        index++;
        setTimeout(addNextReviewer, 200); // Wait before adding the next reviewer
      } else {
        alert(`Reviewer "${username}" not found.`);
        index++;
        setTimeout(addNextReviewer, 200);
      }
    }, 200); // Wait for the options to update after typing
  }
}

// Function to close the reviewer modal
function closeReviewerModal() {
  document.querySelector('.details-overlay[open]>summary').click()
}

// Function to verify that all reviewers have been added
function verifyReviewers(usernames) {
  setTimeout(() => {
    // Selector for the reviewers list on the pull request page
    const reviewerElements = document.querySelectorAll('.js-issue-sidebar-form .css-truncate .js-hovercard-left');
    const addedUsernames = Array.from(reviewerElements).map(elem => elem.textContent.trim());

    console.log('Reviewers added:', addedUsernames);

    const missingUsernames = usernames.filter(username => !addedUsernames.includes(username));

    if (missingUsernames.length > 0) {
      console.error('The following reviewers were not added:', missingUsernames);
      // Optionally, you can attempt to re-add the missing reviewers
      // For simplicity, we'll alert the user
      alert(`Some reviewers were not added: ${missingUsernames.join(', ')}`);
    } else {
      console.log('All reviewers have been successfully added.');
    }
  }, 1000); // Delay of 250ms
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
