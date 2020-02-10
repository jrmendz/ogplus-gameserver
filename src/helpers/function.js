const WEB_SOCKET = require("ws");
const SECURITIES = require("..//../config/securities");

module.exports = {
  /**
   *  Check if the incoming client connection was authorized
   * @param provider
   * @param url
   * @param responseAsObject
   */
  clientVerifier: (provider = "", url = "", responseAsObject = false) => {
    let key;
    // Validations
    if (!provider || !url) {
      console.log("Invalid Parameter: [provider] or [url]");
      return responseAsObject ? { verified: false, isClient: false } : false;
    }

    key = url.split("/")[1] || "";

    if (!_.includes(["serverApp", "dealerApp"], provider)) {
      console.log("Invalid Provider: [Value should be 'serverApp' or 'dealerApp']");
      return responseAsObject ? { verified: false, isClient: false } : false;
    }

    // Check key if valid
    if (_.includes(SECURITIES[provider].privateKey, key)) {
      console.log("\033[42m\033[30m", (provider === "serverApp" ? "Server": "Dealer"), "key verified. [ KEY:", key, "]", "\033[0m");
      return responseAsObject ? { verified: true, isClient: false } : true;
    } else if (_.includes(SECURITIES[provider].clientKey, key)) {
      console.log("\033[42m\033[30m", "Client", (provider === "serverApp" ? "Server": "Dealer"), "key verified. [ KEY:", key, "]", "\033[0m");
      return responseAsObject ? { verified: true, isClient: true } : true;
    } else {
      return responseAsObject ? { verified: false, isClient: false } : false;
    }
  },



  /**
   * Broadcast to Server Apps
   * @param msg
   * @param cb
   */
  broadcastToServerApp: (msg = null, cb) => {
    if (!WS_SERVER) {
      console.log("\033[31<<< WEB SOCKET NOT INITIALIZED >>>", "\033[0m");
      return;
    }

    _.forEach(appServers, (ws) => {
      let client = ws.app;

      if (client.readyState === WEB_SOCKET.OPEN) {
        client.send(JSON.stringify(msg || {}));
      }
    });
  },

  /**
   * Reply back to Dealer Apps
   * @param msg
   * @param id
   */
  broadcastToDealerApp: (msg = null, id = null) => {
    let client;

    if (!WS_SERVER) { console.log("\033[31<<< WEB SOCKET NOT INITIALIZED >>>", "\033[0m"); return; }
    if (!msg) { console.log("\033[31Invalid Reply Message", "\033[0m"); return; }
    if (!id) { console.log("\033[31Invalid Dealer ID", "\033[0m"); return; }

    if (_.isUndefined(dealerApps[id])) { console.log("\033[33m[WARNING] Invalid Dealer Connection", "\033[0m"); return; }

    client = dealerApps[id].app;

    if (client.readyState === WEB_SOCKET.OPEN) {
      client.send(JSON.stringify(msg));
    }
  },

  defaultTableInfo: () => {
    return {
      id: null,
      name: "",
      tableNumber: "",
      code: "",
      subcode: "",
      maxtime: "",
      videoUrl : {
        china: "",
        sea: "",
        nea: ""
      },
      status: "disconnected",
      game: {},
      road: [],
      extendable: false,
      dealer: { rid: "", name: "", bday:"", height:"", stats:"", hobbies:"", imageClassic: "",  imageGrand: "",  imagePrestige: "", imageManbetx: "" },
      shoeGame: "",
      totalResult: ""
    }
  }
};
