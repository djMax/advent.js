'use strict';

var ygg = require('yggdrasil')({}),
    mongoose = require('mongoose'),
    JsDocument = require('../models/JsDocument'),
    request = require('superagent');

module.exports = function (router) {

    router.get('/', function (req, res) {
        res.render('index');
    });

    router.get('/draw', function (req, res) {
        res.render('canvas');
    });

    router.get('/login', function (req, res) {
        res.render('login');
    });

    router.get('/game', function (req, res) {
        res.render('game');
    });

    router.get('/scratchcraft', function (req, res) {
        res.render('scratchcraft');
    });

    router.post('/login', function (req, res) {
        ygg.auth({
            token: '4b8d9c75-dc26-4cb1-8b9d-253b43f1e6e8', //Optional. Client token.
            agent: 'Minecraft', //Agent name. Defaults to 'Minecraft'
            version: 1, //Agent version. Defaults to 1
            user: req.body.username, //Username
            pass: req.body.password //Password
        }, function (err, data) {
            req.session.minecraft = data;
            var ret = {
                error: err,
                profile: data ? data.selectedProfile : null
            };
            res.json(ret);
        });
    });

    router.get('/console/:app', function (req, res) {
        res.render('index');
    });

    router.get(/~(.*)/, function (req, res) {
        res.render('minecraft');
    });

    router.get('/fetch/:name', function (req, res) {
        JsDocument.findOne({ name: req.params.name }, function (e, doc) {
            res.json({ content: doc ? doc.content : null });
        });
    });

    router.post('/save', function (req, res) {
        try {
            JsDocument.findOneAndUpdate({
                name: req.session.minecraft.selectedProfile.name
            }, {
                    content: req.body.content
                }, {
                    upsert: true
                }, function (err) {
                    res.json({ error: err ? err.message : null });
                });
        } catch (x) {
            console.log(x);
        }
    });

    router.get('/game-map', function (req, res) {
        request
            .get('https://spreadsheets.google.com/feeds/worksheets/1Qv0ErfGE5ZeYP5NRfs1Iew8IBmLmw51wy_EAeq_K5SY/public/full\?alt\=json')
            .end(function (e, r) {
                const gameMap = {};
                const toDo = [];
                r.body.feed.entry.forEach(function (person) {
                    const who = person.title.$t;
                    const rooms = {};
                    toDo.push(parseSheet(rooms, person.link[0].href + '?alt=json'));
                    gameMap[who.toLowerCase()] = rooms;
                });
                Promise.all(toDo).then(function () {
                    res.json(gameMap);
                });
            });
    });
};

function getT(entry, prop) {
    if (entry[prop] && entry[prop].$t) {
        return entry[prop].$t;
    }
    return undefined;
}

function entryInfo(entry) {
    return {
        room: getT(entry, 'gsx$roomname'),
        prompt: getT(entry, 'gsx$prompt'),
        choice: getT(entry, 'gsx$choice'),
        changes: getT(entry, 'gsx$changes'),
        needs: getT(entry, 'gsx$needs'),
        next: getT(entry, 'gsx$nextroom'),
        message: getT(entry, 'gsx$message'),
        special: getT(entry, 'gsx$special'),
    };
}

function parseSheet(rooms, sheetUrl) {
    let lastRoom;
    return new Promise(function (resolve) {
        request.get(sheetUrl)
            .end(function (error, content) {
                try {
                    content.body.feed.entry.map(entryInfo).forEach(function (e) {
                        if (e.room) {
                            lastRoom = rooms[e.room.toLowerCase()] = rooms[e.room] || {
                                prompt: e.prompt,
                                choices: [],
                            };
                        }
                        delete e.room;
                        delete e.prompt;
                        lastRoom.choices.push(e);
                    });
                } catch (error) {
                    console.error(error);
                }
                resolve();
            });
    });
}