const Waterline = require("waterline");
const mysql = require("sails-mysql");
const connection = connConfigs.connections;
const TableNo = require("../model/TableNo");
const Dealer = require("../model/Dealer");
const waterline = new Waterline();

let ORM = {};

ORM.initialize = (cb) => {
  waterline.loadCollection(TableNo);
  waterline.loadCollection(Dealer);

  const config = {adapters: {mysql}, connections: {default: connection}, defaults:{migrate: "safe"}};

  waterline.initialize(config, function(err, wline) {
    if (err) return cb(err);
    global.TableNo = wline.collections.tableno;
    global.Dealer = wline.collections.dealers;
    return cb();
  });
};

module.exports = ORM;
