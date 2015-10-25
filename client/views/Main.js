"use strict";
// var FRUITS = ['images/rsz_apple.png', 'images/rsz_banana.png', 'images/rsz_cherry.png', 'images/pineapple.png', 'images/rsz_strawberry.png', 'images/rsz_watermelon.png'];
// var GHOSTS = ['images/rsz_green-ghost.png', 'images/rsz_orange-ghost.png', 'images/rsz_pink-ghost.png', 'images/rsz_red-ghost.png', 'images/rsz_yellow-ghost.png'];
var FRUITS = ['http://i.imgsafe.org/446c7c1.png', 'http://i.imgsafe.org/455b22f.png', 'http://i.imgsafe.org/45e983d.png', 'http://i.imgsafe.org/479a090.png', 'http://i.imgsafe.org/43dd733.png', 'http://i.imgsafe.org/46cba67.png'];
var GHOSTS = ['http://i.imgsafe.org/890ad61.png', 'http://i.imgsafe.org/7945ddc.png', 'http://i.imgsafe.org/a4574c8.png', 'http://i.imgsafe.org/c0ef571.png', 'http://i.imgsafe.org/dcafa3b.png', 'http://i.imgsafe.org/fc204d8.png'];
var PACMANPIC = 'http://i.imgsafe.org/be24fe1.gif';
// var PACMANPIC = 'http://i.imgsafe.org/2dcae71.png';

var markers = {};           // the current players on the map;
var mapInstance = null;     // needed to add map markers & listeners;
var googler = null;         // needed by outer functions;
var infoWindow = null;      // pop-up that's reused when marker is clicked;
var markMe = null;          // marker of "this" player;
var bonuses = [];           // the bonus fruits;
var powerups = [];          // the power-ups beers;
var playerIndex = 0;        // the pic index of each player;
var gameId = 0;             // the game being played;

Meteor.startup(function() {
  GoogleMaps.load({ libraries: 'places' });
});
Template.main.rendered = function() {
};      // rendered is called only once: http://www.meteorpedia.com/read/Blaze_Notes#Template hooks

Template.main.helpers({
  mapOptions: function() {
    if (GoogleMaps.loaded()) {
      var geo = Geolocation.latLng();
      return { zoom: 15, center: (geo ? new google.maps.LatLng(geo.lat, geo.lng) : new google.maps.LatLng(21.30886, -157.80858)) };
    }
  }
});

Template.main.events({
  'click #quitGame' : function (event) {
    var game = Games.findOne({ _id: gameId });
    if (game && markMe) {
      var gamers = game.players;
      var secs = (Date.now() - markMe.startTime) / 1000;
      markMe.points += secs;
      gamers[markMe._id] = markMe.points;
      Games.update({ _id: game._id }, { $set: { players: gamers }});
      Router.go('/main');
    }
  }
});

function createMarker(marker) {
  var icon = marker.isGhost ? GHOSTS[playerIndex % GHOSTS.length] : PACMANPIC;
  var markerObj = new google.maps.Marker({
    animation: google.maps.Animation.DROP,
    position: new google.maps.LatLng(marker.lat, marker.lng),
    icon: icon,
    draggable: false,
    map: mapInstance,
    userId: marker.userId,
    title: marker.username,
    label: playerIndex + '',
    points: marker.points,
    isGhost: marker.isGhost,
    isPowered: false,
    timer: 0,
    _id: marker._id       // the _id in Markers;
  });
  if (marker.userId === Meteor.userId())
    markMe = markerObj;
  var playerInfo = $('<li id="' + marker._id + '_name" />').append($('<span id="' + marker._id + '_pts />').text(marker.points))
    .text(playerIndex + '. ' + marker.username + ': ');
  $('#playerList').append(playerInfo);
  playerIndex++;     // increment playerIndex;
  addMarker(markerObj);
}

// newDocument & oldDocument are Mongo Markers objects; remove marker from Map to set new position;
function changeMarker(newDocument, oldDocument) {
  var marker = markers[oldDocument._id];
  marker.setMap(null);
  marker.setPosition(new google.maps.LatLng(newDocument.lat, newDocument.lng));
  marker.setMap(mapInstance);
  marker.lat = newDocument.lat;
  marker.lng = newDocument.lng;
  marker.points = newDocument.points;
  marker.isGhost = newDocument.isGhost;
  marker.timer = newDocument.timer;
}

function removeMarker(marker) {
  // googler.event.clearInstanceListeners(marker);
  $('#playerList').remove('#' + marker._id + '_name');
  delete markers[marker._id];   // remove the reference to the marker
  marker.setMap(null);          // remove the marker from the map
  // DO NOT decrement playerIndex, else markers' labels will not to change also;
}

function addMarker(marker) {      // update the marker's coordinates after dragging;
  // googler.event.addListener(marker, 'dragend', function(event) {
  // });
  marker.addListener('click', function() {
    var marker = markers[this._id];
    var info = '<div>' + marker.username + ': ' + marker.points + '</div>';
    infoWindow.setContent(info);
    infoWindow.open(mapInstance, marker);
  });
  markers[marker._id] = marker;   // Store marker instance within the markers object;
}

function observeMarkers(userIds) {
  Markers.find({ _id: { $in: userIds }}).observe({
    added: function(newDocument) {         // ADDED IS ALSO CALLED WHEN OBSERVE IS CALLED;
      $(window).load(function() {
        createMarker(newDocument);
      });
    },
    changed: function(newDocument, oldDocument) {
      changeMarker(newDocument, oldDocument);   // newDocument & oldDocument are Markers objects;
    },
    removed: function(oldDocument) {
      removeMarker(oldDocument);
    }
  });
}

function detectGhosts() {
  var keys = Object.keys(markers);
  for (var i = 0; i < keys.length; i++) {
    var marker = markers[keys[i]];
    if (markMe === marker)    // Pacman is in same array as Ghosts!
      continue;
    else if ((Date.now() - markMe.timer) / 1000 <= 300 &&
      Math.abs(markMe.lat - marker.lat) < 0.00005 && Math.abs(markMe.lng - marker.lng) < 0.00005) {
      var wasGhost = markMe.isGhost;
      if (!markMe.isGhost && marker.isPowered) {
        var halfpoints = parseInt(marker.points / 2);
        var points = markMe.points + halfpoints;
        Markers.update({ _id: markMe._id }, { $set: { points: points }});   // don't set timer for Pacman;
        Markers.update({ _id: marker._id }, { $set: { points: halfpoints, timer: Date.now() }});
        marker.time = Date.now();
      }
      else if (!markMe.isGhost) {
        markMe.timer = Date.now();    // set Pacman timer for changing to Ghost;
        marker.timer = 0;       // Ghost becomes Pacman, so reset timer;
        Markers.update({ _id: markMe._id }, { $set: { isGhost: true, timer: Date.now() }});
        Markers.update({ _id: marker._id }, { $set: { isGhost: false, timer: 0 }});
        markMe.setIcon(marker.getIcon());
        marker.setIcon(PACMANPIC);    // Pacman becomes Ghost, and Ghost becomes Pacman;
      }
      if (markMe.isPowered && (Date.now() - markMe.timer) / 1000 > 300) {    // if > 5 mins;
        Markers.update({ _id: markMe._id }, { $set: { isPowered:false, timer: 0 }});
        markMe.timer = 0;
      }
      $('#notice').text(wasGhost ? 'You were eaten by PacMan!' : 'You just ate a Ghost!');
    } // ONLY CODE FOR PACMAN, GHOSTS WILL GET UPDATES REACTIVELY;
  }
}

function detectPowerUps() {
  for (var i = 0; i < powerups.length; i++) {
    var marker = powerups[i];
    if ((Date.now() - markMe.timer) / 1000 <= 300 &&
      Math.abs(markMe.lat - marker.lat) < 0.00005 && Math.abs(markMe.lng - marker.lng) < 0.00005) {
      Markers.update({ _id: markMe._id }, { $set: { isPowered: true, timer: Date.now() }});
      markMe.timer = Date.now();
      var index = powerups.indexOf(marker);
      if (index >= 0)
        powerups.splice(index, 1);
      marker.setMap(null);    // remove powerup from map;
      $('#notice').text('You ate a Power-Up!');
      break;                  // can only power up once!
    }
    else if (markMe.isPowered && (Date.now() - markMe.timer) / 1000 > 300) {     // if > 5 mins;
      Markers.update({ _id: markMe._id }, { $set: { isPowered:false, timer: 0 }});
      markMe.timer = 0;
    }
  }
}

function detectBonuses() {
  for (var i = 0; i < bonuses.length; i++) {
    var marker = bonuses[i];
    if (Math.abs(markMe.lat - marker.lat) < 0.00005 && Math.abs(markMe.lng - marker.lng) < 0.00005) {
      Markers.update({ _id: markMe._id }, { $set: { points: markMe.points + 100 }});
      markMe.points += 100;
      var index = bonuses.indexOf(marker);
      if (index >= 0)
        bonuses.splice(index, 1);
      marker.setMap(null);    // remove bonus from map;
      $('#notice').text('You ate a Bonus!');
    }
    else if (markMe.isPowered && (Date.now() - markMe.timer) / 1000 > 300) {     // if > 5 mins;
      Markers.update({ _id: markMe._id }, { $set: { isPowered:false, timer: 0 }});
      markMe.timer = 0;
    }
  }
}

Template.main.onCreated(function() {
  var self = this;      // set BEFORE GoogleMaps.ready();
  GoogleMaps.ready('map', function(map) {
    console.log("GoogleMaps is ready!");
    googler = google.maps;
    mapInstance = map.instance;
    infoWindow = new google.maps.InfoWindow({ content: '' });
    gameId = Router.current().params.gameId;    // set gameId and create default game;
    var game = Games.findOne({ _id: gameId });
    var geo = Geolocation.latLng();
    if (!geo)
      geo = { lat: 21.30886, lng: -157.80858 };
    if (!game) {
      if (gameId === '1') {     // params are ALWAYS STRINGS;
        Games.insert({ _id: gameId, lat: geo.lat, lng: geo.lng, pacman: '', players: {} });
        game = Games.findOne({ _id: gameId });
      }
      else
        return Router.go('/404/' + gameId);     // redirect if no game found;
    }
    mapInstance.setCenter(new google.maps.LatLng(game.lat, game.lng));
    self.autorun(function() {     // ------------   AUTO UPDATE THE USER'S POSITION   ------------
      var geo = Geolocation.latLng();
      if (!Meteor.userId() || !geo)
        return;
      else if (markMe) {
        markMe.setPosition(geo);
        mapInstance.setCenter(geo);    // update the DB to reactively update others;
        Markers.update({ _id: markMe._id }, { $set: { lat: geo.lat, lng: geo.lng }});
        detectGhosts();
        detectPowerUps();
        detectBonuses();
      }
    });

    var markerId = 0;   // ------------------ set "this" player's Markers object -----------------;
    var initId = Meteor.setTimeout(function() {
      var gamers = game.players;
      var geo = Geolocation.latLng();
      var document = Markers.findOne({ userId: Meteor.userId() });
      if (markerId) {     // must check markerId to prevent multiple Markers insertions;
        Meteor.clearTimeout(initId);
      }
      else if (Meteor.userId() && geo) {
        var isGhost = game.pacman !== '';
        if (!document) {      // user has never played, SO INSERT NEW MARKER!
          // Markers fields: _id, lat, lng, userId, username, points, timer, isGhost;
          markerId = Markers.insert({ lat: geo.lat, lng: geo.lng, startTime: Date.now(), userId: Meteor.userId(),
                          username: Meteor.user().username, points: 0, timer: 0, isGhost: isGhost });
        }
        else {           // user joining this game, so update Markers;
          Markers.update({ _id: document._id }, { $set: { lat: geo.lat, lng: geo.lng, startTime: Date.now(), isGhost: isGhost }});
          markerId = document._id;
        }
        gamers[markerId] = document ? document.points : 0;
        Games.update({ _id: game._id }, { $set: { players: gamers }});
        if (!isGhost) {
          Games.update({ _id: game._id }, { $set: { pacman: markerId }});
          console.log('not a ghost: ' + markerId);
        }
      }             // update the Game to broadcast BOTH new/ updated Markers to current players;
    }, 1000);

    // observe the Game so when new players join a Game, new map markers are created;
    Games.find({ _id: game._id }).observe({
      added: function(newDocument) {
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
        if (userIds.length > 0)
          observeMarkers(userIds);
      }
    });

    var barImg = 'http://i.imgsafe.org/deb639c.png';
    var service = new google.maps.places.PlacesService(mapInstance);
    service.nearbySearch({
      location: { lat: geo.lat, lng: geo.lng },
      radius: 2000,
      types: ['cafe']
      }, processResults);
    service.nearbySearch({
      location: { lat: geo.lat, lng: geo.lng },
      radius: 2000,
      types: ['gas_station']
      }, processResults);

    function processResults(results, status, pagination) {
      if (status !== google.maps.places.PlacesServiceStatus.OK) {
       return;
      } else {
        createMarkers(results);
        if (pagination.hasNextPage) {
          var moreButton = document.getElementById('more');
          if (moreButton) {
            moreButton.disabled = false;
            moreButton.addEventListener('click', function() {
             moreButton.disabled = true;
             pagination.nextPage();
            });
          }
        }
        barImg = null;    // set to null for fruit images;
      }
    }
    function createMarkers(places) {
      var bounds = new google.maps.LatLngBounds();
      var placesList = document.getElementById('places');

      for (var i = 0, place; place = places[i]; i++) {
        var image = {
         // url is where you put the var name of icon
         url: barImg ? barImg : FRUITS[i % FRUITS.length],
         size: new google.maps.Size(71, 71),
         origin: new google.maps.Point(0, 0),
         anchor: new google.maps.Point(17, 34),
         scaledSize: new google.maps.Size(25, 25)
        };
        var marker = new google.maps.Marker({
           map: mapInstance,
           icon: image,
           title: place.name,   // lat && lng are functions are place.geometry.location!
           position: place.geometry.location,
           lat: place.geometry.location.lat(),
           lng: place.geometry.location.lng()
        });
        if (barImg)
          powerups.push(marker);
        else
          bonuses.push(marker);
        bounds.extend(place.geometry.location);
      }
      mapInstance.fitBounds(bounds);
    }
  });
});
