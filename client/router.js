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
      this.redirect('main');
      // console.log('Router: logged in, redirecting from login');
    }
    // else
    //   console.log('Router: logged in, not at login');
    this.next();    // must call next() to get the Router to continue executing;
  }
});

Router.route('/callback', function() {
  this.redirect('/authorize?code=' + this.params.query.code + "&userId=" + Meteor.userId() )
});

Router.route('/', { template: '' });
Router.route('/login', { template: '', name: 'login' });
Router.route('/main');
Router.route('/map/:gameId');
Router.route('/404/:gameId');
// By default the router will render the capitalized name of the template, with punctuations removed and next letter capped.
