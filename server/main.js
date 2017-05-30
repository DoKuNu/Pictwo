$(function () {


  //*********** DRAW *************//

  /* Drawing on Paint App */
  var canvas = $('#canvas');
  ctx = canvas[0].getContext('2d');
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'blue';
  var status;
  var lastpoint = null;
  var painting = false;


  //taken from github, little modif added by me
  function draw(line) {
    ctx.beginPath();
    
    if(line.from) {
        ctx.moveTo(line.from.x, line.from.y);
      }else{
        ctx.moveTo(line.to.x-1, line.to.y);
      }
      
      ctx.lineTo(line.to.x, line.to.y);
      ctx.closePath();
      ctx.stroke();
    }
    
    // Disable text selection on the canvas
    canvas.mousedown(function () {
      return false;
    });
    
    canvas.mousedown(function(e) {
      if(status == 'DRAWER') {
        painting = true;
        var newpoint = { x: e.pageX - this.offsetLeft, y: e.pageY - this.offsetTop},
          line = { from: null, to: newpoint, color: ctx.strokeStyle };
        
        draw(line);
        lastpoint = newpoint;
        socket.emit('draw', line);
      }
    });
    
    canvas.mousemove(function(e) {
      if(status == 'DRAWER' && painting) {
        var newpoint = { x: e.pageX - this.offsetLeft, y: e.pageY - this.offsetTop},
          line = { from: lastpoint, to: newpoint, color: ctx.strokeStyle };
        
        draw(line);
        lastpoint = newpoint;
        socket.emit('on-draw', line);
      }
    });
    
    canvas.mouseout(function(e) {
      painting = false;
    });
    
    canvas.mouseup(function(e) {
      painting = false;
  });
    //end taken from github


  $('#eraser').click(function(){
    if($(this).hasClass('selected')){ //come back to pen
      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 5;
      $(this).removeClass('selected');
    } else {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 30;
      $(this).addClass('selected');
    }
  });



  //socket

  var socket = io();
  var user;


  //pseudo
  $('#send-pseudo').submit(function(){
    socket.emit('new-player', $('#pseudo-input').val());
    $('#pseudo-input').val('');
    return false;
  });

  // socket.on('join-room', function(){
  // });

  //receive only by the new user after sending pseud
  socket.on('game-joined', function(auser){
    // hide and show right div
    $('#pseudo-screen').addClass('hidden');
    $('#game-screen').removeClass('hidden');
    user = auser;
  });

  socket.on('new-drawer', function(drawerUser){
    if(user.id == drawerUser.id){ //we are the drawer
      user = drawerUser;
      $('#main-content').addClass('drawer');
      $('#game-screen input, #game-screen button').prop('disabled', true);
    } else {
      user.status = 'PLAYER';
      $('#main-content').removeClass('drawer');
      $('#game-screen input, #game-screen button').prop('disabled', false);
    }
  });

  socket.on('start-round', function(word){
    if(user.status == 'DRAWER'){
        $('.drawer-div .state').text("Dessinez le mot \""+word+"\" !");
    } else {
        $('.drawer-div .state').text("Trouvez ce qui est dessiné !");
    }
  });


  //messages
  $('#send-message').submit(function(e){
    e.preventDefault();
    var value = $('#message-input').val();
    if(value.trim().length>0){
      socket.emit('message', value);
      $('#message-input').val('');
    }
  });

  socket.on('message', function(msg, user){
    $('#message-list').append('<li><span class="username" style="color:' + user.color + '">' + user.name + ':</span> ' + msg +'</li>');
  });

  socket.on('special-message', function(msg){
    $('#message-list').append('<li class="special" style="background-color:'+msg.color+'">'+msg.content+'</li>');
  });


  socket.on('userConnected', function(myNick){
    $('#message-list').append('<li>' + myNick + ' s\'est connecté ! </li>');
  });


  socket.on('draw', function(canvasToDraw) {
    //taken from github
    if(canvasToDraw) {
      canvas.width(canvas.width());
      
      for(var i=0; i < canvasToDraw.length; i++)
      {   
        var line = canvasToDraw[i];
        ctx.strokeStyle = line.color;
        ctx.beginPath();
        if(line.from){
          ctx.moveTo(line.from.x, line.from.y);
        }else{
          ctx.moveTo(line.to.x-1, line.to.y);
        }
        ctx.lineTo(line.to.x, line.to.y);
        ctx.closePath();
        ctx.stroke();
      }
    }
});
  
});