var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var users = [];
var currentDrawer;
var dictionnary;
var words = [];
var rounds = []; //word, drawer, winner
var roundIndex = 0;
var NB_TOTAL_ROUNDS = 10;
var TIMELEFT = 50000;
var timeoutInterval;

app.use(express.static(__dirname));

io.origins('*:*');

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});


io.on('connection', function(socket){
  var color = '#0b5de2';
  var user;
 

  function startGame() {
    fs.readFile(__dirname + '/dictionnary.txt', function (err, data) {
        
      dictionnary = data.toString('utf-8').split('\r\n');
      
      var randoms = [];
      for(var i=0; i<NB_TOTAL_ROUNDS; i++){
        while(true){
          var random = Math.ceil(Math.random()*dictionnary.length-1)
          if(randoms.indexOf(random) == -1) 
            break;
        }
        randoms[i] = random; //store random
        rounds[i] = {};
        rounds[i].word = dictionnary[random];
      }

      startRound();
    });
  }; 

  function startRound() {
    if (roundIndex == 0 || !rounds[roundIndex-1].winner) { //set the drawer
      currentDrawer = users[Math.floor((Math.random() * users.length))];
    } else {
      currentDrawer = rounds[roundIndex-1].winner;
    }
    console.log('le round n°'+roundIndex);


    currentDrawer.status = 'DRAWER';
    rounds[roundIndex].drawer = currentDrawer;
    io.sockets.emit('new-drawer', rounds[roundIndex].drawer); //send who's the drawer for this round
    io.sockets.emit('start-round', rounds[roundIndex].word, TIMELEFT); //send the word to draw : round can begin

    timeoutInterval = setTimeout(timeOut, TIMELEFT);
    console.log('new interval');
  }

  function timeOut(){
    clearTimeout(timeoutInterval);
    io.sockets.emit('special-message', {color : 'red', content: rounds[roundIndex].word + ' était la bonne réponse !'+ getClassement()});    
    if (roundIndex < NB_TOTAL_ROUNDS-1) {
      roundIndex++;
      startRound();
    } else {
      endGame();
    }
	}



  socket.on('new-player', function(name){
      user = { id: socket.id, name: name, color: color, score: 0, status: 'PLAYER' };
      users.push(user);

      io.to(user.id).emit('game-joined', user); //only sent to new user
      io.sockets.emit('special-message', {color : color, content: name + ' a rejoint'});

      if(users.length < 2) {
        io.sockets.emit('special-message', {color: color, content: 'En attente d\'un autre joueur...'});
      } else {
        startGame();
      }

      console.log(user.name + ' connected : '+user.id);
  });

  socket.on('on-draw', function(line){
      io.sockets.emit('draw', line);
  });

  


  socket.on('disconnect', function(){
    for (var i = 0; i < users.length; i++) {
      if(users[i].id == socket.id) {
        if(users[i].status == 'DRAWER') currentDrawer = null;
        users.splice(i, 1);
        break;
      }
    }
    console.log('user disconnected :' + socket.id );
  });


  socket.on('message', function(msg){
    console.log('message: ' + msg);
    io.sockets.emit('message', msg, user);

    // check if it's right sentence
    if(rounds[roundIndex].word == msg){
      rounds[roundIndex].winner = user.id;
      users[users.indexOf(user)].score++;
      if(currentDrawer) users[users.indexOf(currentDrawer)].score++; //maybe there is not a drawer anymore

      io.sockets.emit('special-message', {color : 'orange', content: user.name + ' a trouvé le mot "'+rounds[roundIndex].word+'" !'+ getClassement()});
      //start new round
      if(roundIndex<NB_TOTAL_ROUNDS-1){
        clearTimeout(timeoutInterval);
        rounds[roundIndex].winner = user; //set the winner
        roundIndex++;
        startRound();

      } else {//end of game
        endGame();
      }
    }
  });

  function endGame(){
    clearTimeout(timeoutInterval);
    io.sockets.emit('special-message', {color : 'purple', content : '****FIN DU JEU****'});
  }

  function getClassement(){
    var scores = '<br/>----- Classement -----';
    for(var i=0; i<users.length; i++){
      // scores+='<br/>'+(i+1)+'.'+users[i].name+' : '+users[i].score+' pts'; trier les scores pour avoir 1,2,3 ...
      scores+='<br/>'+users[i].name+' : '+users[i].score+' pts';
    }

    return scores;
  }

});

http.listen(5000, function(){
  console.log('listening on *:5000');
});