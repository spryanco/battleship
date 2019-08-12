var tileColours = ["white", "lightgrey", "royalblue", "red", "maroon"];
var gridWidth = 450;
var boxHeight = gridWidth / 10;

var gameStates = ["SHIP_PLACEMENT", "BATTLE", "OVER"];
var gameOngoing = false;
var gameState;
var playerTurn = false;

var currentBox;

var playerGrid; 
var opponentGrid; 

var ships;
var shipsSunk = 0;
var ownShipsSunk = 0;
var successfulHits = 0;
var badHits = 0;
var totalHits = 0;

class Ship {
  constructor(type, maxAmount, size) {
    this.type = type;
    this.maxAmount = maxAmount;
    this.size = size;
  }
}

class ShipData {
  constructor(type, originBox, boxes) {
    this.type = type;
    this.originBox = originBox;
    this.boxes = boxes;
  }
}

var classicShipPack = [
  new Ship("Carrier", 1, 5),
  new Ship("Battleship", 1, 4),
  new Ship("Crusier", 1, 3),
  new Ship("Submarine", 1, 2),
  new Ship("Destroyer", 1, 1)
];

function readyGame() {
  gameState = gameStates[0];
  
  ships = [];
  
  playerGrid = {
    x: 10,
    y: 5,
    boxes: [...Array(10)].map(a => Array(10)),
    player: 1
  };

  opponentGrid = {
    x: 600,
    y: 5,
    boxes: [...Array(10)].map(a => Array(10)),
    player: 2
  };
  
  shipsSunk = 0;
  ownShipsSunk = 0;
  successfulHits = 0;
  badHits = 0;
  totalHits = 0;

  setupGrid(true);
  setupGrid(false);
  
  showPanel();
}

function showPanel() {
  var fadeTarget = document.getElementById("interface-panel");
  fadeTarget.style.display = "block";
  fadeTarget.style.opacity = 1;
}

function hidePanel() {
  var fadeTarget = document.getElementById("interface-panel");
  
  var fadeEffect = setInterval(function() {
    if (!fadeTarget.style.opacity) {
      fadeTarget.style.opacity = 1;
    }
    if (fadeTarget.style.opacity > 0) {
      fadeTarget.style.opacity -= 0.1;
    } else {
      clearInterval(fadeEffect);
      fadeTarget.style.display = "none";
    }
  }, 40);
}

function playerJoinQueue() {
  hidePanel();
  joinQueue();
}

function startGame() {
  gameOngoing = true;
  playerTurn = firstPlayer;

  drawGrid(playerGrid.x, playerGrid.y, true);
  drawGrid(opponentGrid.x, opponentGrid.y, false);

  gameState = gameStates[1];
}

function getShip(originNumber) {
  for (i = 0; i < ships.length; i++) {
    var ship = ships[i];
    if (ship.originBox == originNumber) {
      return ship;
    }
  }
}

function changeTurn() {
  playerTurn = !playerTurn;
  refreshGrids();
}

function refreshGrids() {
  drawGrid(playerGrid.x, playerGrid.y, true);
  drawGrid(opponentGrid.x, opponentGrid.y, false);
}

function placeShips() {
  classicShipPack.forEach(function(type) {
    for (i = 0; i < type.maxAmount; i++) {
      betterShipPlacer(type);
    }
  });
}

//The better placer, no overlap.
function betterShipPlacer(type) {
  var placedShip = false;

  while (!placedShip) {
    var overlapping = false;

    var horizontal = Math.random() < 0.5;
    var maxY = 10;
    var maxX = 10;

    if (horizontal) {
      maxX = 10 - type.size;
    } else {
      maxY = 10 - type.size;
    }

    var xCoord = Math.floor(Math.random() * maxX);
    var yCoord = Math.floor(Math.random() * maxY);

    var boxes = new Array(10);

    for (space = 0; space < type.size; space++) {
      var box;
      if (horizontal) {
        box = playerGrid.boxes[yCoord][xCoord + space];
      } else {
        box = playerGrid.boxes[yCoord + space][xCoord];
      }

      if (box.shipType == null) {
        boxes.push(box);
      } else {
        overlapping = true;
      }
    }

    if (!overlapping) {
      var origin = 0;
      boxes.forEach(function(box) {
        if (origin == 0) {
          origin = box.number;
          box.originNumber = box.number;
        }
        box.shipState = 2;
        box.originNumber = origin;
        box.shipType = type;
      });

      ships.push(new ShipData(type, origin, boxes));
      placedShip = true;
    }
  }
}

function getOwnBox(mouseX, mouseY) {
  for (y = 0; y < 10; y++) {
    for (x = 0; x < 10; x++) {
      var matchedBox = playerGrid.boxes[y][x];

      if (
        mouseX >= matchedBox.startX &&
        mouseX <= matchedBox.endX &&
        mouseY >= matchedBox.startY &&
        mouseY <= matchedBox.endY
      ) {
        return matchedBox;
      }
    }
  }
}

function getOwnBox(number) {
  for (y = 0; y < 10; y++) {
    for (x = 0; x < 10; x++) {
      var matchedBox = playerGrid.boxes[y][x];

      if (matchedBox.number == number) {
        return matchedBox;
      }
    }
  }
}

function getTrackingGridBox(number) {
  for (y = 0; y < 10; y++) {
    for (x = 0; x < 10; x++) {
      var matchedBox = opponentGrid.boxes[y][x];

      if (matchedBox.number == number) {
        return matchedBox;
      }
    }
  }
}

function getOpponentBox(mouseX, mouseY) {
  for (y = 0; y < 10; y++) {
    for (x = 0; x < 10; x++) {
      var matchedBox = opponentGrid.boxes[y][x];
      var matchedBox = opponentGrid.boxes[y][x];

      if (
        mouseX >= matchedBox.startX &&
        mouseX <= matchedBox.endX &&
        mouseY >= matchedBox.startY &&
        mouseY <= matchedBox.endY
      ) {
        return matchedBox;
      }
    }
  }
}

function mouseOverBox(mouseX, mouseY) {
  if (gameOngoing && playerTurn) {
    matchedBox = getOpponentBox(mouseX, mouseY);

    if (currentBox != null) {
      fill(currentBox.colour);
      cursor(ARROW);
      stroke("black");
      rect(currentBox.startX, currentBox.startY, boxHeight, boxHeight);
    }

    currentBox = matchedBox;

    if (matchedBox != null) {
      stroke("red");
      var boxColour = color("red");
      cursor(HAND);

      fill(boxColour.levels[0], boxColour.levels[1], boxColour.levels[2], 35);
      rect(matchedBox.startX, matchedBox.startY, boxHeight, boxHeight);
    }
  }
}

function shouldFade(player1) {
  return (gameState == gameStates[1] && (player1 ? playerTurn : !playerTurn));
}

function setupGrid(player1) {
  gridX = player1 ? playerGrid.x : opponentGrid.x;
  gridY = player1 ? playerGrid.y : opponentGrid.y;

  var boxNumber = 1;
  for (y = 0; y < 10; y++) {
    var boxY = gridY + y * boxHeight;

    for (x = 0; x < 10; x++) {
      var boxX = gridX + x * boxHeight;

      var gridBox = {
        colour: tileColours[0],
        startX: boxX,
        startY: boxY,
        endX: boxX + boxHeight,
        endY: boxY + boxHeight,
        shipState: 0, //0 = no ship, 1 = empty box hit, 2 = ship present, 3 = destroyed ship, 4 = fully destroyed ship
        shipType: null,
        hitsReceived: 0,
        originNumber: 0,
        number: boxNumber++
      };

      if (player1) {
        playerGrid.boxes[y][x] = gridBox;
      } else {
        opponentGrid.boxes[y][x] = gridBox;
      }
    }
  }

  if (player1) {
    placeShips();
    drawGrid(playerGrid.x, playerGrid.y, player1);
  } else {
    drawGrid(opponentGrid.x, opponentGrid.y, player1);
  }
}

function drawGrid(gridX, gridY, player1) {
  strokeWeight(2);
  stroke(0);

  if (shouldFade(player1)) {
    stroke(200);
  }

  rect(gridX, gridY, gridWidth, gridWidth);

  var boxHeight = gridWidth / 10;

  for (y = 0; y < 10; y++) {
    for (x = 0; x < 10; x++) {
      var matchedBox = player1
        ? playerGrid.boxes[y][x]
        : opponentGrid.boxes[y][x];

      var boxColour = color(tileColours[matchedBox.shipState]);
      matchedBox.colour = boxColour;

      if (shouldFade(player1)) {
        boxColour.levels[3] = 100;
      }

      fill(
        boxColour.levels[0],
        boxColour.levels[1],
        boxColour.levels[2],
        boxColour.levels[3]
      );
      
      rect(matchedBox.startX, matchedBox.startY, boxHeight, boxHeight);
    }
  }
}

/*
 * SOCKET.IO RESPONSES
 */

//called when the opponent hits a grid space and the data is received via socket.io
function gridHitByOpponent(boxNumber) {
  var matchedBox = getOwnBox(boxNumber);
  var destroyed = false;
  var success = false;
  var boxes = [];

  print(matchedBox);

  if (matchedBox != null) {
    if (matchedBox.shipState == 2) {
      matchedBox.shipState = 3;
      success = true;
 
      var originBox = getOwnBox(matchedBox.originNumber);
      originBox.hitsReceived = originBox.hitsReceived + 1;

      if (matchedBox.shipType.size == originBox.hitsReceived) {
        //fully destroyed ship
        ship = getShip(matchedBox.originNumber);
        ship.boxes.forEach(function(box) {
          box.shipState = 4;
          refreshGrids();
        });
        boxes = ship.boxes;

        destroyed = true;
        alertToPlayer("Your " + matchedBox.shipType.type + " was sunk!");
        ownShipsSunk++;
      } else {
        alertToPlayer("The enemy hit your " + matchedBox.shipType.type + "!");
      }
    } else {
      matchedBox.shipState = 1;
    }
  }

  emitToRoom("gridHitResponse", {
    x: mouseX,
    y: mouseY,
    number: boxNumber,
    type: matchedBox.shipType,
    isSuccessful: success,
    isShipFullyDestroyed: destroyed,
    boxes: boxes
  });
  
  calculateScore();
  
  changeTurn();
}

function hitOpponent(mouseX, mouseY) {
  if (!playerTurn) {
    return;
  }
  var matchedBox = getOpponentBox(mouseX, mouseY);

  if (matchedBox != null) {
    if (getTrackingGridBox(matchedBox.number).shipState != 0) {
      return;
    }
    emitToRoom("gridHit", { x: mouseX, y: mouseY, number: matchedBox.number });
    totalHits++;
  }
}

function calculateScore() {
  if (shipsSunk == 5) {
    //Game over, player won
    gameOngoing = false;
    alertToPlayer("Game Over! You win!");
    
    emitToRoom("gameOver", { player1Won: firstPlayer });
    
    //Remove player from room and reset
  }
  
  if(ownShipsSunk == 5) {
    //Player lost
    gameOngoing = false;
    alertToPlayer("Game Over! You lost!");
    
  }
  
  if(!gameOngoing) {
    //Send statistics to player
    sendFinalStatistics();
    restart();
  }
}

function sendFinalStatistics() {
  chatAlert("Ships Sunk: " + shipsSunk);
  chatAlert("Successful Ship Hits: " + successfulHits);
  chatAlert("Missed Hits: " + badHits);
  chatAlert("Total Hits: " + totalHits);
}

function gridHitResponseReceived(data) {
  if (data.isSuccessful) {
    //ship has been hit, update our opponent tracking grid.
    var trackingBox = getTrackingGridBox(data.number);

    trackingBox.shipState = 3;
    trackingBox.shipType = data.type;

    if (data.isShipFullyDestroyed) {
      data.boxes.forEach(function(box) {
        if (box != null) {
          getTrackingGridBox(box.number).shipState = 4;
        }
      });
      //fully destroyed ship
      trackingBox.shipState = 4;
      alertToPlayer("You sunk an enemy " + trackingBox.shipType.type);
      shipsSunk++;
    } else {
      alertToPlayer("You hit an enemy ship!");
    }
    successfulHits++;
       
    refreshGrids();
  } else {
    var trackingBox = getTrackingGridBox(data.number);

    if (trackingBox != null) {
      trackingBox.shipState = 1;
      alertToPlayer("You didn't find a ship this time...");
      badHits++;
    }

    refreshGrids();
  }
  
  totalHits++;
  calculateScore();

  changeTurn();
}
