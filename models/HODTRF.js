// module/HODTRF.js
const mongoose = require('mongoose');

const HODTRFSchema = new mongoose.Schema({
    name: String,
    departmentName:String,
    mobileNo: String,
    dateOfRequest: { type: Date, default: Date.now },
    status: { type: String, default: 'pending' },
    decision: { type: String, default: null },
});

module.exports = mongoose.model('HODTRF', HODTRFSchema);
