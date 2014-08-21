
var connections = {};
var connectionCount = 0;
var socketReady = false;
var roomname = "";
var socket = null;
var myId = "";


/////Connection関係

function Connection() { // Connection Class
  var self = this;
  var id = "";  // socket.id of partner
  var peerconnection = null; // RTCPeerConnection instance
  var established = false; // is Already Established
  var iceReady = false;
}

function getConnection(id) {
  var con = null;
  con = connections[id];
  return con;
}

function addConnection(id, connection) {
  connections[id] = connection;
}

function prepareNewConnection(id){
  var conn = new Connection();
  conn.id = id;
  addConnection(id,conn);
}


/////socket関係

function onOpened(evt) {
    console.log('socket opened.');
    socketReady = true;
    roomname = getRoomName();
    socket.emit('enter', roomname);
}

function onMessage(evt) {
  var fromId = evt.from;

  switch(evt.type){
  case "enter_room":
    prepareNewConnection(fromId);
    console.log("new connection : " + fromId);
    connectionCount++;
    socket.json.send({type: "i_exist", sendto: fromId });
    break;
  case "i_exist":
    if(fromId==evt.sendto) break;
    myId = evt.sendto;
    console.log("my id : " + myId);
    prepareNewConnection(fromId);
    console.log("new connection : " + fromId);
    connectionCount++;
    break;
  }

}

function getRoomName() {
  var url = document.location.href;
  var args = url.split('?');
  if (args.length > 1) {
    var room = args[1];
    if (room != "") {
      return room;
    }
  }
  return "_defaultroom";
}


//init
function init(){
  socket = io.connect('http://localhost:8124/');
  socket.on('connect', onOpened).on('message', onMessage);
}

init();