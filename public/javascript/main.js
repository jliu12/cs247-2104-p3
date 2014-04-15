// Initial code by Borui Wang, updated by Graham Roth
// For CS247, Spring 2014

(function() {

  var cur_video_blobs = [];
  var copy_video_blobs = [];
  var send_video_blobs = [];
  var fb_instance;
  var vid_counter = 0;
  var num_vids_entered = 0;
  var max_videos = 8;
  var numbers = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

  $(document).ready(function(){
    connect_to_chat_firebase();
    connect_webcam();
    $("#filmstrip_button").click(function() {
      if ($(this).hasClass("down")) {
        //$("#filmstrip").slideToggle();
        hide_filmstrip();
      } else {
        //$("#filmstrip").slideToggle();
        show_filmstrip();
      }
      $(this).toggleClass("down");
    });
    $("#submission").droppable({
      drop: function(event, ui) {
        //$(ui.draggable).draggable("option", "revert", false);
        var id = $(ui.draggable).attr("id").split("_")[1];
        //$(ui.draggable).remove();
        send_video_blobs.push(copy_video_blobs[id]);
        var value = $("#type_box").val();
        value += " " + numbers[id] + " ";
        $("#type_box").val(value);
      }
    });
    $("#filmstrip").slideUp(0);
    $("#type_box").keyup(function (e) {
      if (e.which == 8) {
        var count = count_entered_videos();
        while (count < send_video_blobs.length) {
          send_video_blobs.pop();
          console.log("DELETED!");
        }
 
      }
    });  
  });

  function init_curtains(curtain_wrapper, last_msg, video) {
    var curtain_left = document.createElement("img");
    curtain_left.src = '../images/frontcurtain.jpg';
    curtain_left.className = "curtain curtainLeft";
    var curtain_right = document.createElement("img");
    curtain_right.src = '../images/frontcurtain.jpg';
    curtain_right.className = "curtain curtainRight";

    curtain_wrapper.appendChild(curtain_left);
    curtain_wrapper.appendChild(curtain_right);

    var content = document.createElement("div");
    content.className = "content";
    curtain_wrapper.appendChild(content);

    video.className = "thumbs";

    content.appendChild(video);


    $(curtain_wrapper).click(function(){
      console.log("CLICK!");
      if (!$(this).hasClass("open")) {
        $(this).toggleClass("open");
        console.log("OPENING");
        $(this).children('.description').animate({'left': -1*$(this).width()});
        $(this).children('img.curtain').animate({ width: 8 },{duration: 800});
        $(this).children('.content').fadeIn(800);
      } else {
        console.log("CLOSING");
        $(this).children('img.curtain').animate({ width: 57 },{duration: 800});
        $(this).children('.content').fadeIn(800);
        $(this).toggleClass("open");
      }
    });
  }

  function count_entered_videos() {
    var count = 0;
    var message = $("#type_box").val();
    for (var i = 0; i < message.length; i++) {
        var curr_char = message[i];
        if (numbers.indexOf(curr_char) != -1) {
          count++;
        }
    }
    console.log("COUNT:"+count);
    return count;
  }


  function connect_to_chat_firebase(){
    /* Include your Firebase link here!*/
    fb_instance = new Firebase("https://gsroth-p3-v1.firebaseio.com");

    // generate new chatroom id or use existing id
    var url_segments = document.location.href.split("/#");
    if(url_segments[1]){
      fb_chat_room_id = url_segments[1];
    }else{
      fb_chat_room_id = Math.random().toString(36).substring(7);
    }
    display_msg({m:"Share this url with your friend to join this chat: "+ document.location.origin+"/#"+fb_chat_room_id,c:"red"})

    // set up variables to access firebase data structure
    var fb_new_chat_room = fb_instance.child('chatrooms').child(fb_chat_room_id);
    var fb_instance_users = fb_new_chat_room.child('users');
    var fb_instance_stream = fb_new_chat_room.child('stream');
    var my_color = "#"+((1<<24)*Math.random()|0).toString(16);

    // listen to events
    fb_instance_users.on("child_added",function(snapshot){
      display_msg({m:snapshot.val().name+" joined the room",c: snapshot.val().c});
    });
    fb_instance_stream.on("child_added",function(snapshot){
      display_msg(snapshot.val());
    });

    // block until username is answered
    var username = window.prompt("Welcome, warrior! please declare your name?");
    if(!username){
      username = "anonymous"+Math.floor(Math.random()*1111);
    }
    fb_instance_users.push({ name: username,c: my_color});
    $("#waiting").remove();

    // bind submission box
    $("#submission input").keydown(function( event ) {
      if (event.which == 13) {
        if(has_emotions($(this).val())){
          console.log("HAS EMOTION");
          fb_instance_stream.push({m:username+": " +$(this).val(), v:send_video_blobs, c: my_color});
        }else{
          fb_instance_stream.push({m:username+": " +$(this).val(), c: my_color});
        }
        $(this).val("");
        scroll_to_bottom(0);
        send_video_blobs = [];
        $("#filmstrip_button").removeClass("down");
        hide_filmstrip();
      }
    });

    // scroll to bottom in case there is already content
    scroll_to_bottom(1300);
  }

  // creates a message node and appends it to the conversation
  function display_msg(data){
    $("#conversation").append("<div class='msg' style='color:"+data.c+"'></div>");
    var msgs = $(".msg");
    var last_msg = msgs[msgs.length-1];
    console.log(data.v);
    if(data.v){
      //var tokens = data.m.split(video_char);
      // for video element
      var message = data.m;
      var vid_index = 0;
      var msg_to_send = "";

      for (var i = 0; i < message.length; i++) {
        var curr_char = message[i];
        console.log(curr_char);
        if (numbers.indexOf(curr_char) != -1) {
          console.log("TRUE!");
          $(last_msg).append("<span>" + msg_to_send + "</span>");
          msg_to_send = "";

          display_video(data.v[vid_index], last_msg);
          vid_index++;
        } else {
          msg_to_send += curr_char;
        }
      }
      $(last_msg).append("<span>" + msg_to_send + "</span>");
    } else {
      $(last_msg).append(data.m);
    }
    var convo_div = document.getElementById("conversation");
    convo_div.scrollTop = convo_div.scrollHeight;
  }

  function display_video(base64_data, last_msg) {
    var video = document.createElement("video");

    vid_counter++;
    video.setAttribute("id", vid_counter);

    video.autoplay = true;
    video.controls = false;
    video.loop = true;
    video.width = 100;
    video.className = "display_vid";

    var source = document.createElement("source");
    source.src =  URL.createObjectURL(base64_to_blob(base64_data));
    source.type =  "video/webm";

    video.appendChild(source);

    var curtain_wrapper = document.createElement("div");
    curtain_wrapper.className = "curtain_wrapper";

    last_msg.appendChild(curtain_wrapper);

    init_curtains(curtain_wrapper,last_msg, video);

  }

  function scroll_to_bottom(wait_time){
    // scroll to bottom of div
    setTimeout(function(){
      $("html, body").animate({ scrollTop: $(document).height() }, 200);
    },wait_time);
  }

  function connect_webcam(){
    // we're only recording video, not audio
    var mediaConstraints = {
      video: true,
      audio: false
    };

    // callback for when we get video stream from user.
    var onMediaSuccess = function(stream) {
      // create video element, attach webcam stream to video element
      var video_width= 160;
      var video_height= 120;
      var webcam_stream = document.getElementById('webcam_stream');
      var video = document.createElement('video');
      webcam_stream.innerHTML = "";
      // adds these properties to the video
      video = mergeProps(video, {
          controls: false,
          width: video_width,
          height: video_height,
          src: URL.createObjectURL(stream)
      });
      video.play();
      webcam_stream.appendChild(video);

      // counter
      var time = 0;
      var second_counter = document.getElementById('second_counter');
      var second_counter_update = setInterval(function(){
        second_counter.innerHTML = time++;
      },1000);

      // now record stream in 5 seconds interval
      var video_container = document.getElementById('video_container');
      var mediaRecorder = new MediaStreamRecorder(stream);
      var index = 1;

      mediaRecorder.mimeType = 'video/webm';
      // mediaRecorder.mimeType = 'image/gif';
      // make recorded media smaller to save some traffic (80 * 60 pixels, 3*24 frames)
      mediaRecorder.video_width = video_width/2;
      mediaRecorder.video_height = video_height/2;

      mediaRecorder.ondataavailable = function (blob) {
          //console.log("new data available!");
          video_container.innerHTML = "";

          // convert data into base 64 blocks
          blob_to_base64(blob,function(b64_data){
            cur_video_blobs.push(b64_data);
            if (cur_video_blobs.length > max_videos) {
              cur_video_blobs.shift();
            }
          });
      };
      setInterval( function() {
        mediaRecorder.stop();
        mediaRecorder.start(1500);
      }, 1500 );
      console.log("connect to media stream!");
    }

    // callback if there is an error when we try and get the video stream
    var onMediaError = function(e) {
      console.error('media error', e);
    }

    // get video stream from user. see https://github.com/streamproc/MediaStreamRecorder
    navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);
  }

  function hide_filmstrip() {
    //for (var i = 0; i < 8; i++) {
    //  $("#vid_"+i).hide();
    //}
    $("#vid_numbers").html("");
    $("#film").html("");
    $("#filmstrip").slideUp();
    $("#submission").removeClass("up");
    $("#filmstrip_button").removeClass("up");
    $("#type_box").removeClass("up");
  }

  function show_filmstrip() {
    $("#filmstrip").slideDown();
    $("#submission").addClass("up");
    $("#filmstrip_button").addClass("up");
    $("#type_box").addClass("up");
    copy_video_blobs = cur_video_blobs.slice();
    for (var i = 0; i < copy_video_blobs.length; i ++) {
      append_video(copy_video_blobs[i], i);
    }
  }

  function append_video(b64_data, index) {
      var video = document.createElement("video");
      
      video.autoplay = false;
      video.controls = false; // optional
      video.loop = true;
      video.width = 140;
      video.height = 85;
      video.className = "filmstrip_vid";
      video.setAttribute("id", "vid_" + index);

      var source = document.createElement("source");
      source.src =  URL.createObjectURL(base64_to_blob(b64_data));
      source.type =  "video/webm";

      video.appendChild(source);

      $(video).mouseover(function() {
        video.play();
      });

      $(video).mouseout(function() {
        video.pause();
      });

      $(video).draggable({ 
        revert: true/*,
        start: function() {
          $(this).width(60);
          $(this).height(45);
        }, 
        stop: function() {
          $(this).width(120);
          $(this).height(90);
        }*/
      });

      //$("#vid_"+index).show();

      var temp = index+1;

      $("#vid_numbers").append("<div class='vid_number'>"+temp+"</div>");

      // for gif instead, use this code below and change mediaRecorder.mimeType in onMediaSuccess below
      // var video = document.createElement("img");
      // video.src = URL.createObjectURL(base64_to_blob(data.v));

      var film_strip = document.getElementById('film');
      film_strip.appendChild(video);
  }

  // check to see if a message qualifies to be replaced with video.
  var has_emotions = function(msg){
    for(var i=0;i<numbers.length;i++){
      if(msg.indexOf(numbers[i])!= -1){
        return true;
      }
    }
    return false;
  }


  // some handy methods for converting blob to base 64 and vice versa
  // for performance bench mark, please refer to http://jsperf.com/blob-base64-conversion/5
  // note useing String.fromCharCode.apply can cause callstack error
  var blob_to_base64 = function(blob, callback) {
    var reader = new FileReader();
    reader.onload = function() {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      callback(base64);
    };
    reader.readAsDataURL(blob);
  };

  var base64_to_blob = function(base64) {
    var binary = atob(base64);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i);
    }
    var blob = new Blob([view]);
    return blob;
  };

})();
