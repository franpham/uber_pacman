Router.route('/authWithUber', { where: 'server'})
  .get(function() {
      // Listen to incoming HTTP requests, can only be used on the server
      // WebApp.connectHandlers.use(function(req, res, next) {
      //   res.setHeader("Access-Control-Allow-Origin", "*");
      //   return next();
      // });

      this.response.writeHead(302, {
        'Location': 'https://login.uber.com/oauth/v2/authorize?client_id=eVsjM4L5repfO6oBG3ibyFXZMbeRtx2F&response_type=code&scope=request%20profile'
      });



      this.response.end();
    });

Router.route('/authorize', { where: 'server' })
  .get(function () {
    var code = this.params.query.code
    console.log("code: " + code);
    console.log("userId: " + this.params.query.userId );
    var userId = this.params.query.userId;

    // self = the "this" context in Router.get(function() { })
    var self = this

    HTTP.call( 'POST', 'https://login.uber.com/oauth/v2/token', 
      {
        params: {
          "client_secret": "0lYBsysXBYV-2TMOUJ0hLOmoKsdprvgjQo-zqnpC", 
          "client_id"    : "eVsjM4L5repfO6oBG3ibyFXZMbeRtx2F" ,
          "grant_type"   : "authorization_code" ,
          "redirect_uri" : "http://localhost:3000/callback" ,
          "code"         : code ,
        },
        // headers: {
        //   "Content-Type" : "application/x-www-form-urlencoded"
        // }
      },
      function( error, response ) {
    // Handle the error or response here.
    // curl -F 'client_secret=YOUR_CLIENT_SECRET' \
    //     -F 'client_id=YOUR_CLIENT_ID' \
    //     -F 'grant_type=authorization_code' \
    //     -F 'redirect_uri=YOUR_REDIRECT_URI' \
    //     -F 'code=AUTHORIZATION_CODE' \
    //     https://login.uber.com/oauth/v2/token
      // console.log(error);


      console.log(response);
      console.log(response.content)

      data = JSON.parse(response.content);
      access_token = data.access_token;
      console.log("access token: " + access_token);

      HTTP.call( 'POST', 'https://sandbox-api.uber.com/v1/requests',
        {
          data: {
            start_latitude: 21.296753,
            start_longitude: -157.856681,
            end_latitude: 21.307690,
            end_longitude: -157.809427,
            product_id: "6e731b60-2994-4f68-b586-74c077573bbd"
          },
          headers: {
            "Authorization": "Bearer " + access_token
          },

        },
        function( error, response ) {
          console.log(response)
          console.log(response.content)

          data = JSON.parse(response.content);
          request_id = data.request_id;

          HTTP.call( 'GET', 'https://sandbox-api.uber.com/v1/requests/' + request_id,
            {
              headers: {
                "Authorization": "Bearer " + access_token
              },
            },
            function( error, response ) {
              console.log(response)
              console.log('SANDBOX: ' + response.content)



              var profile = Meteor.users.findOne({_id: userId })
              // var profile = Meteor.user().profile;
              profile['accessToken'] = access_token;
              console.log(profile);
              Meteor.users.update({ _id: userId }, { $set: { profile: profile }});

              self.response.statusCode = 302;
              self.response.setHeader('Location', '/main/1');
              self.response.end('Arbitrary success message');          
              
            });


          }

        )

    });
  });
