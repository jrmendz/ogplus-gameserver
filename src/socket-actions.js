const WEB_SOCKET = require("ws");
const CACHE = require("./helpers/cache");
const FUNCTION = require("./helpers/function");
const GAME_SERVICE = require("./games/GameActions");
const ENV = require('../config/env/' + appEnvironment);
const GAME = gameNow;

let actions = {};

/*
  .____                       .___ ___________       ___.    .__
  |    |     ____ _____     __| _/ \__    ___/_____  \_ |__  |  |    ____
  |    |    /  _ \\__  \   / __ |    |    |   \__  \  | __ \ |  |  _/ __ \
  |    |___(  <_> )/ __ \_/ /_/ |    |    |    / __ \_| \_\ \|  |__\  ___/
  |_______ \\____/(____  /\____ |    |____|   (____  /|___  /|____/ \___  >
          \/           \/      \/                  \/     \/            \/
    Load Tables for specific games
 */
actions.loadTables = function (data, cb) {
  let mapper = {
    baccarat: { player: 0, banker: 0, tie: 0, bankerPair: 0, playerPair: 0 },
    dragontiger: { dragon: 0, tiger: 0, tie: 0 },
    moneywheel: { "1": 0, "2": 0, "5": 0, "10": 0, "20": 0, "og": 0 }
  };
  let tableInfo = {};
  let tasks, query;

  // Validators
  if (_.isUndefined(gameNow))
    return cb("Invalid game name");
  if (!connConfigs.studio)
    return cb("Studio not specified on environment");

  // Initialization of variables
  query = "SELECT t.*, t.tablenumber as tableNumber, rl.gamecode FROM c_tablelist t LEFT JOIN c_gamecodes rl ON rl.id=t.game_code_id WHERE rl.gamecode='" + gameNow + "' AND t.studio = '" + (ENV.studio || "''") + "'";
  tasks = [
    (cb) => {
      // Execute get tables query
      TableNo.query(query, cb);
    },
    (arg, cb) => {
      // Validators
      if (_.isEmpty(arg)) return cb("No table has been pulled from database.");

      // Loop each tables
      async.eachSeries(arg, (tbl, cb) => {
        if (_.isUndefined(tbl)) return cb("Invalid Table Data");

        async.waterfall([
          (cb) => {
            CACHE.get("dealer_" + tbl.tableNumber, cb);
          },
          (arg, cb) => {
            tableInfo = {
              id: tbl.id,
              name: tbl.gamename,
              tableNumber: tbl.tableNumber,
              code: tbl.gamecode,
              subcode: tbl.subcode,
              maxtime: tbl.max_time,
              videoUrl : {
                china: jsonParseSafe(tbl.cn_video) || [],
                sea: jsonParseSafe(tbl.sea_video) || [],
                nea: jsonParseSafe(tbl.nea_video) || []
              },
              status: "disconnected",
              game: {},
              road: [],
              extendable: false,
              dealer: arg ? arg : { rid: "", name: "", bday:"", height:"", stats:"", hobbies:"", imageClassic: "",  imageGrand: "",  imagePrestige: "", imageManbetx: "", languages: tbl.languages || 'en', },
              shoeGame: "",
              totalResult: mapper[gameNow] || {}
            };

            // console.log(tbl.tableNumber, JSON.stringify(tableInfo.dealer));

            // Add to global tables
            tables[tbl.tableNumber] = tableInfo;
            return cb();
          }
        ], cb);
      }, cb);
    }
  ];

  async.waterfall(tasks, cb);
};

/*
  _________                         _________                                        _____
 /   _____/_____  ___  __  ____    /   _____/  ____ _______ ___  __  ____ _______   /  _  \  ______  ______
 \_____  \ \__  \ \  \/ /_/ __ \   \_____  \ _/ __ \\_  __ \\  \/ /_/ __ \\_  __ \ /  /_\  \ \____ \ \____ \
 /        \ / __ \_\   / \  ___/   /        \\  ___/ |  | \/ \   / \  ___/ |  | \//    |    \|  |_> >|  |_> >
/_______  /(____  / \_/   \___  > /_______  / \___  >|__|     \_/   \___  >|__|   \____|__  /|   __/ |   __/
        \/      \/            \/          \/      \/                    \/                \/ |__|    |__|
 */
actions.saveServerApp = (ws = {}, url = "", cb) => {
  let serverId, serverName, urlSplit, serverObjName;

  // 1st Level of validation
  if (_.isEmpty(ws)) return cb("Invalid ServerApp Socket Connection");
  if (!url) return cb("Invalid ServerApp URL");

  // Split URL
  urlSplit = url.split("/");
  serverId = urlSplit[1] || "";
  serverName = urlSplit[2] || "";

  // 2nd Level of validation
  if (urlSplit.length !== 3) {
    return cb("Unauthorized Game Server Connection Detected. Connection Closed.");
  }
  // Check if there's a serverId and name on it
  if (!serverId || !serverName) {
    return cb("Invalid Server ID or Name. Connection closed.");
  }

  serverObjName = serverId + "-" + serverName;

  if (appServers[serverObjName]) console.log("\033[33m[WARNING] Game Server [" + serverObjName + "] connection refreshed", "\033[0m");
  appServers[serverObjName] = { app: ws, url: url };

  // Check if the socket is in readyState
  if (ws.readyState === WEB_SOCKET.OPEN) {
    ws.send(JSON.stringify({ action: "tables", tableNumber: "GAME-APP", data: tables }));
  } else {
    return cb("WebSocket not ready.");
  }

  // Return success
  return cb(null, { serverId: serverObjName });
};


/*
_________  .__                             _________                                        _____
\_   ___ \ |  |    ____   ______  ____    /   _____/  ____ _______ ___  __  ____ _______   /  _  \  ______  ______
/    \  \/ |  |   /  _ \ /  ___/_/ __ \   \_____  \ _/ __ \\_  __ \\  \/ /_/ __ \\_  __ \ /  /_\  \ \____ \ \____ \
\     \____|  |__(  <_> )\___ \ \  ___/   /        \\  ___/ |  | \/ \   / \  ___/ |  | \//    |    \|  |_> >|  |_> >
 \______  /|____/ \____//____  > \___  > /_______  / \___  >|__|     \_/   \___  >|__|   \____|__  /|   __/ |   __/
        \/                   \/      \/          \/      \/                    \/                \/ |__|    |__|
 */
actions.closeServerApp = (ws = {}, url = "", cb) => {
  let serverId, serverName, urlSplit, serverObjName;

  // 1st Level of validation
  if (_.isEmpty(ws)) return cb("Invalid ServerApp Socket Connection");
  if (!url) return cb("Invalid URL provided [" + url + "]");

  urlSplit = url.split("/");
  serverId = urlSplit[1] || "";
  serverName = urlSplit[2] || "";

  // 2nd Level of validation
  if (urlSplit.length !== 3) {
    ws.close();
    return cb("Unauthorized Game Server Connection Detected. Connection Closed.");
  }

  // Check if there's a serverId and name on it
  if (!serverId || !serverName) {
    ws.close();
    return cb("Invalid Server ID or Name. Connection closed.");
  }

  serverObjName = serverId + "-" + serverName;

  _.omit(appServers, [serverObjName]);
  return cb(null, { serverID: serverObjName });
};


/*
  _________                       ________                   .__                     _____
 /   _____/_____  ___  __  ____   \______ \    ____  _____   |  |    ____ _______   /  _  \  ______  ______
 \_____  \ \__  \ \  \/ /_/ __ \   |    |  \ _/ __ \ \__  \  |  |  _/ __ \\_  __ \ /  /_\  \ \____ \ \____ \
 /        \ / __ \_\   / \  ___/   |    `   \\  ___/  / __ \_|  |__\  ___/ |  | \//    |    \|  |_> >|  |_> >
/_______  /(____  / \_/   \___  > /_______  / \___  >(____  /|____/ \___  >|__|   \____|__  /|   __/ |   __/
        \/      \/            \/          \/      \/      \/            \/                \/ |__|    |__|
 */
actions.saveDealerApp = (ws = {}, url = "", cb) => {
  let tableNumber, urlSplit;

  // Validators
  if (_.isEmpty(ws)) return cb("Invalid DealerApp Socket Connection");
  if (!url) return cb("Invalid DealerApp URL");

  // Initializing Variables
  urlSplit = url.split("/");
  tableNumber = urlSplit[2];

  if (urlSplit.length !== 4)
    return cb("Unauthorized DealerApp Connection Detected. Connection Closed.");
  if (!tableNumber)
    return cb("Invalid Table Number. Connection Closed.");

  // If there's an existing connection, close it and change to new connection
  if (dealerApps[tableNumber]) {
    // Close other existing player connection and add the socket
    dealerApps[tableNumber].app.close();
    console.log("\033[33m[WARNING] Table [" + tableNumber + "] connection refreshed", "\033[0m");
  }

  dealerApps[tableNumber] = { app: ws, url: url, table: tableNumber };

  // Return success
  return cb(null, { tableNumber: tableNumber });
};

/*
_________  .__                           ________                   .__                     _____
\_   ___ \ |  |    ____   ______  ____   \______ \    ____  _____   |  |    ____ _______   /  _  \  ______  ______
/    \  \/ |  |   /  _ \ /  ___/_/ __ \   |    |  \ _/ __ \ \__  \  |  |  _/ __ \\_  __ \ /  /_\  \ \____ \ \____ \
\     \____|  |__(  <_> )\___ \ \  ___/   |    `   \\  ___/  / __ \_|  |__\  ___/ |  | \//    |    \|  |_> >|  |_> >
 \______  /|____/ \____//____  > \___  > /_______  / \___  >(____  /|____/ \___  >|__|   \____|__  /|   __/ |   __/
        \/                   \/      \/          \/      \/      \/            \/                \/ |__|    |__|
 */
actions.closeDealerApp = (ws = {}, url = "", cb) => {
  let tableNumber, urlSplit;

  // Validators
  if (_.isEmpty(ws)) return cb("Invalid DealerApp Socket Connection");
  if (!url) return cb("Invalid DealerApp URL");

  // Initializing Variables
  urlSplit = url.split("/");
  tableNumber = urlSplit[2];

  if (!tableNumber) {
    ws.close();
    return cb("Invalid Table Number. Connection Closed.");
  }

  if (!dealerApps[tableNumber]) {
    ws.close();
    return cb("Table not listed [dealerApps]");
  }

  if (!tables[tableNumber]) {
    ws.close();
    return cb("Table not listed [tables]");
  }

  _.omit(dealerApps, [tableNumber]);
  _.omit(tables, [tableNumber]);

  FUNCTION.broadcastToServerApp({
    action: "disconnect",
    tableNumber: tableNumber,
    data: {
      status: "disconnected",
      gameType: GAME
    }
  });

  return cb(null, { tableNumber: tableNumber });
};

/*
  _________                                        _____                      ___ ___                      .___.__   .__
 /   _____/  ____ _______ ___  __  ____ _______   /  _  \  ______  ______    /   |   \ _____     ____    __| _/|  |  |__|  ____    ____
 \_____  \ _/ __ \\_  __ \\  \/ /_/ __ \\_  __ \ /  /_\  \ \____ \ \____ \  /    ~    \\__  \   /    \  / __ | |  |  |  | /    \  / ___\
 /        \\  ___/ |  | \/ \   / \  ___/ |  | \//    |    \|  |_> >|  |_> > \    Y    / / __ \_|   |  \/ /_/ | |  |__|  ||   |  \/ /_/  >
/_______  / \___  >|__|     \_/   \___  >|__|   \____|__  /|   __/ |   __/   \___|_  / (____  /|___|  /\____ | |____/|__||___|  /\___  /
        \/      \/                    \/                \/ |__|    |__|            \/       \/      \/      \/                \//_____/
 */
actions.serverAppHandling = (ws = {}, params = null, URL = "", cb) => {
  let url = URL.split("/");
  let serverId = url[2];
  let data;

  // Validators
  if (_.isEmpty(ws))          return cb("Invalid Parameter: [ws]");
  if (!params)                return cb("Invalid Parameter: [data]");
  if (!jsonParseSafe(params)) return cb("Invalid Parameter: [params]");
  if (!URL)                   return cb("Invalid Parameter: [URL]");
  if (!serverId)              return cb("Invalid Parameter: [URL] Missing server id when split");

  // Initializing Variables
  data = jsonParseSafe(params);

  switch (data.action) {
    case "ping":
      console.log("\033[36m[" + serverId + "] <<< KEEP ALIVE REQUEST >>>", "\033[0m");
      ws.send('{"action":"pong","tableNumber":"GAME_SERVER","data":"{}"}');
      return cb();
    case "update_tables":
      GAME_SERVICE.updateTableInfo({}, (err, data) => {
        if (err) return cb(err);

        console.log("\033[44m\033[30m", "[[ ", _.toUpper(gameNow), "TABLE INFORMATION UPDATED ]]", "\033[0m");
        // Broadcast update info
        FUNCTION.broadcastToServerApp({
          action: "update_tables",
          tableNumber: "GAME_SERVER",
          data: data
        }, cb);
      });
      break;
    default:
      return cb("Invalid Command");
  }
};

/*
________                   .__                     _____                      ___ ___                      .___.__   .__
\______ \    ____  _____   |  |    ____ _______   /  _  \  ______  ______    /   |   \ _____     ____    __| _/|  |  |__|  ____    ____
 |    |  \ _/ __ \ \__  \  |  |  _/ __ \\_  __ \ /  /_\  \ \____ \ \____ \  /    ~    \\__  \   /    \  / __ | |  |  |  | /    \  / ___\
 |    `   \\  ___/  / __ \_|  |__\  ___/ |  | \//    |    \|  |_> >|  |_> > \    Y    / / __ \_|   |  \/ /_/ | |  |__|  ||   |  \/ /_/  >
/_______  / \___  >(____  /|____/ \___  >|__|   \____|__  /|   __/ |   __/   \___|_  / (____  /|___|  /\____ | |____/|__||___|  /\___  /
        \/      \/      \/            \/                \/ |__|    |__|            \/       \/      \/      \/                \//_____/
 */
actions.dealerAppHandling = function (ws = {}, dataParam = null, URL = "", cb) {
  let url = URL.split("/");
  let tableNumber = url[2];
  let data;

  // Validators
  if (_.isEmpty(ws))              return cb("Invalid Parameter: [ws]");
  if (!dataParam)                 return cb("Invalid Parameter: [data]");
  if (!jsonParseSafe(dataParam))  return cb("Invalid Parameter: [data]");
  if (!URL)                       return cb("Invalid Parameter: [URL]");
  if (!tableNumber)               return cb("Invalid Parameter: [URL] Missing table number when split");

  // Welcome command message
  // console.log("["+ tableNumber +"]", 'Command: ', JSON.stringify(jsonParseSafe(dataParam)));
  // console.log("["+ tableNumber +"]", 'Command: ', JSON.stringify(url));

  // Initializing Variables
  data = jsonParseSafe(dataParam);

  // Check if the table broadcast on proper studio
  if (_.isUndefined(tables[tableNumber])) {
    return cb(tableNumber + " is not a valid " +  _.toUpper(ENV.studio) + " table.");
  }

  switch(data.action) {
    /*
      _________.__                      ________
     /   _____/|  |__    ____    ____  /  _____/ _____     _____    ____
     \_____  \ |  |  \  /  _ \ _/ __ \/   \  ___ \__  \   /     \ _/ __ \
     /        \|   Y  \(  <_> )\  ___/\    \_\  \ / __ \_|  Y Y  \\  ___/
    /_______  /|___|  / \____/  \___  >\______  /(____  /|__|_|  / \___  >
            \/      \/              \/        \/      \/       \/      \/
     */
    case "shoeGame":
      // Validator
      if (_.isUndefined(data.shoe))           return cb("Missing [shoe] object");
      if (!data.shoe)                         return cb("Invalid ShoeHand");
      // if (data.shoe.split("-").length !== 2)  return cb("Invalid ShoeHand Format");

      // Call Game Service update shoe
      GAME_SERVICE.updateShoeGame({
        data: data.shoe,
        table: tableNumber
      }, (err, result) => {
        if (err) return cb(err);

        // Broadcast update shoe hand
        FUNCTION.broadcastToServerApp({
          action: "shoeGame",
          tableNumber: tableNumber,
          data: result
        });

        return cb();
      });
      break;

    /*
    __________
    \______   \_______   ____    ____   ____    ______  ______
     |     ___/\_  __ \ /  _ \ _/ ___\_/ __ \  /  ___/ /  ___/
     |    |     |  | \/(  <_> )\  \___\  ___/  \___ \  \___ \
     |____|     |__|    \____/  \___  >\___  >/____  >/____  >
                                    \/     \/      \/      \/
     */
    case "process":
      GAME_SERVICE.processInput({
        data: data,
        table: tableNumber
      }, (err, result) => {
        if (err) {
          FUNCTION.broadcastToDealerApp(err, tableNumber);
          return cb(err);
        }

        FUNCTION.broadcastToDealerApp(result, tableNumber);
        FUNCTION.broadcastToServerApp({
          action: "process",
          tableNumber: tableNumber,
          data: result
        });
        return cb(err);
      });
      break;
    /*
    __________                            .___                         __
    \______   \_______   ____ _____     __| _/ ____  _____     _______/  |_
     |    |  _/\_  __ \ /  _ \\__  \   / __ |_/ ___\ \__  \   /  ___/\   __\
     |    |   \ |  | \/(  <_> )/ __ \_/ /_/ |\  \___  / __ \_ \___ \  |  |
     |______  / |__|    \____/(____  /\____ | \___  >(____  //____  > |__|
            \/                     \/      \/     \/      \/      \/
     */
    case "broadcast":
      GAME_SERVICE.setCards({
        data: data,
        table: tableNumber
      }, (err, result) => {
        if (err) return cb(err);

        FUNCTION.broadcastToServerApp({
          action: "broadcast",
          tableNumber: tableNumber,
          data: result
        });

        return cb();
      });
      break;

    /*
      _________  __            __
     /   _____/_/  |_ _____  _/  |_  __ __  ______
     \_____  \ \   __\\__  \ \   __\|  |  \/  ___/
     /        \ |  |   / __ \_|  |  |  |  /\___ \
    /_______  / |__|  (____  /|__|  |____//____  >
            \/             \/                  \/
     */
    case "status":
      GAME_SERVICE.updateStatus({
        data: data.status,
        table: tableNumber
      }, (err, result) => {
        if (err) return cb(err);

        FUNCTION.broadcastToServerApp({
          action: "status",
          tableNumber: tableNumber,
          data: result
        });

        return cb();
      });
      break;

    /*
    ___________.__
    \__    ___/|__|  _____    ____ _______
      |    |   |  | /     \ _/ __ \\_  __ \
      |    |   |  ||  Y Y  \\  ___/ |  | \/
      |____|   |__||__|_|  / \___  >|__|
                         \/      \/
   */
    case "timer":
      GAME_SERVICE.setTimer({
        data: data.countDown,
        table: tableNumber
      }, (err, result) => {
        if (err) return cb(err);

        FUNCTION.broadcastToServerApp({
          action: "timer",
          tableNumber: tableNumber,
          data: result
        });

        return cb();
      });
      break;

    /*
    ________                   .__
    \______ \    ____  _____   |  |    ____ _______
     |    |  \ _/ __ \ \__  \  |  |  _/ __ \\_  __ \
     |    `   \\  ___/  / __ \_|  |__\  ___/ |  | \/
    /_______  / \___  >(____  /|____/ \___  >|__|
            \/      \/      \/            \/
     */
    case "dealer":
      GAME_SERVICE.updateDealerInfo({
        data: data.dealer,
        table: tableNumber
      }, (err, result) => {
        if (err) return cb(err);

        FUNCTION.broadcastToServerApp({
          action: "dealer",
          tableNumber: tableNumber,
          data: result
        });
        return cb();
      });
      break;

    /*
    __________                    ._______   ____.__     .___
    \______   \  ____ _____     __| _/\   \ /   /|__|  __| _/ ____   ____
     |       _/ /  _ \\__  \   / __ |  \   Y   / |  | / __ |_/ __ \ /  _ \
     |    |   \(  <_> )/ __ \_/ /_/ |   \     /  |  |/ /_/ |\  ___/(  <_> )
     |____|_  / \____/(____  /\____ |    \___/   |__|\____ | \___  >\____/
            \/             \/      \/                     \/     \/
     */
    case "roadVideo":
      GAME_SERVICE.roadVideo({
        data: data.snippet,
        table: tableNumber
      }, (err, result) => {
        if (err) return cb(err);

        FUNCTION.broadcastToServerApp({
          action: "roadVideo",
          tableNumber: tableNumber,
          data: result
        });
        return cb();
      });
      break;

    /*
    __________                                 __
    \______   \_____   ___.__.  ____   __ __ _/  |_
     |     ___/\__  \ <   |  | /  _ \ |  |  \\   __\
     |    |     / __ \_\___  |(  <_> )|  |  / |  |
     |____|    (____  // ____| \____/ |____/  |__|
                    \/ \/
     */
    case "payout":
      GAME_SERVICE.calculatePayout({
        data: data,
        table: tableNumber,
        gameSet: tables[tableNumber].gameSet
      }, (err, result) => {
        if (err) return cb(err);

        FUNCTION.broadcastToServerApp({
          action: "payout",
          tableNumber: tableNumber,
          data: result
        });
        return cb();
      });
      break;

    /*
    ___________          __                       .___
    \_   _____/___  ____/  |_   ____    ____    __| _/
     |    __)_ \  \/  /\   __\_/ __ \  /    \  / __ |
     |        \ >    <  |  |  \  ___/ |   |  \/ /_/ |
    /_______  //__/\_ \ |__|   \___  >|___|  /\____ |
            \/       \/            \/      \/      \/
     */
    case "extend":
      tables[tableNumber].extendable = data.extendable || false;

      FUNCTION.broadcastToServerApp({
        action: "extend",
        tableNumber: tableNumber,
        data: {
          extendable: data.extendable || false
        }
      });

      return cb();
    /*
    __________ .__
    \______   \|__|  ____    ____
     |     ___/|  | /    \  / ___\
     |    |    |  ||   |  \/ /_/  >
     |____|    |__||___|  /\___  /
                        \//_____/
     */
    // case "ping":
    //   console.log("\033[36m[" + tableNumber + "] <<< KEEP ALIVE REQUEST >>>", "\033[0m");
    //   ws.send("PONG REPLIED");
    //   return cb();

    default:
      console.log("Invalid Action", data.action)
      return cb("Invalid Command");
  }
};

/*
  _________                    .___   __           ________                   .__                     _____
 /   _____/  ____    ____    __| _/ _/  |_  ____   \______ \    ____  _____   |  |    ____ _______   /  _  \  ______  ______
 \_____  \ _/ __ \  /    \  / __ |  \   __\/  _ \   |    |  \ _/ __ \ \__  \  |  |  _/ __ \\_  __ \ /  /_\  \ \____ \ \____ \
 /        \\  ___/ |   |  \/ /_/ |   |  | (  <_> )  |    `   \\  ___/  / __ \_|  |__\  ___/ |  | \//    |    \|  |_> >|  |_> >
/_______  / \___  >|___|  /\____ |   |__|  \____/  /_______  / \___  >(____  /|____/ \___  >|__|   \____|__  /|   __/ |   __/
        \/      \/      \/      \/                         \/      \/      \/            \/                \/ |__|    |__|
 */
actions.sendToDealerApp = (params, cb) => {
  let data = jsonParseSafe(params);

  if (!data)                      return cb("Invalid data to be passed on DealerApp");
  if (_.isUndefined(data.table))  return cb("Invalid Parameter: [table]");

  _.forEach(dealerApps, (v, k) => {
    if (data.table === dealerApps[k].table) {
      dealerApps[k].app.send(params);
    }
  });

  return cb(null, { tableNumber: data.table });
};

/**
 * JSON Parse alternative with error handling
 * @param string
 * @returns {*}
 */
function jsonParseSafe (string) {
  try { return JSON.parse(string) } catch (ex) { return null }
}

module.exports = actions;
