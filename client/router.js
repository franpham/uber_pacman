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

Router.route('/callback', function() {
  console.log(this.params.query.code);
  console.log(Meteor.userId() );
  this.redirect('/authorize?code=' + this.params.query.code + "&userId=" + Meteor.userId() )
});

Router.route('/bookUber', function() {
    var reallyLoggedIn = function() {
      var user = Meteor.user();
      if (!user) return false;
      else if (!user.profile) return false;
      else return true;
    };

    // alert('Booking Uber!')


    if (!reallyLoggedIn() ) {
      this.redirect('/authWithUber');
      return;
    }

    // console.log(Meteor.user());
    // console.log(Meteor.user().profile);
    // console.log(Meteor.user().profile['accessToken']);


    var access_token = Meteor.user().profile['accessToken'];
    // // console.log(access_token);
    // alert(access_token);

    HTTP.call( 'POST', 'https://sandbox-api.uber.com/v1/requests', 
      {
        params: {
          "product_id": "6e731b60-2994-4f68-b586-74c077573bbd",
          "start_latitude": 21.3,
          "start_longitude": -157.85,
          "end_latitude": 21.2,
          "end_longitude": -157.80,
        },
        headers: {
          "Authorization": "Bearer " + access_token,
        },
      },
      function( error, response ) {
        // alert('booked!');

        console.log("blah");
        console.log(error);
        console.log(response);

        Router.go('/main/1')  
      }
    );
  // self.response.statusCode = 302;
  // self.response.setHeader('Location', '/main/1');
  // self.response.end('Arbitrary success message');          

});

Router.route('/', { template: '' });
Router.route('/login', { template: '', name: 'login' });  // MUST specify name;
Router.route('/main/:gameId', { template: 'main' });      // MUST specify template;
Router.route('/404/:gameId', { template: '404' });
// By default the router will render the capitalized name of the template, with punctuations removed and next letter capped.
