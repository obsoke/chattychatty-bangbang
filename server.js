var net = require('net'),
    event = require('events'),
    channel = new event.EventEmitter(),
    users = {},
    userCount = 1;

/*******************************
 * SET PORT BELOW
*******************************/
var port = 3000;
/*******************************
 * SET PORT ABOVE
*******************************/

var server = net.Server( function( socket ) {
  console.log('A new user connects!');
  var id = userCount++;
  socket.id = id;
  users[id] = socket;

  socket.on( 'data', function( data ) {
    // socket.write(data);
    channel.emit('message', data);
  } );

  socket.on( 'end', function() {
    console.log('Bye, ' + socket.id + '!');
    delete users[socket.id];
  } );

  // blooop
  channel.on('message', function( data ) {
    for(var index in users) {
      console.log(index);
      console.log(socket.id);

      if(users[index].id !== socket.id) {
        users[index].write( data );
      }
      else {
        console.log('same')
      }
    }
  });

} );


server.listen(port);
console.log('Chatty Chatty Bang Bang!');
console.log('------------------------')
console.log('Listening in on port ' + port);
console.log('------------------------')
