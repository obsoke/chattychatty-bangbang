var net = require('net'),
    event = require('events'),
    channel = new event.EventEmitter(),
    users = {},
    rooms = { 'lobby' : {} },
    someNum = 0,
    onlineCount = 0;

/*******************************
 * SET PORT BELOW
*******************************/
var port = 3000;
/*******************************
 * SET PORT ABOVE
*******************************/

// blooop
channel.on('message', function( msg, id, userName ) {
  for(var index in users) {
    if(users[index].id !== id) {
      users[index].write( userName + ': ' + msg );
    }
  }
});

channel.on('syscommand', function( command, socket ) {
  var cmds = command.trim().split(' ');
  switch( cmds[0] ) {
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
      this.emit('message', socket.name + ' has disconnected.\n', socket.id, 'SYSTEM');
      delete users[socket.id];
      socket.write('Goodbye!\n');
      socket.end();
      break;
    default:
      socket.write('Command not recognized.\n');
      break;
  }
});

var server = net.Server( function( socket ) {
  var id = ++someNum;
  var name = 'Guest' + id;
  onlineCount++;
  console.log('CONNECTED: ' + name);
  socket.id = id;
  socket.name = name;
  users[id] = socket;

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
      channel.emit('message', dat, socket.id, socket.name);
    }
  } );

  socket.on( 'end', function() {
    console.log('DISCONNECTED: ' + socket.name );
    onlineCount--;
    console.log(onlineCount);
    delete users[socket.id];
  } );
} );

server.listen(port);
console.log('Chatty Chatty Bang Bang!');
console.log('------------------------')
console.log('Listening in on port ' + port);
console.log('------------------------')
