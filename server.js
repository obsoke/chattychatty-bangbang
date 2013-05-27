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
      socket.write('Available commands (prefixed by /):\n');
      socket.write('help nick exit\n');
      break;
    case '/nick':
      var requestedNick = cmds[1];
      // check for arg
      if (!requestedNick) {
        socket.write('syntax: /nick NEW_NICKNAME\n');
        return;
      }
      // nick cannot contain 'Guest'
      if(requestedNick.indexOf('Guest') >= 0) {
        socket.write('ERROR: Name cannot contain "Guest".\n');
        return;
      }
      // check for existing name
      for(var index in users) {
        if(users[index].name.toLowerCase() === requestedNick.toLowerCase() ) {
          socket.write('ERROR: Name currently in use.\n');
          return;
        }
      }
      // w00t, lets set our name!
      socket.name = requestedNick;
      socket.write('Your new nickname is ' + requestedNick + '\n');
      break;
    case '/exit':
      delete users[socket.id];
      socket.write('Goodbye!\n');
      socket.end();
      this.emit('sysmessage', socket.name + ' has disconnected.\n');
      break;
    default:
      socket.write('Command not recognized.\n');
      break;
  }
});

channel.on('sysmessage', function( msg ) {
  for(var index in users) {
    users[index].write( 'SYSTEM: ' + msg );
  }
} );

var server = net.Server( function( socket ) {
  var id = ++someNum;
  var name = 'Guest' + id;
  var currentRoom = 'lobby';
  onlineCount++;
  socket.id = id;
  socket.name = name;
  socket.currentRoom = currentRoom;
  users[id] = socket;
  rooms[currentRoom].push(id);

  socket.write('Welcome!\n');
  if (onlineCount > 1 ) {
    socket.write('There are ' + onlineCount + ' users online.\n');
  }
  else {
    socket.write("It's just you here!\n");
  }

  socket.on( 'data', function( data ) {
    var dat = data.toString();
    if(dat.indexOf('/') === 0) {
      channel.emit('syscommand', dat, socket );
    }
    else {
      channel.emit('message', dat, socket );
    }
  } );

  socket.on( 'end', function() {
    var index = rooms[socket.currentRoom].indexOf(socket.id);
    rooms[socket.currentRoom].splice(index, 1);
    delete users[socket.id];
    onlineCount--;
    console.log('DISCONNECTED: ' + socket.name );
  } );
} );

server.listen(port);
console.log('Chatty Chatty Bang Bang!');
console.log('------------------------')
console.log('Listening in on port ' + port);
console.log('------------------------')
