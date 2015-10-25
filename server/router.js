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

      HTTP.call( 'GET', 'https://api.uber.com/v1/me',
        {
          // data: {
          //   scope: "profile"
          // },
          headers: {
            "Authorization": "Bearer " + access_token
          },

        },
        function( error, response ) {
          console.log(response)
          console.log(response.content)

          var profile = Meteor.users.findOne({_id: userId })
          profile['accessToken'] = access_token;
          console.log(profile);
          Meteor.users.update({ _id: userId }, { $set: { profile: profile }});

          self.response.statusCode = 302;
          self.response.setHeader('Location', '/');
          self.response.end('Arbitrary success message');          
          }

        )

    });
  });
