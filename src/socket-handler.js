const FUNCTION = require("./helpers/function");
const GAME_SOCKET_ACTIONS = require("./socket-actions");
let socketHandler = {};

/*
.___         .__   __   .__         .__   .__                  __   .__
|   |  ____  |__|_/  |_ |__|_____   |  |  |__|_____________  _/  |_ |__|  ____    ____
|   | /    \ |  |\   __\|  |\__  \  |  |  |  |\___   /\__  \ \   __\|  | /  _ \  /    \
|   ||   |  \|  | |  |  |  | / __ \_|  |__|  | /    /  / __ \_|  |  |  |(  <_> )|   |  \
|___||___|  /|__| |__|  |__|(____  /|____/|__|/_____ \(____  /|__|  |__| \____/ |___|  /
          \/                     \/                 \/     \/                        \/
 */
socketHandler.serverStart = (cb) => {
  // Validators
  if (!connConfigs.studio)
    return cb("Studio not specified on environment");

  // Commence Start Server
  async.series([
    // Load OG+ Tables
    (cb) => {
      console.log("Loading", _.toUpper(connConfigs.studio || "") ,"tables...");
      GAME_SOCKET_ACTIONS.loadTables(null, cb);
    },
    // Start WebSocket Listening
    (cb) => {

      WS_SERVER.on("connection", (ws, req) => {
        let URL = req.url;
        let server = FUNCTION.clientVerifier("serverApp", URL);
        let dealer = FUNCTION.clientVerifier("dealerApp", URL);

        // Check if the signature connection is for ServerApp.
        if (server) {
          GAME_SOCKET_ACTIONS.saveServerApp(ws, URL,(err, data) => {
            if (err) {
              ws.close();
              console.log("\033[31m<<< GAME SERVER CONNECTING ERROR >>>", "\033[0m");
              console.log("\033[31mREASON: ", err, "\033[0m");
            } else {
              console.log("\033[42m\033[30m<<< GAME SERVER [" + data.serverId + "] CONNECTED >>>", "\033[0m");
            }
          });
          // Check if the signature connection is for DealerApp.
        } else if (dealer) {
          GAME_SOCKET_ACTIONS.saveDealerApp(ws, URL, (err, data) => {
            if (err) {
              ws.close();
              console.log("\033[31m<<< DELAER-APP CONNECTING ERROR >>>", "\033[0m");
              console.log("\033[31mREASON: ", err, "\033[0m");
            } else {
              console.log("\033[42m\033[30m<<< DEALER-APP [", data.tableNumber, "] CONNECTED >>>", "\033[0m");
            }
          });
          // Otherwise close the connection
        } else {
          ws.send("Your connection is not authorized. Connection Closed.");
          ws.close();
          console.log("\033[31m<<< IN-BOUND SOCKET CONNECTION REJECTED >>>", "\033[0m");
          console.log("\033[31mConnection key not on list:", URL, "\033[0m");
        }

        ws.on("message", (data) => {
          if (server) {
            GAME_SOCKET_ACTIONS.serverAppHandling(ws, data, URL,(err) => {
              if (err) {
                console.log("\033[31m<<< SERVER APP REQUEST FAILED >>>", "\033[0m");
                console.log("\033[31mREASON: ", JSON.stringify(err), "\033[0m");
              }
            });
          } else if (dealer) {
            GAME_SOCKET_ACTIONS.dealerAppHandling(ws, data, URL, (err) => {
              if (err) {
                console.log("\033[31m<<< DEALER APP REQUEST FAILED >>>", "\033[0m");
                console.log("\033[31mREASON: ", JSON.stringify(err), "\033[0m");
              }
            });
          }
        });

        ws.on("close", () => {
          if (server) {
            GAME_SOCKET_ACTIONS.closeServerApp(ws, URL, (err, data) => {
              if (err) {
                console.log("\033[31m<<< CLOSING GAME SERVER CONNECTION ERROR >>>", "\033[0m");
                console.log("\033[31mREASON: ", JSON.stringify(err), "\033[0m");
              } else {
                console.log("\033[41m\033[37m<<< GAME SERVER [", data.serverID, "] DISCONNECTED >>>", "\033[0m");
              }
            });
          } else if (dealer) {
            GAME_SOCKET_ACTIONS.closeDealerApp(ws, URL, (err, data) => {
              if (err) {
                console.log("\033[31m<<< CLOSING DEALER-APP CONNECTION ERROR >>>", "\033[0m");
                console.log("\033[31mREASON: ", JSON.stringify(err), "\033[0m");
              } else {
                console.log("\033[41m\033[37m<<< DEALER-APP [", data.tableNumber, "] DISCONNECTED >>>", "\033[0m");
              }
            });
          }
        });

        ws.on("error", (err) => {
          ws.close();
          console.log("\033[31m<<< WEBSOCKET ERROR >>>", "\033[0m");
          console.log("\033[31mREASON: ", JSON.stringify(err), "\033[0m");
        });
      });

      // Welcome Message
      console.log("\033[46m\033[30m[" + _.toUpper(gameNow) + "]", "server started on port", gamePort, "\033[0m");

      return cb();
    }
  ], cb);
};

module.exports = socketHandler;
