const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    stock: {type: String, required: true, uppercase: true},
    likes: {type:Number, default:0},
    ips:[String] //List de iiPs que ya dieron like
});

module.exports = mongoose.model('Stock', stockSchema);