var Waterline = require('waterline');

module.exports = Waterline.Collection.extend({
  identity: 'tableno',
  tableName: "c_tablelist",
  connection: 'default',
  attributes: {
    id: {
      type: "integer",
      primaryKey: true,
      unique: true,
      columnName: "id"
    },
    gameName: {
      type: "string",
      columnName: "gamename"
    },
    tableNumber: {
      type: "string",
      columnName: "tablenumber"
    },
    chinaVideoUrl: {
      type: "json",
      columnName: "cn_video"
    },
    seaVideoUrl: {
      type: "json",
      columnName: "sea_video"
    },
    neaVideoUrl: {
      type: "json",
      columnName: "nea_video"
    },
    maxTime: {
      type: "integer",
      columnName: "max_time"
    },
    game_code_id: {
      type: "integer",
      columnName: "game_code_id"
    },
    subcode: {
      type: "string",
      columnName: "subcode"
    }
  },
  autoCreatedAt: false,
  autoUpdatedAt: false,
});
