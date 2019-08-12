//install libraries
var socketio = require("socket.io");
var express = require("express");

var exp = express();
var gameRooms = [];

//All players connected
var players = [];

//Players waiting for a game
var playersWaiting = [];

//Serve web pages
exp.use(express.static("web"));
var web = exp.listen(process.env.PORT, function() {
  console.log("Server Started");
});

// socket.io to listen to the webserver's connection
var io = socketio.listen(web, { log: false });

//Class for storing player data
class Player {
  constructor(socketID, client) {
    this.socketID = socketID;
    this.client = client;
    this.currentStatus = "WAITING";
    this.gameRoom = null;
  }
}

//Class for storing room data and performs initial room setup code
class Room {
  constructor(p1ID, p2ID) {
    this.player1 = getPlayer(p1ID);
    this.player2 = getPlayer(p2ID);
    this.roomID = "room-" + Math.floor(Math.random() * 1000);

    this.player1.client.join(this.roomID);
    this.player2.client.join(this.roomID);
    
    this.player1.gameRoom = this;
    this.player2.gameRoom = this;

    gameRooms.push(this.roomID);
  }
}

function newPlayer(socketID, socket) {
  console.log("Created new player for " + socketID);
  players.push(new Player(socketID, socket));
  io.emit("updateCount", players.length);
}

function getPlayer(socketID) {
  for (i = 0; i < players.length; i++) {
    var current = players[i];

    if (current.socketID == socketID) {
      return current;
    }
  }
}

function getRoom(roomID) {
  for(i = 0; i < gameRooms.length; i++) {
    var room = gameRooms[i];
    
    if(room.roomID == roomID) {
      return room;
    } 
  }
}
function broadcastToRoom(room, channel, data) {
  io.sockets.in(room.roomID).emit(channel, data);
}

function newPlayerWaiting(socketID) {
  playersWaiting.push(socketID);
  console.log("Player " + socketID + " now waiting");

  attemptMatchCreation();
}

function attemptMatchCreation() {
  var p1ID = playersWaiting[0];
  var p2ID = playersWaiting[1];

  if (p1ID != null && p2ID != null) {
    var room = new Room(p1ID, p2ID);
    console.log("Created new " + room.roomID);

    removePlayerWaiting(p1ID, false);
    removePlayerWaiting(p2ID, false);
    
    io.sockets
      .in(room.roomID)
      .emit("connectedToRoom", { roomID: room.roomID, player1ID: p1ID });
  }
}

function removePlayerWaiting(socketID, hasLeft) {
  var index = playersWaiting.indexOf(socketID);

  if (index > -1) {
    playersWaiting.splice(index, 1);
    console.log("Player " + socketID + " removed from wait list.");
  }

  var player = getPlayer(socketID);
  player.currentStatus = "IN_GAME";
  

  if (hasLeft) {

    console.log("Player " + socketID + " has disconnected.");
    var playerIndex = players.indexOf(player);

    if (playerIndex > -1) {
      players.splice(playerIndex, 1);
      io.emit("updateCount", players.length);
    }

    return;
  }
}

function terminateRoom(roomID, reason) {
  var room = getRoom(room);
  console.log("Attempting to terminate " + roomID);
  
  if(room != null) {
    //Game room exists for ID.
  
    io.sockets.in(roomID).emit("roomTerminated", reason);
    
    var index = gameRooms.indexOf(room);
    gameRooms.splice(index, 1);
    
  
    console.log("Terminated room " + roomID);
  }
}

io.on("connection", function(socket) {
  newPlayer(socket.id, socket);
  socket.emit("playerCreated", socket.id);

  socket.on("disconnect", function() {
    var player = getPlayer(socket.id);
    if(player != null) {
      if(player.gameRoom != null) {
        console.log("Player disconnected from room");
        terminateRoom(player.gameRoom.roomID, "Player has left the room.");
      }
    }
    
    removePlayerWaiting(socket.id, true);
  });

  socket.on("joinGameQueue", function(data) {
    newPlayerWaiting(data);
  });

  socket.on("updateScores", function(data) {
    socket.to(data.room).emit(data.player, data.score);
  });

  //Socket data forwarding to a specific room from a client.
  socket.on("emitGameData", function(data) {
    if(data.name == "gameOver") {
      terminateRoom(data.room, "Game has ended.");
      return;
    }
    socket.to(data.room).emit(data.name, data.data);
  });
});
