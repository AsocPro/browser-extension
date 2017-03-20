import _ from 'lodash';

function jsNameToCssName(name) {
  return name.replace(/([A-Z])/g, '-$1').toLowerCase();
}

function updateStyles() {
  // Handles live update from color picker
  chrome.runtime.onMessage.addListener(
    (request, sender) => {
      if (!sender.tab) {
        if (request.update === 'style') {
          const { property, selector, color } = request;
          const el = document.querySelectorAll(selector);
          let rgba;

          if (color) {
            rgba = `rgba(${color.r},${color.g},${color.b},${color.a})`;
          }

          el.forEach(element => {
            if (color) {
              element.style[property] = rgba;
            } else {
              element.removeAttribute('style');
              location.reload();
            }
          });
        }
      }
    }
  );
}

function updateDisplay() {
  chrome.runtime.onMessage.addListener(
    (request, sender) => {
      if (!sender.tab) {
        if (request.update === 'display') {
          const el = document.querySelectorAll(request.selector);
          try {
            el.forEach(element => {
              if (!request.display) {
                element.style.display = 'none';
              } else {
                element.style.display = 'block';
              }
            });
          } catch (e) {
            throw e;
          }
        }
      }
    }
  );
}

function updateFontFamily() {
  chrome.runtime.onMessage.addListener(
    (request, sender) => {
      if (!sender.tab) {
        if (request.update === 'fontFamily') {
          try {
            document.body.style.fontFamily = `${request.font} !important`;
            location.reload();
          } catch (e) {
            throw e;
          }
        }
      }
    }
  );
}

function reset() {
  // Resets all styles on all elements given in selector
  chrome.runtime.onMessage.addListener(
    (request, sender) => {
      if (!sender.tab) {
        if (request.update === 'reset') {
          const elements = document.querySelectorAll(request.selector);
          elements.forEach(element => {
            element.style = '';
          });
        }
      }
    }
  );
}


function reloadPage() {
  chrome.runtime.onMessage.addListener(
    (request, sender) => {
      if (!sender.tab) {
        if (request.update === 'reload') {
          location.reload();
        }
      }
    }
  );
}

function sendNotification(total, cb) {
  return chrome.runtime.sendMessage({
    badge: total
  }, cb);
}

function getNotifications() {
  // Set a delay for getting notifcations
  setTimeout(() => {
    const el = document.querySelectorAll('span[data-notifications]');
    const nodes = [...el].splice(0, 3);
    let total = 0;

    const notifications = {
      games: '',
      messages: '',
      alerts: ''
    };
    const notificationKeys = Object.keys(notifications);

    nodes.map((target, index) => {
      const value = parseInt(target.dataset.notifications, 10);
      total += value;
      if (value !== 0) {
        notifications[notificationKeys[index]] = parseInt(target.dataset.notifications, 10);
      }
      return total;
    });

    chrome.storage.local.set({ notifications });
    return sendNotification(total, getNotifications);
  }, 60000);
}

function onLoadComplete() {
  // We make all the injected styles inline for easier
  // manipulation and then remove the removable-initial-styles class from body
  chrome.storage.local.get(storage => {
    const { style, display, fontFamily } = storage;
    // Browsers should batch all these DOM updates as they are all consecutive
    // First insert inline-styles
    if (style) {
      _.forEach(style, updateObject => {
        const { color, selector } = updateObject;
        const property = jsNameToCssName(updateObject.property);
        const rgba = `rgba(${color.r},${color.g},${color.b},${color.a})`;
        const elementsArray = document.querySelectorAll(selector);
        elementsArray.forEach(element => {
          element.style[property] = rgba;
        });
      });
    }
    // Then we insert inline-display
    if (display) {
      _.forEach(display, updateObject => {
        const visible = updateObject.visible ? 'block' : 'none';
        const elementsArray = document.querySelectorAll(updateObject.selector);
        elementsArray.forEach(element => {
          element.style.display = visible;
        });
      });
    }
    // Finally insert inline-fontFamily
    if (fontFamily) {
      document.body.style.fontFamily = `${fontFamily} !important`;
    }

    // When all inline-styles are applied we can remove the class from the body
    document.body.classList.remove('removable-initial-styles');
  });
}

window.addEventListener('load', () => {
  updateStyles();
  updateDisplay();
  updateFontFamily();
  reset();
  reloadPage();
  onLoadComplete();

  /**
   * Set a delay whilst we wait for current page to compute all DOM
   * elements that have notification attributes bound to them
   */
  setTimeout(getNotifications, 1000);
});

window.addEventListener('message', (event) => {
  // We only accept messages from ourselves
  if (event.source !== window) {
    return;
  }

  if (event.data.username) {
    chrome.storage.local.set({ user: event.data });
  }
}, false);
