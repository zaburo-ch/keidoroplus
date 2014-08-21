
//-------------ベンダープレフィックスいろいろ-------------
window.RTCPeerConnection = (window.webkitPeerConnection00 || window.webkitRTCPeerConnection || window.mozRTCPeerConnection);
window.RTCSessionDescription = (window.mozRTCSessionDescription || window.RTCSessionDescription);
window.RTCIceCandidate = (window.mozRTCIceCandidate || window.RTCIceCandidate);
navigator.getUserMedia = navigator.getUserMedia ||
                            navigator.webkitGetUserMedia ||
                            navigator.mozGetUserMedia ||
                            navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL;

//-------------いろいろな変数の宣言-------------
var audioWrapper = document.getElementById('wrapper');
var localStream = null;
var deviceReady = false;
//var remoteVideo = document.getElementById('remoteVideo');
var peerConnection = null;
var peerStarted = false;
var members = {};
var memberCount = 0;
var isReady = false;
var readyCount = 0;
var myteam = 0;
var navi = "";
var tekinavi = "";

//-------------Memberまわり-------------
function Member() { // Connection Class
  var self = this;
  var id = "";
  var team = 0;
  var peer = null;
  var dataChannel = null;
}

function addMember(id, member) {
  members[id] = member;
}

function removeMember(id){
  delete members[id];
}

function prepareNewMember(id){
  var mem = new Member();
  mem.id = id;
  addMember(id,mem);
}


//-------------ソケットまわり-------------
var socketReady = false;
var port = 9001;
var socket = io.connect('http://localhost:' + port + '/');
socket.on('connect', onOpened)
      .on('message', onMessage);

function onOpened(evt) {
  console.log('socket opened.');
  socketReady = true;

  var roomname = getRoomName();
  socket.emit('enter');
}

function onMessage(evt) {
  switch(evt.type){
  case "enter_room":
    console.log("add member " + evt.from);
    prepareNewMember(evt.from);
    memberCount++;
    socket.json.send({type: "i_exist", sendto: evt.from });
    break;
  case "disconnect":
    console.log("remove member " + evt.from);
    removeMember(evt.from);
    memberCount--;
    break;
  case "i_exist":
    console.log("add now member " + evt.from);
    prepareNewMember(evt.from);
    memberCount++;
    break;
  case "i_am_ready":
    console.log("" + evt.from + "is ready");
    if(isReady){
      socket.json.send({type: "me_too", sendto: evt.from});
    }
    break;
  case "me_too":
    console.log("" + evt.from + "is ready too");
    readyCount++;
    if(readyCount==memberCount){
      console.log("everyone is ready, start!");
      socket.json.send({type: "start"});
      initOrganization();
    }
    break;
  case "start":
    console.log("start!");
    initOrganization();
    break;
  case "my_team":
    console.log(""+evt.from+" is team "+evt.team);
    members[evt.from].team = evt.team;
    readyCount++;
    if((readyCount==memberCount)&&(isReady)){
      selectNavigator();
    }
    break;
  case "navigator":
    if(evt.team==myteam){
      if(evt.isme){
        navi = "me";
      }else{
        navi = evt.from;
        naviIsArranged();
      }
      console.log("navigator is " + navi);
    }else{
      tekinavi = evt.from;
    }
    if((navi!="")&&(tekinavi!="")){
      prepareConnections();
    }
    break;
  case "offer":
    console.log("receive offer from "+evt.from);
    if(!deviceReady){
      var timerId = setInterval(function(){
        if(deviceReady){
          clearInterval(timerId);
          onOffer(evt);
        }
      },1000);
    }else{
      onOffer(evt);
    }
    break;
  case "answer":
    console.log("receive answer from "+evt.from);
    members[evt.from].peer.setRemoteDescription(new RTCSessionDescription(evt.sdp));
    break;
  case "candidate":
    console.log("receive candidate from "+evt.from);
    members[evt.from].peer.addIceCandidate(new RTCIceCandidate(evt.candidate));
    break;
  }
}

//-------------会議室名の取得(?以下を取得)-------------
function getRoomName() {
  var url = document.location.href;
  var args = url.split('?');
  if (args.length > 1) {
    var room = args[1];
    if (room != "") {
      return room;
    }
  }
  return "defaultroom";
}

//-------------準備OKボタン-------------
function imready(){
  document.getElementById("okbtn").disabled = "disabled";
  isReady = true;
  socket.json.send({type: "i_am_ready"});
}

//-------------チーム分け-------------
function initOrganization(){
  readyCount = 0;
  isReady = false;
  document.getElementById("keibtn").disabled = "";
  document.getElementById("drobtn").disabled = "";
}

function organization(status){
  document.getElementById("keibtn").disabled = "disabled";
  document.getElementById("drobtn").disabled = "disabled";

  myteam = status;
  isReady = true;
  socket.json.send({type: "my_team", team:myteam});
  if(readyCount==memberCount){
      selectNavigator();
  }
}

//-------------ナビゲータ選び-------------
function selectNavigator(){
  document.getElementById("navbtn").disabled = "";
}

function beNavi(){
  document.getElementById("navbtn").disabled = "disabled";
  socket.emit('be_navi',myteam);
}

function naviIsArranged(){
  document.getElementById("navbtn").disabled = "disabled";
}

//-------------データ共有の準備をする-------------
function prepareConnections(){
  startVideo();
}

function startVideo() {
  navigator.getUserMedia({video: false, audio: true},
    function (stream) { // success
      localStream = stream;

      deviceReady = true;
      prepareVoiceConnection();
    },
    function (error) { // error
      console.error('An error occurred: [CODE ' + error.code + ']');
      return;
    }
  );
}

function prepareVoiceConnection(){
  console.log("prepareVoiceConnection");
  if(navi=="me"){
    for(var id in members){
      sendOffer(members[id]);
    }
  }else{
    for(var id in members){
      if((members[id].team !== myteam)||(id==navi)||(id==tekinavi)) continue;
      sendOffer(members[id]);
    }
  }
  waitForStart();
}

function sendOffer(member) {
  console.log("send offer to "+member.id);
  member.peer = prepareNewConnection(member.id);
  if(navi=="me"){
    member.dataChannel = member.peer.createDataChannel('RTCDataChannel');
    member.dataChannel.onmessage = onDataReceived;
  }
  member.peer.createOffer(function (sdp) {
    // in case of success
    member.peer.setLocalDescription(sdp);
    console.log("send sdp to "+member.id);
    sdp.sendto = member.id;
    socket.emit('send_offer',JSON.stringify({
      "type":"offer",
      "sdp":sdp,
      "sendto":member.id }));
  }, function () {
    // in case of error
    console.log("Create Offer failed");
  });
}

function onOffer(evt){
  var member = members[evt.from];
  member.peer = prepareNewConnection(evt.from);
  member.peer.setRemoteDescription(new RTCSessionDescription(evt.sdp));
  member.peer.createAnswer(function (sdp) {
    // in case of success
    member.peer.setLocalDescription(sdp);
    console.log("send answer to "+member.id);
    socket.json.send({"type":"answer" ,"sdp":sdp ,"sendto":member.id});

    if((navi==member.id)||(tekinavi==member.id)){
      member.peer.ondatachannel = function(evt) {
        member.dataChannel = evt.channel;
        member.dataChannel.onmessage = onDataReceived;
      };
    }
  }, function () {
    // in case of error
    console.log("Create Answer failed");
  });
}

function prepareNewConnection(id) {
  var pc_config = {"iceServers":[]};
  var peer = null;
  try {
    peer = new RTCPeerConnection(pc_config);
  } catch (e) {
    console.log("Failed to create peerConnection, exception: " + e.message);
  }

  // send any ice candidates to the other peer
  peer.onicecandidate = function (evt) {
    if (evt.candidate) {
      socket.json.send({
        "type":"candidate",
        "candidate":evt.candidate,
        "sendto":id
      });
    }
  };

  if(id!=tekinavi){
    console.log('Adding local stream...');
    peer.addStream(localStream);
    peer.addEventListener("addstream", onRemoteStreamAdded, false);
    peer.addEventListener("removestream", onRemoteStreamRemoved, false);
  }



  // when remote adds a stream, hand it on to the local video element
  function onRemoteStreamAdded(event) {
    console.log("Added remote stream");
    peer.audio = document.createElement("audio");
    //peer.audio.controls = true;
    peer.audio.src = window.URL.createObjectURL(event.stream);
    audioWrapper.appendChild(peer.audio);
    peer.audio.play();
  }

  // when remote removes a stream, remove it from the local video element
  function onRemoteStreamRemoved(event) {
    console.log("Remove remote stream");
    peer.audio.src = "";
    audioWrapper.removeChild(peer.audio);
  }

  return peer;
}

//-------------DataChanelからデータが来た！-------------
function onDataReceived(evt){
  console.log("data received through dataChannel");
  var data = JSON.parse(evt.data);
  switch(data.type){
  case "i_am_ready":
    readyCount++;
    if((readyCount==memberCount)&&(isReady)){
      hoge();
    }
    break;
  }
}

//-------------全員がスタートを押すのを待つ-------------
function waitForStart(){
  console.log("wait for start");
  isReady = false;
  readyCount = 0;
  document.getElementById("startbtn").disabled = "";
}

function gameStart(){
  isReady = true;
  document.getElementById("startbtn").disabled = "disabled";
  if((navi=="me")&&(myteam==1)){
    if(readyCount==memberCount){
      hoge();
    }
    return;
  }
  if(myteam==1){
    var timerId = setInterval(function(){
        if(members[navi].dataChannel){
          clearInterval(timerId);
          members[navi].dataChannel.send(JSON.stringify({"type":"i_am_ready"}));
          console.log("sent data through DataChannel");
        }
      },1000);
  }else{
    var timerId = setInterval(function(){
        if(members[tekinavi].dataChannel){
          clearInterval(timerId);
          members[tekinavi].dataChannel.send(JSON.stringify({"type":"i_am_ready"}));
          console.log("sent data through DataChannel");
        }
      },1000);
  }

}

//-------------
function hoge(){
  console.log("game is on moving!");
}