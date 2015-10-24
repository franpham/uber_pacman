
Markers = new Mongo.Collection('markers');
// Markers (Users) fields: _id, lat, lng, userId, username, gameId, points, isGhost

// get coordinates of Pacman (!isGhost) to get available games; if none available, create new one;
// 1st player in each game is Pacman, new players are ghosts;
