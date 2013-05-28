var net = require('net'),
    event = require('events'),
    channel = new event.EventEmitter(),
    users = {},
    rooms = { 'lobby' : [] },
    someNum = 0,
    onlineCount = 0;

/*******************************
 * SET PORT BELOW
*******************************/
var port = process.env.PORT || 3000;
/*******************************
 * SET PORT ABOVE
*******************************/

var server = net.Server( function( socket ) {
  var id = ++someNum;
  var name = 'Guest' + id;
  var currentRoom = 'lobby';
  onlineCount++;

  // populate user data
  socket.id = id;
  socket.name = name;
  socket.currentRoom = currentRoom;

  // add user to global user list & lobby room
  users[id] = socket;
  rooms[currentRoom].push(id);

  welcomeUser ( socket );
  handleMessages( socket );
  handleDisconnect( socket );
} );

server.listen(port);
console.log('Chatty Chatty Bang Bang!');
console.log('------------------------')
console.log('Listening in on port ' + port);
console.log('------------------------')

// FUNCTIONS
function welcomeUser ( socket ) {
  console.log('CONNECTED: ' + socket.name );
  socket.write('Welcome!\n');
  if (onlineCount > 1 ) {
    socket.write('There are ' + onlineCount + ' users online.\n' )
  }
  else {
    socket.write("It's just you here!\n");
  }
}

function handleMessages ( socket ) {
  socket.on( 'data', function( data ) {
    var dat = data.toString();
    if(dat.indexOf('/') === 0) {
      channel.emit('syscommand', dat, socket );
    }
    else {
      channel.emit('message', dat, socket );
    }
  } );
}

function handleDisconnect ( socket ) {
  socket.on( 'end', function() {
    leaveRoom( socket );
    userCleanup ( socket );
  } );
}

function sysToUsrMessage( socket, msg ) {
  socket.write('SYSTEM: ' + msg + '\n');
}

function errorMessage( socket, msg ) {
  socket.write('ERROR: ' + msg + '\n');
}

function joinRoom ( room, socket ) {
  socket.currentRoom = room;
  rooms[room].push( socket.id );
  sysToUsrMessage( socket, 'You have joined ' + room );
}

function leaveRoom( socket ) {
  var room = socket.currentRoom;
  var index = rooms[room].indexOf( socket.id );
  if (index === -1) {
    errorMessage( socket, 'Cannot leave room');
    return;
  }
  rooms[room].splice(index, 1);
}

function userCleanup( socket ) {
  delete users[socket.id];
  onlineCount--;
  console.log('DISCONNECTED: ' + socket.name );
}

// EVENT HANDLERS
channel.on('message', function( msg, socket ) {
  var userName = socket.name;
  var id = socket.id;
  var currentRoom = socket.currentRoom;
  for(var index in rooms[currentRoom]) {
    var ourId = rooms[currentRoom][index];
    if( ourId !== id) { // don't send to self
      users[ourId].write( userName + ': ' + msg );
    }
  }
});

channel.on('syscommand', function( command, socket ) {
  var cmds = command.trim().split(' ');
  switch( cmds[0] ) {
    case '/help':
      sysToUsrMessage( socket, 'Available commands (prefixed by /):');
      sysToUsrMessage( socket, 'help nick room exit\n');
      break;
    case '/nick':
      var requestedNick = cmds[1];
      // check for arg
      if (!requestedNick) {
        errorMessage( socket, 'syntax: /nick NEW_NICKNAME');
        return;
      }
      // nick cannot contain 'Guest'
      if(requestedNick.indexOf('Guest') >= 0) {
        errorMessage( socket, 'Name cannot contain "Guest".');
        return;
      }
      // check for existing name
      for(var index in users) {
        if(users[index].name.toLowerCase() === requestedNick.toLowerCase() ) {
          errorMessage( socket, 'Name currently in use.' );
          return;
        }
      }
      // w00t, lets set our name!
      socket.name = requestedNick;
      sysToUsrMessage( socket, 'Your new nickname is ' + requestedNick );
      break;
    case '/room':
      var requestedRoom = cmds[1];
      // check for arg
      if (!requestedRoom) {
        errorMessage( socket, 'syntax: /room ROOM_NAME' );
        return;
      }
      // check if room exists; if not create it
      if (!rooms[requestedRoom] ) {
        rooms[requestedRoom] = [];
      }
      // w00t, letse join a room!
      leaveRoom( socket );
      joinRoom( requestedRoom, socket );
      break;
    case '/exit':
      sysToUsrMessage( socket, 'Goodbye!' );
      delete users[socket.id];
      socket.end();
      this.emit('sysmessage', socket.name + ' has disconnected.\n');
      break;
    default:
      errorMessage( socket, 'Command not recognized.' );
      break;
  }
});

channel.on('sysmessage', function( msg ) {
  for(var index in users) {
    users[index].write( 'SYSTEM: ' + msg );
  }
} );
