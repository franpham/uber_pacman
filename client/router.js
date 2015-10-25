"use strict";

Router.configure({
  layoutTemplate : 'baseLayout',   // default layout always rendered;
  before : function () {
    if (!Meteor.user()) {
      if (Meteor.loggingIn()) {
        // just wait if logging in;
        // console.log('Router: logging in');
      }
      else {
        this.redirect('login');
        // console.log('Router: no user');
      }
    }
    else if (Router.current().route.getName() === 'login') {
      Meteor.logoutOtherClients();
      this.redirect('/main/1');    // ROUTE TO GAME #1 BY DEFAULT;   -----------
      // console.log('Router: logged in, redirecting from login');
    }
    // else
    //   console.log('Router: logged in, not at login');
    this.next();    // must call next() to get the Router to continue executing;
  }
});

// Router.route('/game');   // page to select game to join;
Router.route('/', { template: '' });
Router.route('/login', { template: '', name: 'login' });  // MUST specify name;
Router.route('/main/:gameId', { template: 'main' });      // MUST specify template;
Router.route('/404/:gameId', { template: '404' });
// By default the router will render the capitalized name of the template, with punctuations removed and next letter capped.
