var adapter 					= require('../../adapter-lib.js');
var PushBullet 					= require('pushbullet');
// Das hier geht garnicht!!
var variableFunctions			= require('../../../app/functions/variable.js');
var lastMessage					= false;
var pushbullet 					= new adapter("pushbullet");

var pusher 						= new PushBullet(pushbullet.settings.PushbulletAPIKey);


var stream = pusher.stream();
stream.connect();

stream.on('connect', function() {
	pushbullet.log.debug("Connected to Pushbullet");
	process.send({"statusMessage":"Connected to Pushbullet"});
});

stream.on('close', function() { 
	pushbullet.log.debug("Connected to Pushbullet lost");
	process.send({"statusMessage":"Connection to Pushbullet lost!"});
});

stream.on('error', function(error) {
	pushbullet.log.error("Error:" + error);
	process.send({"statusMessage":"error:" + error});
});

stream.on('message', function(data){
	// console.log(data);
});

stream.on('tickle', function(type) {
	var options = {
		limit: 1,
		modified_after: 1400000000.00000
	};
	pusher.history(options, function(error, response) {
		if(error){
			pushbullet.log.error(error);
			return;
		}
		if(response.pushes[0]){
			if(lastMessage != response.pushes[0].body && response.pushes[0].target_device_iden == pushbullet.settings.source_device_iden){
				pushbullet.log.debug("pushbullet:" + response.pushes[0].body + " von " + response.pushes[0].sender_name);
				if(!response.pushes[0].title){
					response.pushes[0].title = "Pushbullet";
				}
				pushbullet.log.debug(response.pushes[0]);
				pushbullet.setVariable('pushbullet.lastMessage.title', response.pushes[0].title);
				pushbullet.setVariable('pushbullet.lastMessage.content', response.pushes[0].body);
				pushbullet.setVariable('pushbullet.lastMessage.senderName', response.pushes[0].sender_name);
				pushbullet.setVariable('pushbullet.lastMessage.iden', response.pushes[0].iden);
				lastMessage = response.pushes[0].body;
			}
		}
	});
});

// stream.on('push', function(data){
	// pushbullet.log.error(data);
// });

process.on('message', function(data) {
	var data = JSON.parse(data);
	pushbullet.log.error(data.protocol);
	switch(data.protocol){
		case "setSetting":
			pushbullet.setSetting(data.setSetting.name, data.setSetting.status);
			break;
		case "send":
			sendPushMessage(data);
		default:
			pushbullet.log.error(data);
			break;
	}
});

function sendPushMessage(data){
	// variableFunctions.replaceVar(data.message, function(nachricht){
	variableFunctions.replaceVar(data.data.message, function(nachricht){
		variableFunctions.replaceVar(data.data.title, function(title){
			data.message = nachricht;
			data.title = title;
			data.source_device_iden = pushbullet.settings.QSiden;
			pushMessage(data);
		});
	});
}

function pushMessage(data){
	pushbullet.checkDevice(function(){
		var options = {
			'receiver_iden': data.receiver,
			'source_device_iden': data.source_device_iden
		}
		pusher.note( options , data.title , data.message , function(error, response) {
			pushbullet.log.error("Erfolgreich gesendet: " + data.message);
		});
	});
}

function createDevice(callback){
	pusher.createDevice('QuickSwitch', function(error, response) {
		pushbullet.setSetting("source_device_iden", response.iden);
		// Hier den DeviceIDEN der Config hinzufügen!
		
		callback(response.iden);
	});
}

pushbullet.checkDevice = function(callback){
	if(!pushbullet.settings.source_device_iden){
		createDevice(function(iden){
			pushbullet.log.debug("Neues Gerät angelegt: " + iden);
			if(callback){
				callback();
			}
		});
	}else{
		pushbullet.log.info("QuickSwitch ist schon erzeugt worden.");
		if(callback){
			callback();
		}
	}
}
pushbullet.checkDevice();
