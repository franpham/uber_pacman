"use strict";

Template.onePic.events({   // "this" is the ImageData;
  'click .coolImage' : function() {
    var marker = markers[this.markerId];
    if (marker) {                     // bounce the marker only IF user created one;
      marker.setAnimation(googler.Animation.BOUNCE);
      setTimeout(function() {
        marker.setAnimation(null);
      }, 3000);
    }
  }
});

Template.onePic.events({   // "this" is the ImageData;
  'dblclick .coolImage' : function() {
    var marker = markers[this.markerId];          // delete the marker only IF user created one;
    if (Meteor.userId() !== this.userId)
      return;
    else if (!marker)
      alert('No location was specified for this photo.');
    else if (confirm('Are you sure you want to delete this photo and its map marker?')) {
      filepicker.remove(this.picUrl);             // DELETE IMAGE FROM FILEPICKER SERVER;
      ImageData.remove({ '_id': this._id });
      Markers.remove({ '_id': this.markerId });   // this will trigger removeMarker() via observe() below;
    }
    else
      console.log("The user cancelled deleting.");
  }
});

Template.onePic.events({   // "this" is the ImageData;
  'click .like' : function() {
    if (!Meteor.userId())
      return;
    var vote = {};
    vote[this.userId] = 1;
    Votes.update({ _id: this._id }, { $set: vote }, { upsert: true });
    ImageData.update({ _id: this._id }, { $inc: { upCount: 1 }});
  }
});

Template.onePic.events({   // "this" is the ImageData;
  'click .dislike' : function() {
    if (!Meteor.userId())
      return;
    var vote = {};
    vote[this.userId] = -1;
    Votes.update({ _id: this._id }, { $set: vote }, { upsert: true });
    ImageData.update({ _id: this._id }, { $inc: { downCount: -1 }});
  }
});

Template.onePic.helpers({
  totalVotes: function() {
    return this.upCount + this.downCount;
  }
});
