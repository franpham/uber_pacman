"use strict";
// TODO: subscribe/ publish latest 60 pics/ markers, allow() permissions for Users & Collections, image description, upVote/ downVote DB & handlers;
var LABELS = '12345678ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';    // label only 60 markers;
var TOPICS = ['myPics', 'hotGuys', 'hotGirls', 'cuteCats', 'cuteDogs', 'coolCars', 'landmarks', 'venus', 'events', 'selfies', 'traffic'];

var markers = {};           // the current Markers on the map;
var mapInstance = null;     // needed to add map markers & listeners;
var googler = null;         // needed by outer functions;
var infoWindow = null;      // pop-up that's reused when marker is active;
var thisTopic = '';         // the current topic;
var totalMarkers = 0;       // total # of markers shown;
var labelIndex = 0;         // label index for markers;
var markMe = null;          // the user's current position;

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
    var subject = Router.current().params.topic;
    thisTopic = TOPICS.indexOf(subject) < 0 ? 'cuteCats' : subject;
    $('#topics').prop('value', thisTopic);    // change #topics list value;
    var query = thisTopic === 'myPics' ? { userId: Meteor.userId() } : { topic: thisTopic };
    if (googler) {              // if no googler, markers are set by observe() in GoogleMaps.ready();
      Meteor.setTimeout(function() {
        var images = ImageData.find(query).fetch();
        totalMarkers = images.length;
        refreshMap(images);          // SET THE NEW MARKERS;
      }, 1000);                      // HACK: wait 1 sec so Meteor can finish templating;
    }
    return ImageData.find(query);    // SET THE NEW IMAGES;
  }
});

Template.main.events({
  "change #topics" : function (event) {
    thisTopic = event.originalEvent.srcElement.value;
    Router.go('/main/' + thisTopic);
  }
});

function refreshMap(images) {
  var keys = Object.keys(markers);      // remove the old Markers;
  for (var i = 0; i < keys.length; i++) {
    if (markers[keys[i]])
      removeMarker(markers[keys[i]]);
  }
  labelIndex = 0;        // must reset labelIndex when refreshing;
  console.log('refreshMap: old markers = ' + keys.length + '; new markers = ' + images.length);
  var markerIds = images.map(function(pic) {
    return pic.markerId;
  });
  var markersMap = {};
  var picMarkers = Markers.find({ '_id': { $in: markerIds }}).fetch();
  picMarkers.forEach(function(marker) {
    markersMap[marker._id] = marker;
  });
  for (var i = 0; i < images.length; i++) {
    var markerId = images[i].markerId;
    var picDate = new Date(images[i].createdAt);
    var picLabel = 'Created by ' + images[i].username + ',\n' + picDate.toLocaleDateString() + ', ' + picDate.toLocaleTimeString();
    if (markerId) {                           // add a marker only IF user created one;
      var labelText = labelIndex < LABELS.length ? LABELS[labelIndex++ % LABELS.length] : '';
      var data = markersMap[markerId];
      var marker = new googler.Marker({
        draggable: true,
        animation: googler.Animation.DROP,
        position: new googler.LatLng(data.lat, data.lng),
        map: mapInstance,
        userId: images[i].userId,
        picUrl: images[i].picUrl,
        label: labelText,
        title: picLabel,
        _id: markerId
        // Store markerId in marker to update the database in the 'dragend' event;
      });
      $('#' + images[i].markerId + '_tip').prop('title', picLabel);
      $('#' + images[i].markerId + '_cap').text(labelText);
      addMarker(marker);    // add the new marker;
    }
  } // MUST CALL foundation() on each refresh!
  $('.caption:empty').prop('title', 'No marker was added.');
  $('.caption:empty').text('--');
  $(document).foundation();
}

// removeMarker expects a google.maps.Marker INSTANCE;
function removeMarker(marker) {
  googler.event.clearInstanceListeners(marker);
  delete markers[marker._id];   // remove the reference to the marker
  marker.setMap(null);          // remove the marker from the map
}

// addMarker expects a google.maps.Marker INSTANCE;
function addMarker(marker) {      // update the marker's coordinates after dragging;
  googler.event.addListener(marker, 'dragend', function(event) {
    Markers.update(marker._id, { $set: { lat: event.latLng.lat(), lng: event.latLng.lng() }});
  });

  marker.addListener('click', function() {
    var image = '<a href="' + marker.picUrl + '" target="_blank"><img src="' + marker.picUrl + '" /></a>';
    infoWindow.setContent(image);
    infoWindow.open(mapInstance, marker);
  });
  // ------------------    MARKERS ARE UPDATED WHENEVER USER FINISH DRAGGING IT    --------------
  markers[marker._id] = marker;   // Store marker instance within the markers dict;
}

Template.main.onCreated(function() {
  var self = this;      // set BEFORE GoogleMaps.ready();

  GoogleMaps.ready('map', function(map) {
    console.log("GoogleMaps is ready!");
    googler = google.maps;
    mapInstance = map.instance;

    // --------------------------      filepicker widget must be added AFTER GoogleMaps loaded;    ----------------------
    var upload = $('#upload').get()[0];
    upload.setAttribute('type', 'filepicker');
    upload.setAttribute('data-fp-mimetype', 'image/*');
    upload.setAttribute('data-fp-button-text', 'Upload Photo');
    upload.setAttribute('data-fp-store-location', 's3');
    upload.setAttribute('data-fp-maxsize', '5500000');
    upload.setAttribute('data-fp-multiple', 'false');
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
    filepicker.setKey('AL1xLgWq0SsykUvj3fM0lz');
    filepicker.constructWidget(upload);

    self.autorun(function() {     // --------------   AUTO UPDATE THE USER'S POSITION   ---------------------
      var geo = Geolocation.latLng();
      if (!geo)
        return;
      else if (markMe) {
        markMe.setPosition(geo);
        mapInstance.setCenter(markMe.getPosition());
      }
      else {
        markMe = new google.maps.Marker({
          draggable: false,
          animation: google.maps.Animation.DROP,
          position: new google.maps.LatLng(geo.lat, geo.lng),
          map: mapInstance,
          userId: Meteor.userId(),
          title: Meteor.user().username,
          label: '*'
        });
      }
    });
    $('#topics').prop('value', thisTopic);    // change #topics list value;
    infoWindow = new google.maps.InfoWindow({ content: '' });
    Meteor.setTimeout(function() {
      $(document).foundation();  // MUST call foundation() after DOM loading;
    }, 1000);   // args: 'tooltip', 'reflow'

    // newDocument & oldDocument are Mongo Markers objects;
    Markers.find().observe({
      // NOTE: ADDED IS ALSO CALLED WHEN DOM IS 1ST LOADED;
      added: function(document) {   // document is a Mongo Marker object;
        var labelText = labelIndex < LABELS.length ? LABELS[labelIndex++ % LABELS.length] : '';
        var picLabel =  'Created by ' + document.username;
        var marker = new google.maps.Marker({
          draggable: true,
          animation: google.maps.Animation.DROP,
          position: new google.maps.LatLng(document.lat, document.lng),
          map: mapInstance,
          userId: Meteor.userId(),
          picUrl: document.picUrl,
          title: picLabel,
          label: labelText,
          _id: document._id
          // Store _id in marker to update the database in the 'dragend' event;
        });
        $('#' + document._id + '_tip').prop('title', picLabel);
        $('#' + document._id + '_cap').text(labelText);
        addMarker(marker);      // >= so methods are called after adding all markers and for new ones;
        if (labelIndex >= totalMarkers) {
          $('.caption:empty').parent().prop('title', 'No marker was added.');
          $('.caption:empty').text('--');    // all markers have images, so set text for unmarked images;
          // $(document).foundation();       // testing, not needed;
        }
      },
      changed: function(newDocument, oldDocument) {
        markers[oldDocument._id].setMap(null);        // remove from Map to set new position;
        markers[oldDocument._id].setPosition(new google.maps.LatLng(newDocument.lat, newDocument.lng));
        markers[oldDocument._id].setMap(mapInstance);
      },
      removed: function(oldDocument) {       // oldDocument is a Mongo Markers object;
        removeMarker(markers[oldDocument._id]);
      }
    });
  });
});
