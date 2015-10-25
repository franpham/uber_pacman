"use strict";

var markers = {};           // the current players on the map;
var mapInstance = null;     // needed to add map markers & listeners;
var googler = null;         // needed by outer functions;
var infoWindow = null;      // pop-up that's reused when marker is clicked;
var markMe = null;          // marker of "this" player;
var playerIndex = 0;        // the pic index of each player;
var initId = 0;             // the Timeout ID to set markMe;

Meteor.startup(function() {
  GoogleMaps.load();
});
Template.main.rendered = function() {
};      // rendered is called only once: http://www.meteorpedia.com/read/Blaze_Notes#Template hooks

Template.main.helpers({
  mapOptions: function() {
    if (GoogleMaps.loaded()) {
      var geo = Geolocation.latLng();
      return { zoom: 12, center: (geo ? new google.maps.LatLng(geo.lat, geo.lng) : new google.maps.LatLng(21.30886, -157.80858)) };
    }
  },
  topicPics: function() {
    var thisGame = Router.current().params.gameId;
    var query = { gameId: thisGame };
    if (googler) {              // if no googler, markers are set by observe() in GoogleMaps.ready();
      Meteor.setTimeout(function() {
        var images = ImageData.find(query).fetch();
        players = images.length;
        refreshMap(images);          // SET THE NEW MARKERS;
      }, 1000);                      // HACK: wait 1 sec so Meteor can finish templating;
    }
    return ImageData.find(query);    // SET THE NEW IMAGES;
  }
});

function createMarker(marker) {
  var markerObj = new google.maps.Marker({
    animation: google.maps.Animation.DROP,
    position: new google.maps.LatLng(marker.lat, marker.lng),
    draggable: false,
    map: mapInstance,
    userId: marker.userId,
    title: marker.username,
    icon: ghosts[playerIndex],
    label: playerIndex,
    points: marker.points,
    isGhost: marker.isGhost,
    _id: marker._id       // the Marker's _id;
  });
  $('#' + marker._id + '_info').text(playerIndex + '. ' + marker.username + ': ' + marker.points);
  playerIndex++;          // increment playerIndex;
  addMarker(markerObj);
}

// newDocument & oldDocument are Mongo Markers objects; remove Marker from Map to set new position;
function changeMarker(newDocument, oldDocument) {
  markers[oldDocument._id].setMap(null);
  markers[oldDocument._id].setPosition(new google.maps.LatLng(newDocument.lat, newDocument.lng));
  markers[oldDocument._id].setMap(mapInstance);
}

// removeMarker expects a google.maps.Marker INSTANCE;
function removeMarker(marker) {
  // googler.event.clearInstanceListeners(marker);
  delete markers[marker._id];   // remove the reference to the marker
  marker.setMap(null);          // remove the marker from the map
}

// addMarker expects a google.maps.Marker INSTANCE;
function addMarker(marker) {      // update the marker's coordinates after dragging;
  // googler.event.addListener(marker, 'dragend', function(event) {
  // });
  // ------------------    MARKERS ARE UPDATED WHENEVER USER FINISH DRAGGING IT    --------------

  marker.addListener('click', function() {
    var marker = markers[this._id];
    var info = '<div class="player">' + marker.username + ': ' + marker.points + '</div>';
    infoWindow.setContent(info);
    infoWindow.open(mapInstance, marker);
  });
  markers[marker._id] = marker;   // Store marker instance within the markers dict;
}

function observeMarkers(userIds) {
  Markers.find({ _id: { $in: userIds }}).observe({
    added: function(newDocument) {         // ADDED IS ALSO CALLED WHEN OBSERVE IS CALLED;
      createMarker(newDocument);
    },
    changed: function(newDocument, oldDocument) {
      changeMarker(newDocument, oldDocument);   // newDocument & oldDocument are Markers objects;
    },
    removed: function(oldDocument) {
      removeMarker(oldDocument);
    }
  });
}

// NEED EVENT HANDLER FOR LOGGING OUT;

Template.main.onCreated(function() {
  var self = this;      // set BEFORE GoogleMaps.ready();
  GoogleMaps.ready('map', function(map) {
    console.log("GoogleMaps is ready!");
    googler = google.maps;
    mapInstance = map.instance;
    infoWindow = new google.maps.InfoWindow({ content: '' });
    var gameId = Router.current().params.gameId;
    var game = Games.findOne({ _id: gameId });
    if (!game)
      return Router.go('/404/' + gameId);     // redirect if no game found;
    else
      mapInstance.setCenter(new google.maps.LatLng(game.lat, game.lng));

    self.autorun(function() {     // --------------   AUTO UPDATE THE USER'S POSITION   ---------------------
      var geo = Geolocation.latLng();
      if (!Meteor.userId() || !geo)
        return;
      else if (markMe) {
        markMe.setPosition(geo);
        mapInstance.setCenter(markMe.getPosition());    // update the DB to reactively update others;
        Markers.update({ _id: markMe._id }, { $set: { lat: geo.lat, lng: geo.lng }});
      }
    });

    // --------------------------      filepicker widget must be added AFTER GoogleMaps loaded;    ----------------------
    var upload = $('#upload').get()[0];
    upload.onchange = function (event) {
      if (!Meteor.userId())
        return;
      var url = event.originalEvent.fpfile.url;     // markerId will be updated after user clicks on the map;
      var picId = ImageData.insert({ markerId: '', userId: Meteor.userId(), username: Meteor.user().username,
                       picUrl: url, upCount: 0, downCount: 0, topic: thisTopic, createdAt: Date.now() });

      // Meteor handles adding onePic template by observing the database, and adding a marker via observe() below;
      var mapListener = google.maps.event.addListener(mapInstance, 'click', function(event) {
        var markId = Markers.insert({ lat: event.latLng.lat(), lng: event.latLng.lng(), picUrl: url,
                     userId: Meteor.userId(), username: Meteor.user().username });
        ImageData.update({ _id: picId}, { $set: { markerId: markId }});   // update the ImageData's markerId;
        google.maps.event.removeListener(mapListener);                    // prevent adding multiple markers;
      });
    }; // -----------------  MARKERS ARE INSERTED WHENEVER USER CLICKS ON THE MAP  -------------------------

    initId = Meteor.setTimeout(function() {   // set "this" player's Marker;
      var geo = Geolocation.latLng();
      if (markMe) {
        Meteor.clearTimeout(initId);
      }
      else if (Meteor.userId() && geo) {
        var document = Marker.findOne({ userId: Meteor.userId() });
        markMe = new google.maps.Marker({
          animation: google.maps.Animation.DROP,
          position: new google.maps.LatLng(geo.lat, geo.lng),
          draggable: false,
          map: mapInstance,
          userId: document.userId,
          title: document.username,
          label: playerIndex,
          points: document.points,
          isGhost: document.isGhost,
          _id: document._id     // the Marker's _id;
        });
        Markers.update({ _id: markMe._id }, { $set: { lat: geo.lat, lng: geo.lng }});
        $('#' + document._id + '_info').text(playerIndex + '. ' + document.username + ': ' + document.points);
        playerIndex++;          // increment playerIndex;
        addMarker(markMe);
      }
    }, 1000);

    // observe the Game so when new players are added to a Game, new Markers are created;
    Games.find({ _id: gameId }).observe({
      added: function(newDocument) {
        // Markers (Users) fields: _id, lat, lng, userId, username, gameId, points, isGhost
        var userIds = Object.keys(newDocument.players);    // only observe players in current Game;
        observeMarkers(userIds);
      },
      removed: function(oldDocument) {
        // do nothing, games are never removed;
      },
      changed: function(newDocument, oldDocument) {
        var newIds = Object.keys(newDocument.players);
        var oldIds = Object.keys(markers);
        var userIds= newIds.filter(function(val) {
          return oldIds.indexOf(val) === -1;
        });
        observeMarkers(userIds);
      }
    });
  });
});
