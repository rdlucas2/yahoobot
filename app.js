var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');

//=========================================================
// Bot Setup
//=========================================================
var botName = 'yabot';

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function() {
    //console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bot Dialogs
//=========================================================

bot.use(builder.Middleware.firstRun({ version: 1.0, dialogId: '*:/firstRun' }));
bot.dialog('/firstRun', [
    function(session) {
        builder.Prompts.text(session, "Hello, I'm " + botName + "... What's your name?");
    },
    function(session, results) {
        // We'll save the users name and send them an initial greeting. All 
        // future messages from the user will be routed to the root dialog.
        session.userData.name = results.response;
        session.endDialog("Hi %s, type \"!help\" or \"" + botName + " help\" to learn what I can do, or just tell me what to do!", session.userData.name);
    }
]);

//monitors chat for commands it's familiar with
bot.dialog('/', function(session) {
    var possibleCommand;
    //allow for shorthand with !
    if (session.message.text.startsWith('!')) {
        possibleCommand = session.message.text.replace('!', '');
    }
    //call on the bot by name
    if (session.message.text.includes(botName)) {
        possibleCommand = session.message.text.replace(botName + ' ', '');
    }

    if (!possibleCommand) {
        session.endDialog();
        return;
    }

    var command = possibleCommand.split(' ')[0].toLowerCase();

    if (command === 'help') {
        session.beginDialog('/help');
        return;
    }

    var result = dialogs.filter(function(item) {
        return item.key === command;
    });

    if (result.length === 1) {
        session.beginDialog('/' + result[0].key);
    } else {
        session.send("%s, it looks like you tried to use a command, but made a mistake. Type \"!help\" or \"testbot help\" to see what I can do, or try again.", session.userData.name);
    }
});

bot.dialog('/help', [
    function(session) {
        var keys = dialogs.map(function(item) {
            return item.key;
        });
        session.send('To start a command, lead with my name, ' + botName + ', or an exclamation point, like \"!help\" or \"' + botName + ' help\".');
        builder.Prompts.choice(session, "Here are a list of my commands... choose one to learn more about it.", keys);
    },
    function(session, results) {
        var result = dialogs.filter(function(item) {
            return item.key === results.response.entity;
        });

        if (result.length === 1) {
            session.send(result[0].help);
        } else {
            session.send("Sorry, I didn't understand, please try again.");
        }

        session.endDialog();
    }
]);

//=========================================================
// Helper Functions
//=========================================================
function getRandomNumberBetween(lowerBound, upperBound) {
    return Math.floor(Math.random() * ((upperBound - lowerBound) + 1) + lowerBound);
};

var YqlUrlGenerator = (function() {
    function YqlUrlGenerator(yahooBaseYqlUrl, flickrApiKey) {
        this.flickrApiKey = flickrApiKey;
        this.yahooBaseYqlUrl = yahooBaseYqlUrl;
    }

    YqlUrlGenerator.prototype.generateQueryTagString = function(text) {
        var textArray = text.split(' ');
        var tags = '';
        for (var i = 0; i < textArray.length; i++) {
            tags += textArray[i]
            if (i !== textArray.length - 1) {
                tags += '%2C%20';
            }
        }
        return tags;
    };

    YqlUrlGenerator.prototype.getImagesWithText = function(text) {
        text = text.replace(/\//g, ' ');
        var formattedText = encodeURIComponent(text); //text.replace(/ /g,"%20");
        var getBackgroundQuery = "select%20source%20from%20flickr.photos.sizes%20where%20api_key%3D%22" + this.flickrApiKey + "%22%20and%20photo_id%20in%20(select%20id%20from%20flickr.photos.search%20where%20api_key%3D%22" + this.flickrApiKey + "%22%20and%20text%3D%22" + formattedText + "%22)&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=";
        return this.yahooBaseYqlUrl + getBackgroundQuery;
    };

    YqlUrlGenerator.prototype.getImagesWithTags = function(text) {
        text = text.replace(/\//g, ' ');
        var tags = this.generateQueryTagString(text);
        var getBackgroundQuery = "select%20source%20from%20flickr.photos.sizes%20where%20api_key%3D%22" + this.flickrApiKey + "%22%20and%20photo_id%20in%20(select%20id%20from%20flickr.photos.search%20where%20api_key%3D%22" + this.flickrApiKey + "%22%20and%20tags%3D%22" + tags + "%22)&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=";
        return this.yahooBaseYqlUrl + getBackgroundQuery;
    };

    YqlUrlGenerator.prototype.getImagesWithTextAndTags = function(text) {
        text = text.replace(/\//g, ' ');
        var formattedText = encodeURIComponent(text); //text.replace(/ /g,"%20");
        var tags = this.generateQueryTagString(text);
        var getBackgroundQuery = "select%20source%20from%20flickr.photos.sizes%20where%20api_key%3D%22" + this.flickrApiKey + "%22%20and%20photo_id%20in%20(select%20id%20from%20flickr.photos.search%20where%20api_key%3D%22" + this.flickrApiKey + "%22%20and%20text%3D%22" + formattedText + "%22%20and%20tags%3D%22" + tags + "%22)&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=";
        return this.yahooBaseYqlUrl + getBackgroundQuery;
    };

    YqlUrlGenerator.prototype.getWeatherByWoeId = function(woeid) {
        var getWeatherQuery = "select%20*%20from%20weather.forecast%20where%20woeid%20in%20(" + woeid + ")&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys";
        return this.yahooBaseYqlUrl + getWeatherQuery;
    };

    YqlUrlGenerator.prototype.getWoeIdFromLocation = function(location) {
        location = location.replace(/\//g, ' ');
        var formattedLocation = encodeURIComponent(location); //text.replace(/ /g,"%20");
        var getGeoWoeIdQuery = "select%20*%20from%20geo.places%20where%20text%3D%22" + formattedLocation + "%22&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=";
        return this.yahooBaseYqlUrl + getGeoWoeIdQuery;
    };

    YqlUrlGenerator.prototype.getLocationFromLatAndLon = function(location) {
        var getQuery = "select%20*%20from%20geo.placefinder%20where%20text%3D%22" + location + "%22%20and%20gflags%3D%22R%22&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=";
        return this.yahooBaseYqlUrl + getQuery;
    };

    return YqlUrlGenerator;
})();

var yahooBaseYqlUrl = 'https://query.yahooapis.com/v1/public/yql?q=';
var flickrApiKey = '429cce0f83cf8b43f51a97d4d26360bb';
var yqlUrlGenerator = new YqlUrlGenerator(yahooBaseYqlUrl, flickrApiKey);

//=========================================================
// Build additional Dialogs
//=========================================================
var weatherDialog = {
    'key': 'weather',
    'value': [
        function(session) {
            session.dialogData.weather = null;
            var location = session.message.text.replace(botName, '');
            location = location.replace('!', '');
            location = location.replace('weather', '');
            location = location.replace(' ', '');
            if (location) {
                var options = {
                    url: yqlUrlGenerator.getWoeIdFromLocation(location),
                    method: 'GET',
                    headers: {
                        "Content-Type": "application/json"
                    }
                };
                request(options, function(error, response, body) {
                    if (!error) {
                        var data = JSON.parse(body);
                        var place = data.query.results.place;
                        var woeid = null;
                        if (Object.prototype.toString.call(place) === '[object Array]') {
                            woeid = place[0].woeid; //should actually prompt for which country maybe... seems that zipcodes match up to other codes in other countries?
                        } else {
                            woeid = place.woeid;
                        }


                        if (woeid) {
                            var options = {
                                url: yqlUrlGenerator.getWeatherByWoeId(woeid),
                                method: 'GET',
                                headers: {
                                    "Content-Type": "application/json"
                                }
                            }

                            request(options, function(error, response, body) {
                                if (!error) {
                                    var data = JSON.parse(body);
                                    if (data.query.results) {
                                        var channel = data.query.results.channel;

                                        var weather = {
                                            'title': channel.item.title,
                                            'temp': channel.item.condition.temp + channel.units.temperature,
                                            'text': channel.item.condition.text,
                                            'date': channel.item.condition.date,
                                            'location': channel.location.city + ',' + channel.location.region + ' (' + channel.location.country + ')',
                                            'extras': {
                                                'wind': channel.wind.speed + channel.units.speed,
                                                'sunrise': 'Sunrise: ' + channel.astronomy.sunrise + ' | Sunset: ' + channel.astronomy.sunset,
                                                'threeday': [channel.item.forecast[0], channel.item.forecast[1], channel.item.forecast[2]], //channel.item.forecast[3], channel.item.forecast[4], channel.item.forecast[5]],
                                                'cancel': 'cancel'
                                            }
                                        };

                                        session.dialogData.weather = weather;
                                        session.send('%s: %s %s', weather.title, weather.temp, weather.text);
                                        builder.Prompts.choice(session, "Choose an option below to learn more or cancel to finish.", weather.extras);
                                    } else {
                                        session.send('Could not find your location at this time, try again!');
                                        session.endDialog();
                                    }
                                }
                            });
                        } else {
                            session.send('Could not find your location!');
                            session.endDialog();
                        }
                    }
                });
            } else {
                session.send('You must supply a location after the command.');
                session.endDialog();
            }
        },
        function(session, results) {
            if (results.response.entity === 'cancel') {
                session.endDialog();
            } else if (Object.prototype.toString.call(session.dialogData.weather.extras[results.response.entity]) === '[object Array]') {
                for (var i = 0; i < session.dialogData.weather.extras[results.response.entity].length; i++) {
                    session.send('%s: Low: %sF | High: %sF | %s', session.dialogData.weather.extras[results.response.entity][i].day, session.dialogData.weather.extras[results.response.entity][i].low, session.dialogData.weather.extras[results.response.entity][i].high, session.dialogData.weather.extras[results.response.entity][i].text);
                }
                session.endDialog();
            } else if (session.dialogData.weather.extras[results.response.entity]) {
                session.send(session.dialogData.weather.extras[results.response.entity]);
                session.endDialog();
            } else {
                session.send('There was an issue with the request, please try again.');
                session.endDialog();
            }
        }
    ],
    'help': 'This command shows the weather for the location provided. An example would look like "!weather New York", or "testbot weather 10001"'
}

var pictureDialog = {
    'key': 'pic',
    'value': function(session) {
        var input = session.message.text.replace(botName, '');
        input = input.replace('!', '');
        input = input.replace('pic', '');
        input = input.replace(' ', '');
        if (input) {
            var options = {
                url: yqlUrlGenerator.getImagesWithTextAndTags(input),
                method: 'GET',
                headers: {
                    "Content-Type": "application/json"
                }
            };
            request(options, function(error, response, body) {
                if (!error) {
                    var data = JSON.parse(body);
                    var imageUrls = data.query.results.size;
                    var upperBound = imageUrls.length - 1;
                    var randomInRange = getRandomNumberBetween(0, upperBound);
                    session.send(imageUrls[randomInRange].source);
                    session.endDialog();
                } else {
                    session.send('There was an issue with the request, please try again.');
                    session.endDialog();
                }
            });
        } else {
            session.send('You must provide a subject for the picture.');
            session.endDialog();
        }
    },
    'help': 'This command returns a flickr image where the input is included in the image text and/or tags'
}

//=========================================================
// Register additional Dialogs
//=========================================================
var dialogs = [weatherDialog, pictureDialog];

for (var i = 0; i < dialogs.length; i++) {
    var route = '/' + dialogs[i].key;
    bot.dialog(route, dialogs[i].value);
}