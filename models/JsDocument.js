'use strict';
var mongoose = require('mongoose');

var JsDocumentSchema = mongoose.Schema({
    name: {type:String, unique:true},
    content: String,
    createdBy: String
});

module.exports = mongoose.model('JsDocument', JsDocumentSchema);
