//
// CameraTag
//

CameraTag = new function() {
  var self = this;
  self.version = "2.1";

  var appServer;
  if ("CAMERATAG_APPSERVER" in window) {
    appServer = CAMERATAG_APPSERVER;
  }
  else {
    appServer ="cameratag.com";
  }
  
  self.cameras = {};
  self.players = {};
  self.uploaders = {};
  var callbacks = {};
  var settingUp = false;

  var $;
  var ct_jQuery = null;
  var jQueryPreInstalled = window.jQuery && jQuery.fn && /^[1-9]/.test(jQuery.fn.jquery) || false;
  var jQueryInjected = false;
  
  var ct_swfobject;
  var swfObjectInjected = false;

  var ct_plupload;
  var plUploadInjected = false;

  var recorderInjected = false;
  var playerInjected = false;
  var uploaderInjected = false;

  var ct_videojs;
  var videojsInjected = false;

  self.setup = function() {
    
    
    // make sure prototype is available
    if (!jQueryReady()) {
      setTimeout(self.setup, 30);
      return;
    };

    // prevent double setup
    if (settingUp) {
      raise("called setup while camera already setting up");
      return;
    }
    settingUp = true;

    // create instances for each camera tag in the page
    instantiateCameras();

    // create instances for each video tag in the page
    instantiatePlayers();

    // create instances for each uploader tag in the page
    instantiateUploaders();
    settingUp = false;
  }

  var jQueryReady = function() {
    // jQuery is already instaled by end user
    if ( jQueryPreInstalled ) {
      ct_jQuery = jQuery;
      $ = ct_jQuery;
      return true;
    }
    // Our CameraTag.version is installed
    else if (ct_jQuery) {
      return true;
    } 
    // Our injected CameraTag.version of jQuery is ready- now let's scope it
    else if (window.jQuery && jQuery.fn && /^[1-9]/.test(jQuery.fn.jquery) ) {
      ct_jQuery = jQuery.noConflict(true);
      $ = ct_jQuery;
      return true;
    }
    // Cant find a jQuery because it didnt already exist and we haven't injected it yet
    else if (!ct_jQuery && !jQueryInjected) {
      var jquery_script = document.createElement('script');
      jquery_script.src = '//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js';
      document.body.insertBefore( jquery_script, document.body.firstChild );
      jQueryInjected = true;
      return false;
    }
    else {
      return false;  
    }
  }

  var swfObjectReady = function() {
    // swfobject is ready
    if ( typeof(swfobject) == "object" ) {
      ct_swfobject = swfobject;
      return true;
    } 
    // embed the script if we havent already
    else if (!swfObjectInjected) {
      var swfobject_script = document.createElement('script');
      swfobject_script.src = '//ajax.googleapis.com/ajax/libs/swfobject/2.2/swfobject.js';
      document.body.insertBefore( swfobject_script, document.body.firstChild );
      swfObjectInjected = true;
    }
    else {
      return false;  
    }
  };

  var plUploadReady = function() {
    // swfobject is ready
    if ( typeof(plupload) == "object" ) {
      ct_plupload = plupload;
      return true;
    } 
    // embed the script if we havent already
    else if (!plUploadInjected) {
      var plupload_script = document.createElement('script');
      plupload_script.src = '//'+appServer+'/'+self.version+'/plupload/plupload.full.min.js';
      document.body.insertBefore( plupload_script, document.body.firstChild );
      plUploadInjected = true;
      return false;
    }
    else {
      return false;  
    }
  };

  var videojsReady = function() {
    // videojs is ready
    if ( typeof(videojs) == "function" ) {
      ct_videojs = videojs;
      return true;
    }
    // embed the script if we havent already
    else if (!videojsInjected) {
      var videojs_script = document.createElement('script');
      videojs_script.src = "//"+appServer+"/"+self.version+"/video.js";

      var videojs_css = document.createElement('link');
      videojs_css.href = "//"+appServer+"/"+self.version+"/video-js.css";
      videojs_css.rel = "stylesheet";
      videojs_css.type = "text/css";

      document.body.insertBefore( videojs_script, document.body.firstChild );
      document.body.insertBefore( videojs_css, document.body.firstChild );
      videojsInjected = true;

      return false
    }
    else {
      return false;  
    }
  };

  var new_video = function(camera_uuid, callback) {
    $.ajax({
      url: "//"+appServer+"/videos.json",
      type:"get",
      dataType: "jsonp",
      data: {
        referer: window.location.toString(),
        camera_id: camera_uuid
      },
      success: function(response) {
        if (response.camera != undefined) {
          // setup video formats
          response.video.formats = {};
          if (response.camera.formats) {
            $(response.camera.formats).each(function(index, format){
              response.video.formats[format.name] = {};
            })
          }

          // build response
          callback({
            success: true,
            camera: response.camera,
            video: response.video,
            plan: response.plan,
            videoServer: response.videoServer,
            ul_policy: response.amazon_ul_policy,
            ul_signature: response.amazon_ul_signature
          });
        }
        else {
          callback({ success: false, message: response.error });
        }
      },

      error: function(jqXHR, textStatus, errorThrown) {
        sendStat("authorization_error", {code: jqXHR.status});  
        callback({ success: false, message: "error initializing recorder" });
      }
    });
  }

  var instantiateCameras = function() {
    $("camera").each(function(index, camera_el) {
      new Recorder(camera_el);
    });
  };

  var instantiatePlayers = function() {
    $("video").each(function(index, video_el){
      if ($(video_el).attr("data-uuid") || $(video_el).attr("data-video-id")) {
        new Player(video_el);
      }
    });
  };

  var instantiateUploaders = function() {
    $("uploader").each(function(index, uploader_el){
      new Uploader( $(uploader_el) );
    });
  };

  // EVENT OBSERVATION
  self.observe = function(camera_dom_id,event_name,callback,priority) {
    priority = priority || false;
    if ( !callbacks[camera_dom_id] )
      callbacks[camera_dom_id] = {};
    if ( !callbacks[camera_dom_id][event_name] )
      callbacks[camera_dom_id][event_name] = [];

    if (priority) {
      callbacks[camera_dom_id][event_name].splice(0,0,callback);
    }
    else {
      callbacks[camera_dom_id][event_name].push(callback);  
    }
  };

  self.fire = function(camera_dom_id,event_name,data) {
    if ( !callbacks[camera_dom_id] )
      callbacks[camera_dom_id] = {};
    if ( !callbacks[camera_dom_id][event_name] )
      callbacks[camera_dom_id][event_name] = [];
    
    setTimeout(function(){
      fire_handlers(camera_dom_id,event_name,data);
    }, 1);
  };

  var fire_handlers = function(camera_dom_id,event_name,data) {
    for( i = 0; i < callbacks[camera_dom_id][event_name].length; i++ ) {
      try {
        callbacks[camera_dom_id][event_name][i](data);
      }
      catch(err) {}
    }
  }

  self.stopObserving = function(camera_dom_id,event_name,callback) {
    if ( !callbacks[camera_dom_id] )
      callbacks[camera_dom_id] = {};
    if ( !callbacks[camera_dom_id][event_name] )
      callbacks[camera_dom_id][event_name] = [];
    
    var newCallbacks = [];
    for( i = 0; i < callbacks[camera_dom_id][event_name].length; i++ ) {
      if( callbacks[camera_dom_id][event_name][i] != callback )
        newCallbacks.push(callback)
    }
    
    callbacks[camera_dom_id][event_name] = newCallbacks;
  };

  var publish_on_server = function(video_uuid, type, videoServer) {
    $.ajax({
      url: "//"+appServer+"/videos/"+video_uuid+"/publish.json",
      data:{publish_type: type, server: videoServer},
      type:"get",
      dataType: "jsonp",
      success: function(response) {
        if (response["uuid"]) {
          self.fire(video_uuid, "published", response);
        }
        else {
          self.fire(video_uuid, "publishFailed", {success: false, video_uuid: video_uuid, message: response});
        }
      },
      error: function() {
        self.fire(video_uuid, "publishFailed", {success: false, video_uuid: video_uuid, message: "unkown error"});
      }
    })
  };

  self.prototype = self; // legacy support





















  Recorder = function(camera_el) {
    // main data objects
    var self = this;
    var camera_uuid = $(camera_el).attr("data-uuid") || $(camera_el).attr("data-app-id") || $(camera_el).attr("id");
    var camera = {};
    var video = {};
    var plan = {};
    var dom_id = $(camera_el).attr("id") || $(camera_el).attr("data-uuid");
    var txt_message;
    var input_name;
    var css_url;
    var record_timer;
    var record_timer_count = 0;
    var record_timer_prompt = 0;
    var ul_policy;
    var ul_signature;
    var cachebuster = parseInt( Math.random() * 100000000 );
    var existing_uuid = $(camera_el).attr("data-video-uuid");
    var processed_timer;
    var published_timer;

    // mobile vars
    var mobile_browser;
    var mobile_upload_supported;
    var mobile_enabled;

    // overwritable params
    var sources;
    var fps;
    var className;
    var videoServer; // gets set by server in auth callback
    var height;
    var width;
    var hResolution;
    var vResolution;
    var maxLength;
    var skipPreview;
    var videoBitRate;
    var skipAutoDetect;
    var preRollLength;
    var recordOnConnect;
    var publishOnUpload;
    var uploadOnSelect;
    var flipRecordPreview;
    var poll_processed;
    var font_size;

    // DOM references
    var container;
    var swf;
    var start_screen;
    var playback_screen;
    var recording_screen;
    var camera_detection_screen;
    var countdown_screen;
    var countdown_status;
    var upload_screen;
    var upload_status;
    var accept_screen;
    var wait_screen;
    var wait_message;
    var completed_screen;
    var error_screen;
    var error_message;
    var sms_screen;
    var sms_input;
    var thumb_bg;
    var check_phone_screen;
    var alternative_prompt;

    // Control functions
    self.connect = function(){};
    self.play = function(){};
    self.record = function(){};
    self.stopRecording = function(){};
    self.stopPlayback = function(){};
    self.showFlashSettings = function(){};
    
    // state management 
    var state;
    var connected = false;
    var readyToRecord = false;
    var countdown_counter = 0;
    var uploading = false;
    var error_messages = [];
    var readyToPublish = false;
    var initialized = false;

    // keep a reference to this instance in the Class prototype
    CameraTag.cameras[dom_id] = self;

    var setup = function() {
      // make sure swfobject is available

      if (!swfObjectReady()) {
        setTimeout(setup, 30);
        return;
      };

      if (!plUploadReady()) {
        setTimeout(setup, 30);
        return;
      };

      // start with a clean slate
      clearTimeout(processed_timer);
      clearTimeout(published_timer);
      clearInterval(record_timer);
      countdown_counter = 0;
      record_timer_count = 0;
      uploading = false;
      error_messages = [];
      readyToPublish = false;
      
      

      // get permission for a new video
      new_video(camera_uuid, function(server_response){
        if (server_response.success) {
          camera = server_response.camera;
          video = server_response.video;
          if (existing_uuid) {
            video.uuid = existing_uuid  
          }
          plan = server_response.plan;
          videoServer = server_response.videoServer;
          ul_policy = server_response.ul_policy;
          ul_signature = server_response.ul_signature;

          // observe new video for its published state
          CameraTag.observe(video.uuid, "published", function(published_video) {
            if (video.uuid == published_video.uuid) {
              state = "published";
              populate_hidden_inputs();
              self.loadInterface(completed_screen);
              if (connected) {
                self.disconnect();
              }
              sendStat("publish_success");
              CameraTag.fire(dom_id, "published", video);  
              if (poll_processed) {
                pollForProcessed();
              }
            }
          }, true);

          // failed publish
          CameraTag.observe(video.uuid, "publishFailed", function(error) {
            if (video.uuid == error.video_uuid) {
              throw_error("Publish Failed:" + error.message.message);
            }
          }, true);
        }
        else {
          error_messages.push(server_response.message);
          sendStat("authorization_error", {message: server_response.message, code: 200});
        }

        // initialize the interface
        if (!initialized) {
          init();
        }

        // (re)set variables
        if (!mobile_enabled && initialized) {
          swf.setUUID(video.uuid);
          swf.showNothing();
        }

        if (error_messages.length > 0) {
          throw_error(error_messages[0]);
          return;
        }

        self.loadInterface(start_screen, true);
      });
    };

    var init = function() {
      // setup prarms with preference to passed in as data attributes on the camera tag
      input_name = $(camera_el).attr("name") || dom_id;
      inline_styles = $(camera_el).attr("style");
      className = $(camera_el).attr("class") || camera.className || "";
      fps = camera.formats && camera.formats[0].fps || 24;
      if (camera.formats) {
        width = camera.formats[0].height < 360 ? camera.formats[0].width : camera.formats[0].width / 2;
        height = camera.formats[0].height < 360 ? camera.formats[0].height : camera.formats[0].height / 2;
        hResolution = camera.formats[0].width;
        vResolution = camera.formats[0].height;
      }
      else {
        // this is used to define an area to display an error
        width = 300;
        height = 200;
        hResolution = 300;
        vResolution = 200;
      }

      sources = $(camera_el).attr("data-sources") || "record,upload,sms";
      sources = sources.replace(" ", "").split(",");
      maxLength = $(camera_el).attr("data-maxlength") || $(camera_el).attr("data-max-length") || camera.maxLength || 30;
      css_url = $(camera_el).attr("data-cssurl") || camera.cssURL || "//"+appServer+"/"+CameraTag.version+"/cameratag.css";
      videoBitRate = $(camera_el).attr("data-videobitrate");
      if (camera.formats) {
        videoBitRate = videoBitRate || camera.formats[0].videoBitRate;
      }
      mobile_browser = isMobile();
      mobile_upload_supported = mobileUploadSupported();
      mobile_enabled = mobile_browser && mobile_upload_supported && camera.allowMobileUploads;
      txt_message = $(camera_el).attr("data-txt-message") || camera.txtMessage || "To record this video using your mobile phone please visit <<url>> in your mobile browser";
      skipPreview = $(camera_el).attr("data-autopreview") == "false" || $(camera_el).attr("data-preview-on-recording") == "false" || camera.autoPreview == false || false;
      publishOnUpload = $(camera_el).attr("data-publish-on-upload") != "false";
      uploadOnSelect = $(camera_el).attr("data-upload-on-select") != "false";
      recordOnConnect = $(camera_el).attr("data-record-on-connect") != "false";
      skipAutoDetect = $(camera_el).attr("data-skip-auto-detect") == "true" || $(camera_el).attr("data-detect-camera") == "false";
      flipRecordPreview = $(camera_el).attr("data-mirror-recording") != "false";
      poll_processed = $(camera_el).attr("data-poll-for-processed") == "true" || camera.poll_for_processed;

      if ($(camera_el).attr("data-pre-roll-length")) {
        preRollLength = parseInt($(camera_el).attr("data-pre-roll-length"))
      }
      else {
        preRollLength = 5;
      }
      

      // build the control elements  
      buildInterface();
      setupEventObservers();  

      // check for non-compatible mobile device
      if (mobile_browser && !mobile_enabled) {
        error_messages.push("Your mobile device does not support video uploading");
        sendStat("unsupported_device_error");
      }

      // show error messages if there are any
      if (error_messages.length > 0) {
        throw_error(error_messages.join("\n"));
        return;
      }

      // initialize if we're mobile (otherwise the swf will do it)
      if (mobile_browser) {
        CameraTag.fire(dom_id, "initialized");  
      }
    };

    var embedSWF = function() {
      var flashvars = {
          videoServer: videoServer,
          videoUUID: video.uuid,
          cameraUUID: camera.uuid,
          domID: dom_id,
          maxLength: maxLength,
          hResolution: hResolution,
          vResolution: vResolution,
          fps: fps,
          videoBitRate: videoBitRate,
          skipAutoDetect: skipAutoDetect,
          flipRecordPreview: flipRecordPreview
      };

      var params = {
          allowfullscreen: 'true',
          allowscriptaccess: 'always',
          wmode: "transparent"
      };

      var attributes = {
          id: dom_id+"_swf",
          name: dom_id+"_swf"
      };

      swfobject.embedSWF("//"+appServer+"/"+CameraTag.version+"/camera.swf?"+cachebuster, dom_id+"_swf_placeholder", "100%", "100%", '11.1.0', 'https://'+appServer+'/'+CameraTag.version+'/expressInstall.swf', flashvars, params, attributes, checkSWF);

      if (swfobject.getFlashPlayerVersion().major < 11) {
        error_messages.push("Please make sure you have Flash Player 11 or higher installed");
      }
    };

    var checkSWF = function(e){
      swf = $("#"+dom_id+"_swf")[0];
      if (swf == undefined && e.success == true) {
        var flash_ver = swfobject.getFlashPlayerVersion().major + "." + swfobject.getFlashPlayerVersion().minor;
        sendStat("no_flash_error", {flash_version: flash_ver, source: "post embed check"});
        error_messages.push("Please make sure you have Flash Player 11 or higher installed");
      }
    }

    self.getState = function() {
      return state;
    };

    self.embed_callback = function(e) {
      swf = $("#"+dom_id+"_swf")[0];

      if (swf == undefined) {
        sendStat("no_flash_error", {flash_version: flash_ver, source: "swfobject callback"});
        error_messages.push("Unable to embed video recorder. Please make sure you have Flash Player 11 or higher installed");
      }
    }

    var buildInterface = function() {
      // inject our css 
      if (document.createStyleSheet) { // for IE
        document.createStyleSheet(css_url);
        document.createStyleSheet("//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css");
      }
      else {  // for non IE
        var css_link = $('<link href="'+css_url+'" media="all" rel="stylesheet" type="text/css" />');
        $("head").append(css_link);
        var font_awesome = $('<link href="//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css" media="all" rel="stylesheet" type="text/css" />');
        $("head").append(font_awesome);
      }

      // container and swf
      container = $('<div id="'+dom_id+'" class="camera_tag"></div>');
      container.css({width: width+"px", height: height+"px"})
      container.attr("style", inline_styles);
      container.addClass(className);
      $(camera_el).replaceWith(container);
      if (!mobile_browser) {
        // create swf placeholder in container then embed the camera swf
        container.append("<div id='"+dom_id+"_swf_placeholder'></div>")
        embedSWF();  
        // communication to and from swf
        setupExternalInterface();
      }

      // font-size
      font_size = parseInt($(container).height() / 14);
      if (font_size < 12) {
        font_size = 12;
      }

      // start screen
      start_screen = $("#"+dom_id+"-start-screen").addClass("cameratag_screen");
      if (start_screen.length == 0) {
        start_screen = $('<div id="'+dom_id+'_start_screen" style="font-size:'+font_size+'px" class="cameratag_screen cameratag_start"></div>');
        
        var selection_prompt = $('<a class="cameratag_select_prompt">choose how to submit your video</a>');
        start_screen.append(selection_prompt);

        if (sources.indexOf("record") != -1 && !mobile_enabled) {
          var record_btn = $('<a class="cameratag_primary_link cameratag_record_link cameratag_record"><span class="cameratag_action_icon">&#61501;</span><br><span class="cameratag_prompt_label">webcam</span></a>');
          start_screen.append(record_btn);
        }
        
        if (sources.indexOf("upload") != -1 && !mobile_enabled) {
          var upload_btn = $('<a id="'+dom_id+'_upload_link" class="cameratag_primary_link cameratag_upload_link cameratag_upload"><span class="cameratag_action_icon">&#61678;</span><br><span class="cameratag_prompt_label">file</span></a>');
          start_screen.append(upload_btn);
        } 

        if (sources.indexOf("sms") != -1 || mobile_enabled) {
          var sms_btn = $('<a class="cameratag_primary_link cameratag_sms_link"><span class="cameratag_action_icon">&#61707;</span><br><span class="cameratag_prompt_label">phone</span></a>');
          start_screen.append(sms_btn);
        }

        if (!mobile_enabled) {
          var settings_btn = $('<img class="cameratag_settings_btn" src="//cameratag.com/assets/gear.png">');
          start_screen.append(settings_btn);  
        }
      }
      // add to DOM
      container.append(start_screen);
      var upload_link = start_screen.find(".cameratag_upload");
      self.uploader = create_pluploader(upload_link.attr("id"));

      // check position
      $(start_screen).css("position", "absolute");


      // error screen
      error_screen = $("#"+dom_id+"-error-screen").addClass("cameratag_screen");
      if (error_screen.length == 0) {
        error_screen = $('<div class="cameratag_screen cameratag_error"></div>');
        error_message = $('<div class="cameratag_error_message"></div>');
        error_screen.append(error_message);
        var settings_btn = $('<img class="cameratag_settings_btn" src="//cameratag.com/assets/gear.png">');
        error_screen.append(settings_btn);
      }
      // add to DOM
      container.append(error_screen);



      // alternative recording prompt
      // alternative_prompt = $("#"+dom_id+"-alternative-prompt");
      // if (alternative_prompt.length == 0) {
      //   alternative_prompt = $('<div class="cameratag_alternatives"></div>'); 

      //   // dont display alternative if user is on mobile browser
      //   if (!mobile_browser) {
        
      //     if ( (camera.allowMobileUploads && plan.sms) || camera.allowUploads) {
      //       alternative_prompt.append("you may also ");
      //     }

      //     // sms link
      //     if (camera.allowMobileUploads && plan.sms) {
      //       var sms_link = $('<a href="javascript:" class="cameratag_sms_link">record by phone</a>');  
      //       alternative_prompt.append(sms_link);  
      //     }
          
      //     if (camera.allowMobileUploads && camera.allowUploads && plan.sms) {
      //       alternative_prompt.append(" or ");  
      //     }

      //     // upload link
      //     if (camera.allowUploads && !mobile_browser) {
      //       var upload_link_id = dom_id+"_upload_link";
      //       var upload_link = $('<a href="javascript:" id="'+upload_link_id+'" class="cameratag_upload_link">upload a file</a>');  
      //       alternative_prompt.append(upload_link);
      //     }
      //   }
      // }
      // // add to DOM
      // container.append(alternative_prompt);
      


      // camera detection
      camera_detection_screen = $("#"+dom_id+"-camera-detection-screen").addClass("cameratag_screen");
      if (camera_detection_screen.length == 0) {
        // legacy support for old typo
        camera_detection_screen = $("#"+dom_id+"camera-detection-screen").addClass("cameratag_screen");
      }
      if (camera_detection_screen.length == 0) {
        camera_detection_screen = $('<div class="cameratag_screen cameratag_detect"></div>');
        var camera_detection_prompt = $('<div class="cameratag_prompt">wave to the camera</div>');
        camera_detection_screen.append(camera_detection_prompt);
      }
      // add to DOM
      container.append(camera_detection_screen);


      // countdown
      countdown_screen = $("#"+dom_id+"-countdown-screen").addClass("cameratag_screen");
      countdown_status = countdown_screen.find(".cameratag_countdown_status");
      if (countdown_screen.length == 0) {
        countdown_screen = $('<div class="cameratag_screen cameratag_count"></div>');
        var countdown_prompt = $('<div class="cameratag_prompt">recording in </div>');
        countdown_status = $('<div class="cameratag_countdown_status"></div>');
        countdown_screen.append(countdown_status);
        countdown_screen.append(countdown_prompt);
      }
      // add to DOM
      container.append(countdown_screen);



      // upload
      upload_screen = $("#"+dom_id+"-upload-screen").addClass("cameratag_screen");
      upload_status = upload_screen.find(".cameratag_upload_status");
      if (upload_screen.length == 0) {
        upload_screen = $('<div class="cameratag_screen cameratag_upload"></div>');
        var upload_prompt = $('<div class="cameratag_prompt">uploading...</div>');
        upload_status = $('<div class="cameratag_upload_status"></div>');
        upload_screen.append(upload_status);
        upload_screen.append(upload_prompt);
      }
      // add to DOM
      container.append(upload_screen);


      // record controls
      recording_screen = $("#"+dom_id+"-recording-screen").addClass("cameratag_screen");
      record_timer_prompt = recording_screen.find(".cameratag_record_timer_prompt");
      if (recording_screen.length == 0) {
        recording_screen = $('<div class="cameratag_screen cameratag_recording cameratag_stop_recording"></div>');
        var stop_prompt = $('<div class="cameratag_prompt">click to stop recording </div>');
        record_timer_prompt = $('<span class="cameratag_record_timer_prompt">('+maxLength+')</span>');
        var recording_indicator = $('<img src="//'+appServer+'/assets/recording.gif"/>');
        stop_prompt.append(record_timer_prompt);
        recording_screen.append(stop_prompt);
        recording_screen.append(recording_indicator);
      }
      // add to DOM
      container.append(recording_screen);
    
    
      // play controls
      playback_screen = $("#"+dom_id+"-playback-screen").addClass("cameratag_screen");
      if (playback_screen.length == 0) {
        playback_screen = $('<div class="cameratag_screen cameratag_playback cameratag_stop_playback"></div>');
        var skip_prompt = $('<div class="cameratag_prompt">click to skip review</div>');
        playback_screen.append(skip_prompt);  
      }
      // add to DOM
      container.append(playback_screen);
      

      // accept controls
      accept_screen = $("#"+dom_id+"-accept-screen").addClass("cameratag_screen");
      if (accept_screen.length == 0) {
        accept_screen = $('<div class="cameratag_screen cameratag_accept"></div>');
        var accept_btn = $('<a class="cameratag_accept_btn cameratag_publish"><span class="button_label">&#10003; Accept</span></a>');
        var rerecord_btn = $('<a class="cameratag_rerecord_btn cameratag_record"><span class="button_label">&#9851; Re-record</span></a>');
        var play_btn = $('<a class="cameratag_play_btn cameratag_play"><span class="button_label">&#8629; Review Recording</span></a>');
        accept_screen.append(accept_btn);
        accept_screen.append(rerecord_btn);
        accept_screen.append(play_btn);
      }
      // add to DOM
      container.append(accept_screen);
      

      // wait screen
      wait_screen = $("#"+dom_id+"-wait-screen").addClass("cameratag_screen");
      wait_message = wait_screen.find(".cameratag_wait_message");
      if (wait_screen.length == 0) {
        wait_screen = $('<div class="cameratag_screen cameratag_wait"></div>');
        var spinner = $('<div class="cameratag_spinner"><img src="//'+appServer+'/assets/loading.gif"/><br/><span class="cameratag_wait_message">please wait while we push pixels</span></div>');
        wait_screen.append(spinner);
        wait_message = wait_screen.find(".cameratag_wait_message");
      }
      // add to DOM
      container.append(wait_screen);


      // completed screen
      completed_screen = $("#"+dom_id+"-completed-screen").addClass("cameratag_screen");
      if (completed_screen.length == 0) {
        completed_screen = $('<div class="cameratag_screen cameratag_completed"></div>');
        thumb_bg = $('<div class="cameratag_thumb_bg"></div>');
        var check_mrk = $('<div class="cameratag_checkmark"><span class="check">&#10004;</span> published</div>');
        completed_screen.append(thumb_bg);
        completed_screen.append(check_mrk);

      }
      // add to DOM
      container.append(completed_screen);


      // sms screen
      sms_screen = $("#"+dom_id+"-sms-screen").addClass("cameratag_screen");
      sms_input = sms_screen.find(".cameratag_sms_input");
      if (sms_screen.length == 0) {
        sms_screen = $('<div class="cameratag_screen cameratag_sms"></div>');
        var sms_input_prompt = $('<div class="cameratag_sms_prompt">Enter your <b>mobile phone number</b> below and we will text you a link for mobile recording<br/></div>');
        sms_input = $('<input class="cameratag_sms_input" type="text"/>');
        var sms_submit = $('<br/><a href="javascript:" class="cameratag_send_sms">Send Mobile Link</a>&nbsp;&nbsp;<a href="javascript:" class="cameratag_goto_start">cancel</a>');

        sms_input_prompt.append(sms_input);
        sms_input_prompt.append(sms_submit);
        sms_screen.append(sms_input_prompt);
      }
      // add to DOM
      container.append(sms_screen);


      // check phone screen
      check_phone_screen = $("#"+dom_id+"-check-phone-screen").addClass("cameratag_screen");
      if (check_phone_screen.length == 0) {
        check_phone_screen = $('<div class="cameratag_screen cameratag_check_phone"><div class="cameratag_check_phone_prompt">Check your phone for mobile recording instructions</div><div class="cameratag_check_phone_url">or vsist http://'+appServer+'/m/'+video.short_code+' your mobile browser</div></div>');
      }
      // add to DOM
      container.append(check_phone_screen);


      // mobile DOM elements
      if (mobile_enabled) {
        // make whole thing uploader on mobile
        self.uploader = create_pluploader(start_screen.attr("id"));
      }

      // hidden inputs
      container.append("<input id='"+input_name+"_video_uuid' type='hidden' name='"+input_name+"[video_uuid]' value=''>");
      $(camera.formats).each(function(index, format){
        container.append("<input id='"+input_name+"_"+format.name+"_video' type='hidden' name='"+input_name+"["+format.name+"][video]' value=''>");
        container.append("<input id='"+input_name+"_"+format.name+"_mp4' type='hidden' name='"+input_name+"["+format.name+"][mp4]' value=''>");
        container.append("<input id='"+input_name+"_"+format.name+"_webm' type='hidden' name='"+input_name+"["+format.name+"][webm]' value=''>");
        container.append("<input id='"+input_name+"_"+format.name+"_thumb' type='hidden' name='"+input_name+"["+format.name+"][thumb]' value=''>");
        container.append("<input id='"+input_name+"_"+format.name+"_small_thumb' type='hidden' name='"+input_name+"["+format.name+"][small_thumb]' value=''>");
      });

      // load up the start screen 
      self.loadInterface(start_screen, true);



      //
      // SETUP ACTION CLASS OBSERVERS
      //
      if (!mobile_browser) {
        container.find(".cameratag_record").click(function(){self.record()});
        container.find(".cameratag_stop_recording").click(function(){self.stopRecording()});
        container.find(".cameratag_stop_playback").click(function(){self.stopPlayback()});
        container.find(".cameratag_play").click(function(){self.play()});
        container.find(".cameratag_publish").click(function(){self.publish()});
        container.find(".cameratag_goto_start").click(function(){self.loadInterface(start_screen, true);});  
        container.find(".cameratag_send_sms").click(function(){self.send_sms(sms_input.val());});
        container.find(".cameratag_sms_link").click(function(){self.loadInterface(sms_screen);});
        container.find(".cameratag_settings_btn").click(function(e){
          e.stopPropagation();
          self.showFlashSettings();
        });  
      }
    };

    var isMobile = function() {
      if( navigator.userAgent.match(/Android/i)
        || navigator.userAgent.match(/webOS/i)
        || navigator.userAgent.match(/iPhone/i)
        || navigator.userAgent.match(/iPad/i)
        || navigator.userAgent.match(/iPod/i)
        || navigator.userAgent.match(/BlackBerry/i)
        || navigator.userAgent.match(/Windows Phone/i)
      ) {
        return true;
      }
      else {
        return false;
      }
    }

    var mobileUploadSupported = function () {
       // Handle devices which falsely report support
       if (navigator.userAgent.match(/(Android (1.0|1.1|1.5|1.6|2.0|2.1))|(Windows Phone (OS 7|8.0))|(XBLWP)|(ZuneWP)|(w(eb)?OSBrowser)|(webOS)|(Kindle\/(1.0|2.0|2.5|3.0))/)) {
         return false;
       }
       // Create test element
       var el = document.createElement("input");
       el.type = "file";
       return !el.disabled;
    }

    var countdown = function(length, callback) {
      if (countdown_counter >= length) {
        countdown_counter = 0;
        countdown_screen.hide();
        callback();
        CameraTag.fire(dom_id, "countdownFinished");
      }
      else {
        countdown_status.html(length - countdown_counter);
        countdown_counter += 1;
        setTimeout(function(){
          countdown(length, callback);
        }, 1000);
      }
    };

    self.loadInterface = function(state_container, alternatives, message) {

      container.find(".cameratag_screen").hide();
      if (alternatives) {
        container.find(".cameratag_alternatives").show();
      }
      else {
       container.find(".cameratag_alternatives").hide(); 
      }

      if (state_container != "none") {
        state_container.css('display','block');
      }
    };

    var recordTimerTick = function() {
      record_timer_count += 1;
      var time_left = maxLength - record_timer_count;
      record_timer_prompt.html( "(" + time_left + ")" );
      if (time_left == 0) {
        clearInterval(record_timer);
        self.stopRecording();
      }
    }

    var throw_error = function(message) {
      error_message.html(message);
      self.loadInterface(error_screen, true);
    };

    self.publish = function() {
      if (!readyToPublish) {
        sendStat("premature_publish");
        throw("Camera not ready to publish. Please wait for the 'readyToPublish' event.");
        return;
      }

      CameraTag.fire(dom_id, "publishing");
      wait("publishing");
      publish_on_server(video.uuid, "webcam", videoServer);
    }

    var sendStat = function(name, stat) {
      stat = stat || {};
      stat.name = name;
      stat.camera_uuid = camera_uuid;
      stat.video_uuid = video.uuid;
      stat.url = window.location.toString();
      stat.host = window.location.hostname;
      stat.agent = navigator.userAgent;
      stat.state = state;
      stat.client_version = CameraTag.version;

      $.ajax({
        url: "//"+appServer+"/stats",
        data:{stat: stat},
        type:"get",
        dataType: "jsonp"
      });
    }

    var wait = function(message) {
      message = message || "please wait";
      wait_message.html(message);
      self.loadInterface(wait_screen);
    }

    var populate_hidden_inputs = function() {
      $("#"+input_name+"_video_uuid").val(video.uuid);
      $(camera.formats).each(function(index, format){
        // videos
        var mp4_url = "//"+appServer+"/videos/"+video.uuid+"/"+format.name+"/mp4";
        if (camera.create_webm) {
          var webm_url = "//"+appServer+"/videos/"+video.uuid+"/"+format.name+"/webm";  
        }
        else {
          var webm_url = "";   
        }
        

        $("#"+input_name+"_"+format.name+"_video").val(mp4_url);
        video.formats[format.name]["video_url"] = mp4_url;

        $("#"+input_name+"_"+format.name+"_mp4").val(mp4_url);
        video.formats[format.name]["mp4_url"] = mp4_url;

        $("#"+input_name+"_"+format.name+"_webm").val(webm_url);
        video.formats[format.name]["webm_url"] = webm_url;

        // thumbnails
        var thumb_url = "//"+appServer+"/videos/"+video.uuid+"/"+format.name+"/thumb";
        $("#"+input_name+"_"+format.name+"_thumb").val(thumb_url);
        video.formats[format.name]["thumb_url"] = thumb_url;

        var small_thumb_url = "//"+appServer+"/videos/"+video.uuid+"/"+format.name+"/small_thumb";
        $("#"+input_name+"_"+format.name+"_small_thumb").val(small_thumb_url);
        video.formats[format.name]["small_thumb_url"] = small_thumb_url;
      });

    };

    self.addVideoData = function(js_object) {
      if (typeof(js_object) != "object") {
        return
      }

      var json_string = JSON.stringify(js_object);
      
      $.ajax({
        url: "//"+appServer+"/videos/"+video.uuid+"/form_data.json",
        data:{form_data: json_string},
        type:"get",
        dataType: "jsonp",
        success: function(response) {
          return true
        },
        error: function() {
          throw_error("Unable to submit form data.");
          sendStat("video_data_error");
          return false;
        }
      })
    }

    self.reset = function() {
      setup();
    }

    self.setLength = function(new_length) {
      maxLength = new_length;
      record_timer_prompt.html( "(" + new_length + ")" );
      // swf.setLength(new_length);
    }


    // publicly accessable methods

    self.send_sms = function(number) {
      if (number == "") {
        alert("please eneter your phone number!")
        return;
      }
      wait("sending your message");
      $.ajax({
        url: "//"+appServer+"/videos/"+video.uuid+"/sms",
        data:{number: number, message: txt_message},
        type:"get",
        dataType: "jsonp",
        success: function(response) {
          if (response.success) {
            self.loadInterface(check_phone_screen);
            CameraTag.fire(dom_id, "smsSent");  
          }
          else {
            self.loadInterface(sms_screen);
            alert("that does not appear to be a valid phone number");
          } 
        },
        error: function() {
          throw_error("Unable to send SMS.");
          sendStat("sms_error", {number: number, message: txt_message});
          return false;
        }
      })
    }

    self.getVideo = function() {
      return video;
    };

    self.restart_upload = function() {
      self.uploader.restart_upload();
    }

    self.destroy = function() {
      state = "disconnecting";
      if (swf && connected) {
        swf.disconnect();
      }
      delete CameraTag.cameras[dom_id];
      container.remove();
    }


    var create_pluploader = function(browse_element_id) {
      var pluploader = new ct_plupload.Uploader({
        // General settings
        runtimes : 'html5,flash,html4',
        url : 'https://s3.amazonaws.com/assets.cameratag.com',
        browse_button : browse_element_id,
        browse_button_hover : "selected",
        multi_selection : false,
        drop_element: dom_id+"_start_screen",
        max_retries: 2,
        
        // Specify what files to browse for
        filters : [
          {title : 'Videos', extensions : 'mov,mpg,mpeg,mp4,m4v,avi,3gp,3gp2,webm,flv,f4v,wmv'}
        ],

        // s3 shinanigans
        multipart_params: {
          'key': '', // this gets replaced on a file by file level during upload
          'acl': 'public-read',
          'success_action_status': '201',
          'AWSAccessKeyId': 'AKIAJCHWZMZ35EB62V2A',    
          'policy': ul_policy,
          'signature': ul_signature,
          'filename': "this is for flash runtime compatability"
        },
        file_data_name: 'file',

        // Flash settings
        flash_swf_url : '//'+appServer+'/'+CameraTag.version+'/plupload/Moxie.swf'
      });

      pluploader.total_upload_size = function() {
        // calculate size
        var upload_bytes = 0;
        $(pluploader.files).each(function(index, file){
          upload_bytes += file.size;
        });
        return upload_bytes;
      };

      pluploader.validate_and_upload = function() {
        // start uploading or throw error
        if (pluploader.total_upload_size() >= 2147483648) {
          alert("You may only upload files up to 2GB in size.")
          sendStat("file_too_big_error");
        }
        else {
          state = "uploading";
          uploading = true; // andorid doesn't seem to get this set through the uploadStarted event?
          CameraTag.fire(dom_id, "uploadStarted");

          setTimeout(function(){ pluploader.start(); }, 10);

          upload_screen.show();
          // start_screen.hide();
          start_screen.css("left", "-10000px");
          start_screen.css("right", "10000px");

          var isAndroid = navigator.userAgent.toLowerCase().indexOf("android") > -1; //&& ua.indexOf("mobile");
          if (isAndroid) {
            upload_status.html("...");
          }
          else {
            upload_status.html("0%");
          }
        }
      }

      pluploader.restart_upload = function() {
        pluploader.stop();
        pluploader.start();
      };

      // set key and upload
      pluploader.bind('FilesAdded', function(up, files) {
        // set the uuid for each file upload
        $(files).each(function(index, file){
          file.s3_key = "recordings/" + video.uuid + ".flv";
        });
        pluploader.validate_and_upload();
      });

      // set file key before uploading
      pluploader.bind('UploadFile', function(up, file) { 
        pluploader.settings.multipart_params.key = file.s3_key;
      });

      // binds remove file callback
      pluploader.bind('FilesRemoved', function(up, files) {
        // maybe we'll use this?
      });

      // binds progress to progress bar
      pluploader.bind('UploadProgress', function(up, file) {
        CameraTag.fire(dom_id, "UploadProgress", file);
        upload_status.html(file.percent + "%");
      });

      // binds individual file uploaded
      pluploader.bind('FileUploaded', function(up, file, info) {
        readyToPublish = true;
        CameraTag.fire(dom_id, "readyToPublish");
        sendStat("upload_success", {message: info.response, status: info.status});

        start_screen.css("left", "0px");
        start_screen.css("right", "0px");

        if (publishOnUpload) {
          wait("publishing");
          publish_on_server(video.uuid, "upload"); // publish without s3  
        }
        else {
          self.loadInterface(completed_screen);
        }  
      });

      // binds all files uploaded
      pluploader.bind('UploadComplete', function(up, file) {
        // dont need to do anything here 
      });

      // shows error object in the browser console (for now)
      pluploader.bind('Error', function(up, error) {
        // unfortunately PLUpload gives some extremely vague 
        // Flash error messages so you have to use WireShark
        // for debugging them (read the README)
        // console.log('Expand the error object below to see the error. Use WireShark to debug.');
        CameraTag.fire(dom_id, "uploadAborted", error);
        self.loadInterface(start_screen, true);
        sendStat("upload_error", error);
      });

    
      $("#"+dom_id+"_start_screen").bind('dragenter', function() {
        $(this).find(".cameratag_select_prompt").html("drop file to upload");
        $(".cameratag_primary_link").hide();
        $(".cameratag_upload_link").show();

      });

      $("#"+dom_id+"_start_screen").bind('dragleave', function(e) {
        $(this).find(".cameratag_select_prompt").html("choose a method below to submit your video");
        $(".cameratag_primary_link").show();
      });
      

      pluploader.init();

      return pluploader;
    }


    var pollForProcessed = function() {
      if (poll_processed) {
        $.ajax({
          url: "//"+appServer+"/videos/"+video.uuid+".json",
          type:"get",
          dataType: "jsonp",
          data: {
            referer: window.location.toString()
          },
          success: function(response) {
            if (response.formats.length > 0 && response.formats[0].state == "COMPLETED") {
              CameraTag.fire(dom_id, "processed");
            }
            else {
              processed_timer = setTimeout(pollForProcessed, 5000);
            }
          },
          error: function() {
            sendStat("processed_poll_error");
          }
        })
      }
    }

    var pollForPublished = function() {
      $.ajax({
        url: "//"+appServer+"/videos/"+video.uuid+".json",
        type:"get",
        dataType: "jsonp",
        data: {
          referer: window.location.toString()
        },
        success: function(response) {
          if (response.state == "published") {
            CameraTag.fire(video.uuid, "published", response);
            clearInterval(published_timer);
          }
          else {
            published_timer = setTimeout(function(){pollForPublished()}, 4000);
          }
        },
        error: function() {
          sendStat("published_poll_error");
        }
      })
    }

    // these methods require the swf to be in existance and are created after it's available

    var setupExternalInterface = function() {
      // communication to swf
      self.play = function() {
        if (connected) {
          swf.startPlayback();
        }
      };

      self.showFlashSettings = function() {
        self.loadInterface("none");
        swf.showFlashSettings();
      }

      self.record = function() { // actually calls countdown which will call record_without_countdown in callback      
        if (connected) {
          CameraTag.fire(dom_id, "countdownStarted");
          swf.showRecorder();
          countdown(preRollLength, self.record_without_countdown);
        }
        else {
          self.loadInterface("none");
          self.connect();
        }
      };

      self.showRecorder = function() {
        swf.showRecorder();
      }

      self.showPlayer = function() {
        swf.showPlayer(); 
      }

      self.record_without_countdown = function() {
        if (!readyToRecord) {
          sendStat("premature_record");
          throw("Camera not ready to record. Please observe 'readyToRecord' event before recording");
          return;  
        }
        state = "recording";
        swf.showRecorder();
        swf.startRecording()  
      };

      self.stopPlayback = function() {
        if (connected) {
          swf.stopPlayback();  
        }
      };

      self.stopRecording = function() {
        if (connected) {
          clearInterval(record_timer);
          swf.stopRecording();  
        }
      };

      self.connect = function() {
        swf.connect();
      };

      self.disconnect = function() {
        state = "disconnecting";
        swf.disconnect();
      };
    }

    var setupEventObservers = function() {
      // communication from swf

      CameraTag.observe(dom_id, "initialized", function() {
        initialized = true;
        state = "initialized";
      }, true);

      CameraTag.observe(dom_id, "securityDialogOpen", function() {
        self.loadInterface("none");
      }, true);

      CameraTag.observe(dom_id, "securityDialogClosed", function() {
        self.loadInterface(camera_detection_screen);
      }, true);

      CameraTag.observe(dom_id, "settingsDialogClosed", function() {
        self.loadInterface(start_screen, true);
      }, true);

      CameraTag.observe(dom_id, "detectingCamera", function() {
        self.loadInterface(camera_detection_screen);
      }, true);

      CameraTag.observe(dom_id, "noCamera", function() {
        throw_error("No Camera Detected");
        sendStat("no_camera_error");
      }, true);

      CameraTag.observe(dom_id, "noMic", function() {
        throw_error("No Microphone Detected");
        sendStat("no_mic_error");
      }, true);

      CameraTag.observe(dom_id, "readyToRecord", function() {
        readyToRecord = true;
        if (recordOnConnect) {
          self.record(); //starts countdown    
        }
      }, true);

      CameraTag.observe(dom_id, "cameraDenied", function() {
        throw_error("Camera Access Denied");
      }, true);

      CameraTag.observe(dom_id, "serverConnected", function() {
        connected = true;
      }, true);

      CameraTag.observe(dom_id, "serverDisconnected", function() {
        connected = false;
        readyToRecord = false;
        if (state != "disconnecting" && state != "published" && state != "readyToPublish"){
          self.stopRecording();
          swf.showNothing();
          throw_error("Lost connection to server");
          setTimeout(function(){
            self.loadInterface(start_screen);  
          }, 2000);
          sendStat("pre_record_disconnect_error");
        }
      }, true);

      CameraTag.observe(dom_id, "playbackFailed", function() {
        throw_error("Playback failed");
        sendStat("playback_error");
      }, true);

      CameraTag.observe(dom_id, "serverError", function() {
        throw_error("Unable To Connect");
        sendStat("no_server_error");
      }, true);

      CameraTag.observe(dom_id, "waitingForCameraActivity", function() {
      }, true);
      

      CameraTag.observe(dom_id, "countdownStarted", function() {
        self.loadInterface(countdown_screen);
      }, true);

      CameraTag.observe(dom_id, "countdownFinished", function() {
      }, true);

      CameraTag.observe(dom_id, "recordingStarted", function() {
        record_timer_count = 0;
        record_timer = setInterval(function(){ recordTimerTick() }, 1000);
        self.loadInterface(recording_screen);
      }, true);

      CameraTag.observe(dom_id, "recordingStopped", function() {
        clearInterval(record_timer);
        if (skipPreview) {
          swf.showPlayer();
          self.loadInterface(accept_screen);
        }
        else {
          self.play();
        }
      }, true);

      CameraTag.observe(dom_id, "bufferingUp", function() {
        wait("uploading your video");
      }, true);

      CameraTag.observe(dom_id, "bufferingDown", function() {
        wait("buffering video playback");
      }, true);    

      CameraTag.observe(dom_id, "recordingTimeOut", function() {
      }, true);

      CameraTag.observe(dom_id, "playbackStarted", function() {
        self.loadInterface(playback_screen);
      }, true);

      CameraTag.observe(dom_id, "playbackStopped", function() {
        self.loadInterface(accept_screen);
      }, true);

      CameraTag.observe(dom_id, "publishing", function() {
        state = "publishing";
      }, true);

      CameraTag.observe(dom_id, "uploadStarted", function() {
        uploading = true;
      }, true);

      CameraTag.observe(dom_id, "uploadAborted", function() {
        uploading = false;
      }, true);

      CameraTag.observe(dom_id, "readyToPublish", function() {
        readyToPublish = true;
        state = "readyToPublish";
      }, true);

      CameraTag.observe(dom_id, "smsSent", function() {
        pollForPublished();
      }, true);

      CameraTag.observe(dom_id, "published", function() {
      }, true);

      CameraTag.observe(dom_id, "publishFailed", function(data) {
        throw_error("Unable to publish your recording.");
        sendStat("publish_error", data);
      }, true);

      CameraTag.observe(dom_id, "processed", function() {
        state = "processed";
        $(".cameratag_thumb_bg").css({backgroundImage: "url(//"+appServer+"/videos/"+video.uuid+"/"+camera.formats[0].name+"/thumb)"});
      }, true);
    }

    setup();
  }






















  //
  // Player
  //
  Player = function(video_el) {
    var video_el = $(video_el);
    var new_video_tag;
    var uuid = video_el.attr("data-uuid") || video_el.attr("data-video-id");
    var videojsInjected = false;
    var self = this;
    var video = {};
    var dom_id = video_el.attr("id") || uuid;
    var format;
    var height;
    var width;
    var vjs_player;

    var setup = function(){
      // make sure videojs is ready
      if (!videojsReady()) {
        setTimeout(setup, 30);
        return;
      };

      // hit server and get formats, permission
      $.ajax({
        url: "//"+appServer+"/videos/"+uuid+".json",
        type:"get",
        dataType: "jsonp",
        data: {
          referer: window.location.toString()
        },
        success: function(response) {
          video = response;
          format = find_format_by_name( video_el.attr("data-format") ) || video.formats[0];
          
          // calculate height and width
          if (video_el.attr("height")) {
            height = video_el.attr("height");
          }
          else {
            height = format.height / 2;
          }
          if (video_el.attr("width")) {
            width = video_el.attr("width");
          }
          else {
            width = format.width / 2;
          }

          // build apropriate interface
          if (format.flv_url || format.state == "COMPLETED") {
            build_video_tag();
            init_videojs();  
          }
          else {
            build_placeholder();
          }
        },
        error: function() {
        }
      });
    }

    var find_format_by_name = function(name) {
      var result = $.grep(video.formats, function(e){ return e.name == name; });
      return result[0];
    }

    var build_placeholder = function() {
      var placeholder = $('<div class="cameratag_placeholder"></div>');
      var error_message = $('<div class="cameratag_player_error">This video is processing. <br/> It will be available soon.</div>');
      placeholder.append(error_message);
      placeholder.width(width);
      placeholder.height(height);
      video_el.replaceWith(placeholder);
    }

    var build_video_tag = function() {
      new_video_tag = $('<video></video>')

      // make sure we have a DOM_ID and necessary classes
      new_video_tag.attr("id", dom_id);

      // add necessary videojs classes
      new_video_tag.addClass("video-js");
      new_video_tag.addClass("vjs-default-skin");

      // set height and width
      new_video_tag.attr("height", height);
      new_video_tag.attr("width", width);
      
      // add poster attribute
      new_video_tag.attr("poster", format.thumbnail_url)

      // add video sources
      addVideoSources(format);

      video_el.replaceWith(new_video_tag);
    }

    var addVideoSources = function(format) {
      // fall through of playback options
      if (format.state == "COMPLETED") {
        // h264 stream
        // var rtmp_h264_source = $('<source src="'+format.mp4_stream+'" type="rtmp/mp4" />');
        // new_video_tag.append(rtmp_h264_source);

        // h264 progressive
        var prog_h264_source = $('<source src="'+format.mp4_url+'" type="video/mp4" />');
        new_video_tag.append(prog_h264_source);

      }
      else if (format.flv_url) {
        // flv progressive
        var prog_flv_source = $('<source src="'+format.flv_url+'" type="video/flv" />');
        new_video_tag.append(prog_flv_source);
      }
    }

    var init_videojs = function() {
      // kill from videojs cache if necessary
      for( vid in _V_.players ){
        if(vid.toString() == dom_id){
         delete _V_.players[vid]
        }
      }
      _V_.options.flash.swf = "//"+appServer+"/"+CameraTag.version+"/video-js.swf";
      _V_.options.flash.params = {
         allowfullscreen: "true",
         wmode: "transparent",
         allowscriptaccess: "always"
      }; 
      vjs_player = ct_videojs(dom_id, { 
        controls: true,
        techOrder: ["flash", "html5"] // flash first to avoid shenanigans
      }, 
      function(){
        // Player (this) is initialized and ready.
      });
      CameraTag.players[dom_id] = vjs_player;
      pass_through_events();
    }

    var pass_through_events = function() {
      vjs_player.on("durationchange", function(data) {
        CameraTag.fire(dom_id, "durationchange", data);
      });
      
      vjs_player.on("ended", function(data) {
        // this.currentTime(0); 
        // this.pause();
        CameraTag.fire(dom_id, "ended", data);
      });
      
      vjs_player.on("error", function(data) {
        CameraTag.fire(dom_id, "error", data);
      })
      
      vjs_player.on("firstplay", function(data) {
        CameraTag.fire(dom_id, "firstplay", data);
      })
      
      vjs_player.on("fullscreenchange", function(data) {
        CameraTag.fire(dom_id, "fullscreenchange", data);
      })
      
      vjs_player.on("loadedalldata", function(data) {
        CameraTag.fire(dom_id, "loadedalldata", data);
      })
      
      vjs_player.on("loadeddata", function(data) {
        CameraTag.fire(dom_id, "loadeddata", data);
      })
      
      vjs_player.on("loadedmetadata", function(data) {
        CameraTag.fire(dom_id, "loadedmetadata", data);
      })
      
      vjs_player.on("loadstart", function(data) {
        CameraTag.fire(dom_id, "loadstart", data);
      })
      
      vjs_player.on("pause", function(data) {
        CameraTag.fire(dom_id, "pause", data);
      })
      
      vjs_player.on("play", function(data) {
        CameraTag.fire(dom_id, "play", data);
      })
      
      vjs_player.on("progress", function(data) {
        CameraTag.fire(dom_id, "progress", data);
      })
      
      vjs_player.on("timeupdate", function(data) {
        CameraTag.fire(dom_id, "timeupdate", data);
      })
      
      vjs_player.on("volumechange", function(data) {
        CameraTag.fire(dom_id, "volumechange", data);
      })
      
      vjs_player.on("resize", function(data) {
        CameraTag.fire(dom_id, "resize", data);
      })
    }

    setup();
  }

};








if (!Array.prototype.indexOf)
{
  Array.prototype.indexOf = function(elt /*, from*/)
  {
    var len = this.length >>> 0;

    var from = Number(arguments[1]) || 0;
    from = (from < 0)
         ? Math.ceil(from)
         : Math.floor(from);
    if (from < 0)
      from += len;

    for (; from < len; from++)
    {
      if (from in this &&
          this[from] === elt)
        return from;
    }
    return -1;
  };
}










//
// TIP THE FIRST DOMINO
//

function addLoadEvent(func) {
  var oldonload = window.onload;
  if (typeof window.onload != 'function') {
    window.onload = func;
  } else {
    window.onload = function() {
      if (oldonload) {
        oldonload();
      }
      func();
    }
  }
};

addLoadEvent(function(){
  CameraTag.setup();
});