// The game map is here:
// https://docs.google.com/spreadsheets/d/1Qv0ErfGE5ZeYP5NRfs1Iew8IBmLmw51wy_EAeq_K5SY/edit?usp=sharing
var me = getOrAsk('me', 'What is your name?');
var gameName = getOrAsk('game', 'Which game sheet do you want to use?');
var map = fetch('/fetch/rooms/1Qv0ErfGE5ZeYP5NRfs1Iew8IBmLmw51wy_EAeq_K5SY');

// Player settings
var health = 10;
var items = ['key'];
var level = 1;

await startGame(gameName);

// This function runs the game
async function startGame(world, firstRoom) {
  var details = map[world.toLowerCase()];
  var room;
  if (firstRoom) {
    room = details[firstRoom];
  } else {
    room = details[details['_firstRoom']];
  }
  var message;
  while (true) {
    var choice = await displayRoom(room, message);
    if (Number.isFinite(Number(choice))) {
      var info = room.choices[choice - 1];

      if (checkNeededItems(info) === false) {
        print(`You need ${info.needs}`);
        continue;
      }
      makeChanges(info);
      message = info.message;
      room = map[world.toLowerCase()][info.next.toLowerCase()];
      if (!room) {
        print('You have fallen off the edge of the world.');
      }
    }
  }
}

// This function prints the messages and choices for a room
async function displayRoom(room, message) {
  clear();
  print(`Inventory: 🏥 (${health}) 🎒 (${items.map(emoji).join(',')}) Level: ${level}`);
  print('');
  if (message) {
    printLines(message);
    delay(2);
  }
  printLines(room.prompt);
  print('');
  return choose(room.choices.map(c => c.choice));
}


// Check the player to see if they have all the items needed for this choice
function checkNeededItems(info) {
  if (info.needs) {
    if (items.indexOf(info.needs) < 0) {
      return false;
    }
  }
  return true;
}

// Apply the changes for this choice to the player
function makeChanges(info) {
  if (!info.changes) { return; }
  var toDo = info.changes.split(',');
  for (var change of toDo) {
    if (change[0] === 'h') {
      health = health + Number(change.substring(1));
      health = Math.max(0, health);
      health = Math.min(15, health);
    } else if (change[0] === '-') {
      const ix = items.indexOf(change.substring(1));
      if (ix >= 0) {
        items.splice(ix, 1);
      }
    } else if (change === 'clear') {
      health = 10;
      items = [];
    } else {
      items.push(change);
    }
  }
}

function printLines(message) {
  print(message.replace(/\.\s+/g, '.\n'));
}

function emoji(item) {
  return {
    key: '🔑',
  }[item.toLowerCase()] || item;
}

