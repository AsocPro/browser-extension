import xhr from 'xhr';
import React from 'react';
import App from './App';
import BaseComponent from '../BaseComponent';

export default class Root extends BaseComponent {

  constructor() {
    super();
    this.state = {
      user: {
        loading: true,
        onChessCom: null,
        loggedIn: null
      },
      notifications: {
        loading: true,
        games: '',
        messages: '',
        alerts: ''
      }
    };
  }

  componentDidMount() {
    chrome.storage.local.get('notifications', result => {
      const data = Object.assign({}, result.notifications);
      data.loading = false;
      this.setState({ notifications: data });
    });

    const user = this.state.user;

    this.calcLoggedIn(user).then((user1) => {
      if (user1.loggedIn) {
        if (!user1.avatarUrl) {
          this.setAvatar(user1).then((user2) => {
            this.resolveUser(user2);
            // Save the avatar to localStorage so we can cache it
            chrome.storage.local.set({ user: user2 });
          });
        } else {
          this.resolveUser(user1);
        }
      } else {
        this.calcOnChessCom(user1).then((user2) => {
          this.resolveUser(user2);
        });
      }
    });
  }

  /**
   * This should only be called if we know for a fact that the
   * user is logged in and their avatar has not yet been cached
   *
   * @return Promise
   */
  setAvatar(user) {
    return new Promise(resolve =>
      xhr.get(`https://www.chess.com/callback/user/popup/${user.username}`,
        { json: true },
        (err, resp) => {
          if (resp.statusCode === 200) {
            return resolve(Object.assign({}, user, { avatarUrl: resp.body.avatarUrl }));
          }
          resolve(user);
        })
    );
  }

  /**
   * @return Promise
   */
  calcLoggedIn(user) {
    return new Promise(resolve =>
      chrome.storage.local.get('user', (result) => {
        if (result.user) {
          // Add payload and loggedIn property to user
          resolve(Object.assign({}, user, result.user, { loggedIn: true }));
        } else {
          resolve(Object.assign({}, user, { loggedIn: false }));
        }
      }));
  }

  /**
   * Earmark the user as currently on Chess.com or not
   *
   * @return Promise
   */
  calcOnChessCom(user) {
    return new Promise(resolve =>
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0].url.indexOf('chess.com') >= 0) {
          resolve(Object.assign({}, user, { onChessCom: true }));
        } else {
          resolve(Object.assign({}, user, { onChessCom: false }));
        }
      }));
  }

  /**
   * Once a promise is fulfilled we should call this function. This is
   * the only place where we set user.loading to false.
   *
   * @return promise
   */
  resolveUser(user) {
    const userInfoComplete = user.avatarUrl;
    if (userInfoComplete || user.onChessCom === false ||
      (user.onChessCom !== null && user.loggedIn !== null)) {
      const userToSave = Object.assign({}, user, { loading: false });
      this.setState({ user: userToSave });
    }
  }

  render() {
    return (
      <App
        user={this.state.user}
        notifications={this.state.notifications}
        os={this.props.os}
      />
    );
  }
}
