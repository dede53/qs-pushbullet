var adapter 					= require('../../adapter-lib.js');
var PushBullet 					= require('pushbullet');
var variableFunctions			= require('../../app/functions/variable.js');
var lastMessage					= false;
var pushbullet 					= new adapter({
	"name": "pushbullet",
	"loglevel": 1,
	"description": "Sendet und emfängt Nachricht von Pushbullet.",
	"settingsFile": "pushbullet.json"
});

var pusher 						= new PushBullet(pushbullet.settings.PushbulletAPIKey);


var stream = pusher.stream();
stream.connect();

stream.on('connect', function() {
	pushbullet.log.debug("Connected to Pushbullet");
});

stream.on('close', function() { 
});

stream.on('error', function(error) {
	pushbullet.log.error("Error:" + error);
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

				pushbullet.setVariable('pushbullet.lastMessage.title', response.pushes[0].title);
				pushbullet.setVariable('pushbullet.lastMessage.content', response.pushes[0].body);
				pushbullet.setVariable('pushbullet.lastMessage.senderName', response.pushes[0].sender_name);
				lastMessage = response.pushes[0].body;
			}
		}
	});
});


process.on('message', function(data) {
	var status = data.status;
	var data = data.data;
	sendPushMessage(status, data);
	/*
		{
			"protocol": 		"send-pushbullet",
			"title": 			"Titel",
			"message": 			"Nachricht",
			"receiver": 		"pushbullet iden"
		}
	*/
});

function sendPushMessage(status, data){
	variableFunctions.replaceVar(data.message, function(nachricht){
		variableFunctions.replaceVar(data.title, function(title){
			data.message = nachricht;
			data.title = title;
			data.source_device_iden = pushbullet.settings.QSiden;
			pushMessage(data, pusher);
		});
	});
}

function pushMessage(data, pusher){
	pushbullet.checkDevice(function(){
		var options = {
			'receiver_iden': data.receiver,
			'source_device_iden': data.source_device_iden
		}
		pusher.note( options , data.title , data.message , function(error, response) {
			console.log("Erfolgreich gesendet: " + data.message);
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