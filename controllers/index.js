'use strict';

var ygg = require('yggdrasil')({}),
    mongoose = require('mongoose'),
    JsDocument = require('../models/JsDocument');

module.exports = function (router) {

    router.get('/', function (req, res) {
        res.render('index');
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
       JsDocument.findOne({name:req.params.name}, function (e, doc) {
          res.json({content:doc?doc.content:null});
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
};
