
Markers = new Mongo.Collection('markers');
// Markers fields: _id, lat, lng, picUrl, userId, username, createdAt (needed for sorting)

ImageData = new Mongo.Collection('imageData');
// ImageData fields: _id, markerId, userId, username, picUrl, topic, createdAt, upCount, downCount
// topics (camelCase keys): hot guys, hot girls, cute cats, cute dogs, cool cars, landmarks, venues, events, selfies, traffic

Votes = new Mongo.Collection('votes');
// Votes fields: {_id: picId, votes: {userId: (-1 or 1), ...}}   // -1 for down, 1 for upvote;

// Comments fields: _id, picId, userId, username, comment, createdAt
// comments are deletable, but not editable like tweets
