
Markers = new Mongo.Collection('markers');    // Markers have 1-to-1 correspondence to Users;
// Markers fields: _id, lat, lng, userId, username, gameId, points, isGhost, lastCollide, startTime
// 1st player in each game is Pacman, new players are ghosts;

Games = new Mongo.Collection('games');
// Games fields: _id, lat, lng, players: {_id (markerId): points, ...}
// lat & lng are updated every minute; if no games within 10 miles of player, create new one;
