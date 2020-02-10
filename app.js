//***********************//
// Staging Process        *
//***********************//
global.appEnvironment = process.env.NODE_ENV || "local";

switch (appEnvironment.toLowerCase()) {
	case 'dev': case 'development':
    global.connConfigs = require("./config/env/development");
  break;

  case 'loc': case 'local':
    global.connConfigs = require("./config/env/local");
    break;

  case 'test': case 'testing':
    global.connConfigs = require("./config/env/testing");
  break;

  case 'prod': case 'production':
    global.connConfigs = require("./config/env/production");
  break;

  default:
    return console.log("Staging does not exists.");
}

//***********************//
// Game Initialize        *
//***********************//
const game = process.env.GAME || "baccarat";
const portConfigs = require("./config/ports");

switch (game.toLowerCase()) {
  case 'bacca': case 'baccarat':
    global.gameNow = 'baccarat';
    global.gamePort = portConfigs[global.appEnvironment].baccarat;
  break;

  case 'blackjack':
    global.gameNow = 'blackjack';
    global.gamePort = portConfigs[global.appEnvironment].blackjack;
  break;

  case 'dt': case 'dragontiger':
    global.gameNow = 'dragontiger';
    global.gamePort = portConfigs[global.appEnvironment].dragontiger;
  break;

  case 'fantan':
    global.gameNow = 'fantan';
    global.gamePort = portConfigs[global.appEnvironment].fantan;
  break;

  case 'poker':
    global.gameNow = 'poker';
    global.gamePort = portConfigs[global.appEnvironment].poker;
  break;

  case 'roulette':
    global.gameNow = 'roulette';
    global.gamePort = portConfigs[global.appEnvironment].roulette;
  break;

  case 'sicbo':
    global.gameNow = 'sicbo';
    global.gamePort = portConfigs[global.appEnvironment].sicbo;
  break;

  case 'moneywheel':
    global.gameNow = 'moneywheel';
    global.gamePort = portConfigs[global.appEnvironment].moneywheel;
  break;

  default:
    return console.log("Game does not exists.");
}

//***********************//
// App. Initialization    *
//***********************//
require( "console-stamp" )( console, { pattern : "dd/mm/yyyy HH:MM:ss.l" } );
const WEB_SOCKET = require("ws");
const orm = require("./src/helpers/orm");
const socketHandler = require("./src/socket-handler");

global._ = require("lodash");
global.async = require("async");
global.WS_SERVER = new WEB_SOCKET.Server({ port: gamePort });
global.tables = {};
global.appServers = {};
global.dealerApps = {};

async.auto({
  initModel: (cb) => {
    orm.initialize(cb);
  },
  startServer: ["initModel", (results, cb) => {
    socketHandler.serverStart(cb);
  }]
}, (err) => {
  if (err) {
    console.log("\033[41m", "GAME SERVER INITIALIZATION FAILED", "\033[0m");
    console.log("\033[31m", "REASON:", err, "\033[0m");
    return 0;
  }

  console.log("\033[46m\033[30m", "GAME SERVER HAS BEEN INITIALIZED SUCCESSFUL", "\033[0m");
  console.log("\033[46m\033[30m", "[ENV]:", appEnvironment, "[STUDIO]:", connConfigs.studio, "\033[0m");
});
