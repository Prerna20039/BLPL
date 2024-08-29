// module/Client.js
const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
    name: String,
    mobileNo: String,
    dateOfRequest: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Client', ClientSchema);
