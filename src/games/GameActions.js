const HTTP = require('request');
const CACHE = require("../helpers/cache");
const PAYOUT = require("./GamePayouts");
const GAME_RULE = require("./GameRules");
const GAME_VALUES = require("./GameValues");
const ENV = require('../../config/env/' + appEnvironment);
const GAME = gameNow;

let Game = {};

/*
__________                                                 .___                          __
\______   \_______   ____    ____   ____    ______  ______ |   |  ____  ______   __ __ _/  |_
 |     ___/\_  __ \ /  _ \ _/ ___\_/ __ \  /  ___/ /  ___/ |   | /    \ \____ \ |  |  \\   __\
 |    |     |  | \/(  <_> )\  \___\  ___/  \___ \  \___ \  |   ||   |  \|  |_> >|  |  / |  |
 |____|     |__|    \____/  \___  >\___  >/____  >/____  > |___||___|  /|   __/ |____/  |__|
                                \/     \/      \/      \/            \/ |__|
    Process Input Card
 */
Game.processInput = (params, cb) => {
  let playerCards, bankerCards, dragon, tiger, values;
  let shoeDate = params.data.shoeDate;
  let tableNumber = params.table;
  let gameResult = {};
  let tasks, addTask;

  // Validators
  if (_.isUndefined(shoeDate))    return cb({ error: "Invalid parameter: [shoeDate]"});
  if (_.isUndefined(tableNumber)) return cb({ error: "Invalid parameter: [tableNumber]"});

  // Tasks
  tasks = {
    // Generate total counters per result types
    totalCounter: ["checkWinner", (results, next) => {
      let gameResult = results.checkWinner;
      let cacheKeyTotal = "total_" + tableNumber;

      CACHE.get(cacheKeyTotal, (err, result) => {
        let data = {};

        if (err) {
          console.log(new Error(err));
          return next(err);
        }
          // Baccarat Caching Totals
        if (_.isEqual(GAME, 'baccarat')) {
          data = result || { totalResult: { player: 0, banker: 0, tie: 0, bankerPair: 0, playerPair: 0 } };
          if (_.startsWith(gameResult, "banker")) data.totalResult.banker++;
          if (_.startsWith(gameResult, "player")) data.totalResult.player++;
          if (_.startsWith(gameResult, "tie")) data.totalResult.tie++;
          if (_.includes(gameResult, "banker_pair")) data.totalResult.bankerPair++;
          if (_.includes(gameResult, "player_pair")) data.totalResult.playerPair++;

          // Dragon-Tiger Caching Totals
        } else if (_.isEqual(GAME, 'dragontiger')) {
          data = result || { totalResult: { dragon: 0, tiger: 0, tie: 0 } };
          if (gameResult === "dragon") data.totalResult.dragon++;
          if (gameResult === "tiger") data.totalResult.tiger++;
          if (gameResult === "tie") data.totalResult.tie++;

          // Moneywheel Caching Totals
        } else if (_.isEqual(GAME, 'moneywheel')) {
          data = result || { totalResult: { "1": 0, "2": 0, "5": 0, "10": 0, "20": 0, "og": 0 } };
          if (gameResult === "1") data.totalResult["1"]++;
          if (gameResult === "2") data.totalResult["2"]++;
          if (gameResult === "5") data.totalResult["5"]++;
          if (gameResult === "10") data.totalResult["10"]++;
          if (gameResult === "20") data.totalResult["20"]++;
          if (gameResult === "og") data.totalResult["og"]++;
        }

        CACHE.set(cacheKeyTotal, data, 60 * 60 * 24, (err, result) => {
          if (err) {
            console.log(new Error(err));
            return next(err, result);
          }

          tables[tableNumber].totalResult = data.totalResult;
          return next(err, data);
        });
      });
    }],
    // Generate road
    road: ["checkWinner", (results, next) => {
      let winner = results.checkWinner;
      let cacheKeyRoad = "road_" + tableNumber;
      let roundData;

      // Validators
      if (_.isUndefined(winner)) return next("Invalid Parameter: [winner]");
      if (_.isUndefined(tableNumber)) return next("Invalid Parameter: [tableNumber]");
      if (_.isUndefined(tables[tableNumber].shoeGame)) return next("Invalid Parameter: [shoeGame]");

      // Pre-defined data
      roundData = {
        shoeGame: tables[tableNumber].shoeGame,
        result: winner,
        cards: {},
        values: [],
        videoUrl: ""
      };

      if (_.isEqual(GAME, 'baccarat')) { // Baccarat Card Setting
        let pCards = results.playerCardValues;
        let bCards = results.bankerCardValues;
        let pCardJoin = [ pCards.card1, pCards.card2, pCards.card3 ].join();
        let bCardJoin = [ bCards.card1, bCards.card2, bCards.card3 ].join();

        roundData.cards = {
          player: pCardJoin,
          banker: bCardJoin
        };
        gameResult = {
          playerCards: pCardJoin,
          bankerCards: bCardJoin
        };

      } else if (_.isEqual(GAME, 'dragontiger')) { // Dragon-Tiger Card Setting
        roundData.cards = { dragon, tiger };
        gameResult = {
          dragonCards: dragon,
          tigerCards: tiger
        };
      } else if (_.isEqual(GAME, 'moneywheel')) { // Moneywheel Values Setting
        roundData.values = values;
        gameResult = { values: _.join(values, ',') };
      }

      CACHE.get(cacheKeyRoad, (err, result) => {
        let data;

        if (err) return next(err);

        data = result || { road: [] };
        data.road.push(roundData);

        CACHE.set(cacheKeyRoad, data, 60 * 60 * 24, (err) => {
          if (err) return next(err);

          tables[tableNumber].road = data.road;
          return next(err, roundData);
        });
      });
    }]
  };

  /*
  __________                                                __
  \______   \_____     ____   ____  _____  _______ _____  _/  |_
   |    |  _/\__  \  _/ ___\_/ ___\ \__  \ \_  __ \\__  \ \   __\
   |    |   \ / __ \_\  \___\  \___  / __ \_|  | \/ / __ \_|  |
   |______  /(____  / \___  >\___  >(____  /|__|   (____  /|__|
          \/      \/      \/     \/      \/             \/
          Additional Tasks
   */
  if (_.isEqual(GAME, 'baccarat')) {
    playerCards = params.data.cards.player;
    bankerCards = params.data.cards.banker;

    // Baccarat additional game validators
    if (_.isUndefined(playerCards)) return cb({ error: "Invalid parameter: [playerCards]"});
    if (_.isUndefined(bankerCards)) return cb({ error: "Invalid parameter: [bankerCards]"});

    // Add Task
    addTask = {
      playerCardValues: (next) => {
        for (let i in playerCards) {
          playerCards[i + "value"] = GAME_VALUES.baccarat(playerCards[i]);
          if (_.isEmpty(playerCards[i + "value"]) && playerCards[i] !== "") {
            return next("INVALID_CARD: [Player]");
          }
        }
        return next(null, playerCards);
      },
      bankerCardValues: (next) => {
        for (let i in bankerCards) {
          bankerCards[i + "value"] = GAME_VALUES.baccarat(bankerCards[i]);
          if (_.isEmpty(bankerCards[i + "value"]) && bankerCards[i] !== "") {
            return next("INVALID_CARD: [Banker]");
          }
        }
        return next(null, bankerCards);
      },
      checkWinner: ["playerCardValues", "bankerCardValues", (results, next) => {
        const pCards = results.playerCardValues;
        const bCards = results.bankerCardValues;
        GAME_RULE.baccarat(pCards, bCards, next);
      }]
    };
    // Merge with main task
    _.assign(tasks, addTask);
  }

  /*
  ________                                                 ___________.__
  \______ \ _______ _____     ____    ____    ____         \__    ___/|__|  ____    ____ _______
   |    |  \\_  __ \\__  \   / ___\  /  _ \  /    \   ______ |    |   |  | / ___\ _/ __ \\_  __ \
   |    `   \|  | \/ / __ \_/ /_/  >(  <_> )|   |  \ /_____/ |    |   |  |/ /_/  >\  ___/ |  | \/
  /_______  /|__|   (____  /\___  /  \____/ |___|  /         |____|   |__|\___  /  \___  >|__|
          \/             \//_____/               \/                      /_____/       \/
          Additional Tasks
   */
  else if (_.isEqual(GAME, 'dragontiger')) {
    dragon = params.data.cards.dragon;
    tiger = params.data.cards.tiger;

    // Dragon-Tiger additional game validators
    if (_.isUndefined(dragon)) return cb({ error: "Invalid parameter: [dragon]"});
    if (_.isUndefined(tiger))  return cb({ error: "Invalid parameter: [tiger]"});

    addTask = {
      dragonValue: (next) => {
        let dragonVal = GAME_VALUES.dragontiger(dragon);
        if (_.isEmpty(dragonVal) && dragon !== "") {
          return next("INVALID_CARD: [Dragon]");
        }
        return next(null, dragonVal);
      },
      tigerValue: (next) => {
        let tigerVal =  GAME_VALUES.dragontiger(tiger);
        if (_.isEmpty(tigerVal) && tiger !== "") {
          return next("INVALID_CARD: [Tiger]");
        }
        return next(null, tigerVal);
      },
      checkWinner: ["dragonValue", "tigerValue", (results, next) => {
        const dVal = results.dragonValue;
        const tVal = results.tigerValue;
        GAME_RULE.dragontiger({ value: dVal.value, card: dragon }, { value: tVal.value, card: tiger }, tableNumber, params.data.dtType, next);
      }]
    };
    // Merge with main task
    _.assign(tasks, addTask);
  }

  /*
     _____                                           .__                    .__
    /     \    ____    ____    ____  ___.__.__  _  __|  |__    ____   ____  |  |
   /  \ /  \  /  _ \  /    \ _/ __ \<   |  |\ \/ \/ /|  |  \ _/ __ \_/ __ \ |  |
  /    Y    \(  <_> )|   |  \\  ___/ \___  | \     / |   Y  \\  ___/\  ___/ |  |__
  \____|__  / \____/ |___|  / \___  >/ ____|  \/\_/  |___|  / \___  >\___  >|____/
          \/              \/      \/ \/                   \/      \/     \/
          Additional Tasks
   */
  else if (_.isEqual(GAME, 'moneywheel')) {
    values = params.data.values;

    // Moneywheel additional game validators
    if (_.isUndefined(values)) return cb({ error: "Invalid parameter: [values]"});

    addTask = {
      checkWinner: (next) => {
        GAME_RULE.moneywheel(values, next);
      }
    };
    // Merge with main task
    _.assign(tasks, addTask);
  }

  // Execute task
  async.auto(tasks, (err, results) => {
    let resData = { cards: {}, values: [] };
    let otherData;

    if (err) return cb({ error:err }); // Error handling conditions

    // Initialization of data
    if(_.isEqual(GAME, 'baccarat')) {
      resData.cards = { player: playerCards, banker: bankerCards };
    } else if (_.isEqual(GAME, 'dragontiger')) {
      resData.cards = { dragon, tiger }
    } else if (_.isEqual(GAME, 'moneywheel')) {
      resData.values = values
    }

    otherData = {
      gameName: GAME,
      shoeDate,
      result: results.checkWinner,
      counter: results.totalCounter,
      roadPartial: results.road,
      gameResult
    };

    return cb(err, _.assign(otherData, resData));
  });
};

/*
  _________         __    _________                     .___
 /   _____/  ____ _/  |_  \_   ___ \ _____  _______   __| _/ ______
 \_____  \ _/ __ \\   __\ /    \  \/ \__  \ \_  __ \ / __ | /  ___/
 /        \\  ___/ |  |   \     \____ / __ \_|  | \// /_/ | \___ \
/_______  / \___  >|__|    \______  /(____  /|__|   \____ |/____  >
        \/      \/                \/      \/             \/     \/
    Set Card to Broadcast
 */

Game.setCards = (params, cb) => {
  let playerCards, bankerCards, dragon, tiger, values;
  let result = params.data.result;
  let tableNumber = params.table;
  let tasks = {}, addTasks = {};

  // Validators
  if (_.isUndefined(result))      return cb({ error: "Invalid parameter: [result]"});
  if (_.isUndefined(tableNumber)) return cb({ error: "Invalid parameter: [tableNumber]"});

  /*
  __________                                                __
  \______   \_____     ____   ____  _____  _______ _____  _/  |_
   |    |  _/\__  \  _/ ___\_/ ___\ \__  \ \_  __ \\__  \ \   __\
   |    |   \ / __ \_\  \___\  \___  / __ \_|  | \/ / __ \_|  |
   |______  /(____  / \___  >\___  >(____  /|__|   (____  /|__|
          \/      \/      \/     \/      \/             \/
   */
  if (_.isEqual(GAME, 'baccarat')) {
    playerCards = params.data.cards.player;
    bankerCards = params.data.cards.banker;

    // Baccarat game validators
    if (_.isUndefined(playerCards)) return cb({ error: "Invalid parameter: [playerCards]"});
    if (_.isUndefined(bankerCards)) return cb({ error: "Invalid parameter: [bankerCards]"});
    // Baccarat Tasks
    addTasks = {
      playerCardValues: (cb) => {
        for (let i in playerCards) {
          playerCards[i + "value"] = GAME_VALUES.baccarat(playerCards[i]);
          if (_.isEmpty(playerCards[i + "value"]) && playerCards[i] !== "") {
            console.log("Invalid Card : ", playerCards[i]);
            return cb("invalid_card");
          }
        }
        return cb(null, playerCards);
      },
      bankerCardValues: (cb) => {
        for (let i in bankerCards) {
          bankerCards[i + "value"] = GAME_VALUES.baccarat(bankerCards[i]);
          if (_.isEmpty(bankerCards[i + "value"]) && bankerCards[i] !== "") {
            console.error("Invalid Card: ", bankerCards[i]);
            return cb("invalid_card");
          }
        }
        return cb(null, bankerCards);
      },
      finalProcess: ["playerCardValues", "bankerCardValues", (arg, cb) => {
        return cb(null, {
          cards: {
            player: playerCards,
            banker: bankerCards
          },
          result: result
        });
      }]
    };
    // Merge with main tasks
    _.assign(tasks, addTasks);

  /*
  ________                                                 ___________.__
  \______ \ _______ _____     ____    ____    ____         \__    ___/|__|  ____    ____ _______
   |    |  \\_  __ \\__  \   / ___\  /  _ \  /    \   ______ |    |   |  | / ___\ _/ __ \\_  __ \
   |    `   \|  | \/ / __ \_/ /_/  >(  <_> )|   |  \ /_____/ |    |   |  |/ /_/  >\  ___/ |  | \/
  /_______  /|__|   (____  /\___  /  \____/ |___|  /         |____|   |__|\___  /  \___  >|__|
          \/             \//_____/               \/                      /_____/       \/
   */
  } else if (_.isEqual(GAME, 'dragontiger')) {
    dragon = params.data.cards.dragon;
    tiger = params.data.cards.tiger;

    // Dragon-Tiger game validators
    if (_.isUndefined(dragon))  return cb({ error: "Invalid parameter: [dragon]" });
    if (_.isUndefined(tiger))   return cb({ error: "Invalid parameter: [tiger]" });
    // Dragon-Tiger Tasks
    addTasks = {
      dragonValue: (cb) => {
        let dVal = GAME_VALUES.dragontiger(dragon);
        if (_.isEmpty(dVal) && dragon !== "") {
          console.error("Invalid Card : ", dragon);
          return cb("invalid_card");
        }
        return cb(null, dVal);
      },
      tigerValue: (cb) => {
        let tVal = GAME_VALUES.dragontiger(tiger);
        if (_.isEmpty(tVal) && tiger !== "") {
          console.error("Invalid Card : ", tiger);
          return cb("invalid_card");
        }
        return cb(null, tVal);
      },
      finalProcess: ["dragonValue", "tigerValue", (arg, cb) => {
        return cb(null, {
          cards: {
            dragon: dragon,
            tiger: tiger,
            dragonValue: arg.dragonValue,
            tigerValue: arg.tigerValue
          },
          result: result
        });
      }]
    };
    // Merge with main tasks
    _.assign(tasks, addTasks);

  /*
     _____                                           .__                    .__
    /     \    ____    ____    ____  ___.__.__  _  __|  |__    ____   ____  |  |
   /  \ /  \  /  _ \  /    \ _/ __ \<   |  |\ \/ \/ /|  |  \ _/ __ \_/ __ \ |  |
  /    Y    \(  <_> )|   |  \\  ___/ \___  | \     / |   Y  \\  ___/\  ___/ |  |__
  \____|__  / \____/ |___|  / \___  >/ ____|  \/\_/  |___|  / \___  >\___  >|____/
          \/              \/      \/ \/                   \/      \/     \/
   */
  } else if (_.isEqual(GAME, 'moneywheel')) {
    values = params.data.values;

    // Moneywheel game validators
    if (_.isUndefined(values))  return cb({ error: "Invalid parameter: [values]" });
    // Moneywheel Tasks
    addTasks = {
      valuesCheck: (next) => {
        let isEnded = false;

        if (!values || !values.length) return cb({ error:"incomplete_input" });

        for (let value of values) {
          if (isEnded) return cb({ error:"invalid_input" });
          if (!_.includes(["1", "2", "5", "10", "20", "og", "x3"], value)) return cb({ error:"invalid_input" });
          if (_.includes(["1", "2", "5", "10", "20", "og"], value)) isEnded = true
        }

        if (result && _.last(values) === "x3") return cb({ error:"incomplete_input" });

        return next(null, { values: values.join(), result: result });
      },
      finalProcess: ["valuesCheck", (arg, cb) => {
        return cb(null, arg.valuesCheck);
      }]
    };
    // Merge with main tasks
    _.assign(tasks, addTasks);
  }

  // Execute tasks
  async.auto(tasks, (err, results) => {
    if (err) return cb({ error: err });
    // Assign values to global variable
    tables[tableNumber].game = results.finalProcess;
    console.log("\033[32m[" + tableNumber + "]", 'Partial result(s) has been broadcast.', "\033[0m");
    return cb(err, {
      totalResult: tables[tableNumber].totalResult,
      game: results.finalProcess
    });
  });
};

  /*
   ____ ___             .___         __              _________  __            __
  |    |   \______    __| _/_____  _/  |_   ____    /   _____/_/  |_ _____  _/  |_  __ __  ______
  |    |   /\____ \  / __ | \__  \ \   __\_/ __ \   \_____  \ \   __\\__  \ \   __\|  |  \/  ___/
  |    |  / |  |_> >/ /_/ |  / __ \_|  |  \  ___/   /        \ |  |   / __ \_|  |  |  |  /\___ \
  |______/  |   __/ \____ | (____  /|__|   \___  > /_______  / |__|  (____  /|__|  |____//____  >
            |__|         \/      \/            \/          \/             \/                  \/
    Update Table Status
 */
Game.updateStatus = (params, cb) => {
  let status = params.data;
  let tableNumber = params.table;
  let tableStatus;

  // Validators
  if (_.isUndefined(status))      return cb("Invalid Parameter: [status]");
  if (_.isUndefined(tableNumber)) return cb("Invalid Parameter: [tableNumber]");

  tableStatus = tables[tableNumber].status;

  // Baccarat & Dragon-Tiger
  if (_.includes(['baccarat', 'dragontiger'], GAME)) {
    if (_.startsWith(_.toLower(status), "betting")) tableStatus = "betting";
    else if (_.startsWith(_.toLower(status), "no more")) tableStatus = "dealing";
    else if (_.startsWith(_.toLower(status), "shuffle")) tableStatus = "shuffling";
    else if (_.startsWith(_.toLower(status), "squeeze")) tableStatus = _.toLower(status);
    else tableStatus = "default";

    // Reset RoadMap if status is shuffling
    if (tableStatus === "shuffling") {
      // Reset global variable road map
      tables[tableNumber].road = [];
      CACHE.set("road_" + tableNumber, { road: [] }, 60 * 60 * 24, function (err) {
        console.log(err ? err : 'Table ' + tableNumber + ' resetting road map.');
      });
    }
  }
  // Moneywheel
  else if (_.isEqual(GAME, 'moneywheel')) {
    if (_.startsWith(_.toLower(status), "betting"))       tableStatus = "betting";
    else if (_.startsWith(_.toLower(status), "no more"))  tableStatus = "dealing";
    else tableStatus = "default";
  }

  console.log("\033[36m[" + tableNumber + "] INFO: Status is", tableStatus.toUpperCase(), "\033[0m");
  return cb(null, { status: tableStatus, gameType: GAME });
};

  /*
  ___________.__
  \__    ___/|__|  _____    ____ _______
    |    |   |  | /     \ _/ __ \\_  __ \
    |    |   |  ||  Y Y  \\  ___/ |  | \/
    |____|   |__||__|_|  / \___  >|__|
                       \/      \/
      Send Countdown Timer
   */
Game.setTimer = (params, cb) => {
  let timer = params.data;
  let tableNumber = params.table;
  // Validators
  if (_.isUndefined(timer))       return cb("Invalid Parameter: [timer]");
  if (_.isUndefined(tableNumber)) return cb("Invalid Parameter: [tableNumber]");

  tables[tableNumber].game = { timer };
  return cb(null, { game: { timer } });
};

  /*
  ________                   .__                   .___          _____
  \______ \    ____  _____   |  |    ____ _______  |   |  ____ _/ ____\____
   |    |  \ _/ __ \ \__  \  |  |  _/ __ \\_  __ \ |   | /    \\   __\/  _ \
   |    `   \\  ___/  / __ \_|  |__\  ___/ |  | \/ |   ||   |  \|  | (  <_> )
  /_______  / \___  >(____  /|____/ \___  >|__|    |___||___|  /|__|  \____/
          \/      \/      \/            \/                   \/
     Send Dealer Info
   */
Game.updateDealerInfo = (params, cb) => {
  let dealer = params.data;
  let tableNumber = params.table;
  let cacheKeyLoc, cacheKeyLastDealer;

  // Validator
  if (_.isUndefined(dealer))      return cb("Invalid Parameter: [dealer]");
  if (_.isUndefined(tableNumber)) return cb("Invalid Parameter: [tableNumber]");

  // Variable Initiation
  cacheKeyLoc = "dealer_" + dealer.rid + "_tblLocation";
  cacheKeyLastDealer = "dealer_" + tableNumber;
  dealer.name = dealer.nickname;
  delete dealer.nickname;


  // Tasks
  async.parallel([
    (cb) => {
      CACHE.set(cacheKeyLoc, tableNumber, 60 * 60 * 24, cb);
    },
    (cb) => {
      CACHE.set(cacheKeyLastDealer, dealer, 60 * 60 * 24, cb);
    },
    (cb) => {
      Dealer
        .findOne({ dealerscode: dealer.rid })
        .exec((err, theDealer) => {
          if (err) {
            console.log(err);
            return cb("Error")
          }
          _.assign(dealer, {
            languages: _.isUndefined(theDealer) ? 'en' : theDealer.languages,
            imageClassic: theDealer.imageclassic,
            imageGrand: theDealer.imagegrand,
            imagePrestige: theDealer.imageprestige,
            imagestreamer: theDealer.imagestreamer,
            name: theDealer.nickname
          });
          return cb()
        })
    }
  ], (err) => {
    if (err) return cb(err);

    console.log("\033[36m[" + tableNumber + "] INFO: Dealer information cached.", "\033[0m");
    console.log("\033[36m[" + tableNumber + "] INFO: Dealer has been seated. [", dealer.name, "@", dealer.rid, "]\033[0m");
    tables[tableNumber].dealer = dealer;
    return cb(err, { dealer });
  });
};

  /*
    _________.__                      ___ ___                      .___
   /   _____/|  |__    ____    ____  /   |   \ _____     ____    __| _/
   \_____  \ |  |  \  /  _ \ _/ __ \/    ~    \\__  \   /    \  / __ |
   /        \|   Y  \(  <_> )\  ___/\    Y    / / __ \_|   |  \/ /_/ |
  /_______  /|___|  / \____/  \___  >\___|_  / (____  /|___|  /\____ |
          \/      \/              \/       \/       \/      \/      \/
      Send Shoe Game
   */
Game.updateShoeGame = (params, cb) => {
  let shoeGame = params.data;
  let tableNumber = params.table;
  let tasks, cacheKeyRoad, cacheKeyTotal, cacheShoeHand;

  // Validators
  if (_.isUndefined(shoeGame))    return cb("Invalid Parameter: [shoeGame]");
  if (_.isUndefined(tableNumber)) return cb("Invalid Parameter: [tableNumber]");

  // Initializing variables
  cacheKeyRoad = "road_" + tableNumber;
  cacheKeyTotal = "total_" + tableNumber;
  cacheShoeHand = "shoehand_" + tableNumber;

  // Task lists
  tasks = {
    // Shoe Validation
    checkShoe: (cb) => {
      // let pShoe = _.split(tables[tableNumber].shoeGame, '-')[0];
      // let nShoe = _.split(shoeGame, '-')[0];
      //
      // if (_.split(shoeGame, '-')[1] === "1") return cb(); // Execute reset shoe if shoe-round starts with 1
      //
      // // If the local shoeHand is invalid get it from cache
      // if (!pShoe) {
      //   CACHE.get(cacheShoeHand, (err, value) => {
      //     if (err) return cb(err); // Return error
      //     if (!value) return cb(); // Execute reset shoe if cache shoeHand is invalid
      //
      //     pShoe = _.split(value, '-')[0];
      //
      //     if (pShoe !== nShoe)  return cb(); // Execute reset shoe if cache shoeHand is invalid
      //     return cb(null, "SKIP_RESET"); // Skip reset
      //   })
      // } else {
      //   // Check if the previous shoe is equal to new shoe and previous shoe is valid then skip reset
      //   if (pShoe !== nShoe) return cb(); // Execute reset shoe if cache shoeHand is invalid
      //   return cb(null, "SKIP_RESET"); // Skip reset
      // }
      return cb()
    },
    // Re-setting cache info
    deleteCache: ["checkShoe", (arg, cb) => {
      let cacheData;

      // Check if the round is 1 reset and clear cached data or if the game is roulette and shoeGame is 1
      if (_.includes(["roulette", "moneywheel"], GAME)) {
        if (shoeGame.toString() !== "1") {
          console.log("\033[36m[" + tableNumber + "] INFO: Reset shoe SKIPPED.", "\033[0m");
          return cb();
        }
      } else {
        if (shoeGame.split("-")[1] !== "1") {
          console.log("\033[36m[" + tableNumber + "] INFO: Reset shoe SKIPPED.", "\033[0m");
          return cb();
        }
      }

      // Set default total result
      switch (GAME) {
        case "baccarat":    cacheData = { totalResult: { player: 0, banker: 0, tie: 0, bankerPair: 0, playerPair: 0 } }; break;
        case "dragontiger": cacheData = { totalResult: { dragon: 0, tiger: 0, tie: 0 } }; break;
        case "moneywheel":  cacheData = { totalResult: { "1": 0, "2": 0, "5": 0, "10": 0, "20": 0, "og": 0 } }; break;
        case "roulette":    cacheData = { totalResult: { } }; break;
      }

      tables[tableNumber].totalResult = cacheData;

      // Clear data result cache
      async.series([
        (cb) => {
          CACHE.set(cacheShoeHand, shoeGame, 60 * 60 * 24, cb);
        },
        (cb) => {
          CACHE.set(cacheKeyRoad, { road: [] }, 60 * 60 * 24, cb);
        },
        (cb) => {
          CACHE.set(cacheKeyTotal, cacheData, 60 * 60 * 24, cb);
        }
      ], (err) => {
        if (err) return cb(err);
        console.log("\033[36m[" + tableNumber + "] INFO: Successfully reset cached shoe, roads, and totals.", "\033[0m");
        return cb();
      });
    }],
  };

  // Execute tasks
  async.auto(tasks, (err) => {
    if (err) return cb(err);

    console.log("\033[36m[" + tableNumber + "] INFO: New ShoeHand. [", shoeGame, "]\033[0m");
    // Update local variable
    tables[tableNumber].shoeGame = shoeGame;
    return cb(err, { shoeGame, gameType: GAME });
  });
};

  /*
  __________                                 __
  \______   \_____   ___.__.  ____   __ __ _/  |_
   |     ___/\__  \ <   |  | /  _ \ |  |  \\   __\
   |    |     / __ \_\___  |(  <_> )|  |  / |  |
   |____|    (____  // ____| \____/ |____/  |__|
                  \/ \/
      Calculate Payout (API to Athens Server)
   */
Game.calculatePayout = (params, cb) => {
  let shoeGame = params.data.shoeGame;
  let shoeDate = params.data.shoeDate;
  let gameType = GAME;
  let tableNumber = params.table;

  if (_.isUndefined(shoeGame))    return cb("Invalid Parameter: [shoeGame]");
  if (_.isUndefined(shoeDate))    return cb("Invalid Parameter: [shoeDate]");
  if (_.isUndefined(tableNumber)) return cb("Invalid Parameter: [tableNumber]");

  console.log("\033[33m[" + tableNumber + "] INFO: Send payout flag to subscriber.", "\033[0m");
  console.log("\033[33m[" + tableNumber + "] PAYOUT DATA: [", shoeGame, shoeDate, gameType, tableNumber, "]\033[0m");

  return cb(null, { shoeGame, shoeDate, gameType, tableNumber });
};

/*
  __________                    .___ ____   ____.__     .___
  \______   \  ____ _____     __| _/ \   \ /   /|__|  __| _/ ____   ____
   |       _/ /  _ \\__  \   / __ |   \   Y   / |  | / __ |_/ __ \ /  _ \
   |    |   \(  <_> )/ __ \_/ /_/ |    \     /  |  |/ /_/ |\  ___/(  <_> )
   |____|_  / \____/(____  /\____ |     \___/   |__|\____ | \___  >\____/
          \/             \/      \/                      \/     \/
    Set Road Snippet
 */
Game.roadVideo = (params, cb) => {
  let shoeGame = params.data.shoeGame;
  let videoUrl = params.data.url;
  let tableNumber = params.table;
  let tasks, cacheKey;

  // Validators
  if (_.isUndefined(shoeGame))    return cb("Invalid Parameter: [shoeGame]");
  if (_.isUndefined(videoUrl))    return cb("Invalid Parameter: [videoUrl]");
  if (_.isUndefined(tableNumber)) return cb("Invalid Parameter: [tableNumber]");

  cacheKey = "road_" + tableNumber;

  tasks = {
    getRoadCache: (cb) => {
      CACHE.get(cacheKey, cb);
    },
    updateRoadUrl: ["getRoadCache", (arg, cb) => {
      let road = arg.getRoadCache ? arg.getRoadCache.road : [];
      for(let i = road.length - 1; i >= 0; i--) {
        if (road[i].shoeGame === shoeGame) {
          road[i].videoUrl = videoUrl;
          break;
        }
      }
      tables[tableNumber].road = road;
      // Update cache road
      CACHE.set(cacheKey, { road: road }, 60 * 60 * 24, cb);
    }]
  };

  // Execute tasks
  async.auto(tasks, (err, result) => {
    if (err) return cb(err);
    return cb(err, { road: result.updateRoadUrl });
  });
};


Game.updateTableInfo = (params, cb) => {
  let toUpdateOnPlayer = {};

  TableNo
    .find({ studio: ENV.studio || "" })
    .exec((err, data) => {
      if (err) return cb(err);

      // Loop through data
      _.map(data, (table) => {
        let tbl = tables[table.tableNumber];
        let update
        // Validator
        if (_.isUndefined(tbl)) return 0;

        update = {
          name: table.gameName,
          code: table.code,
          subcode: table.subcode,
          videoUrl: {
            china: table.chinaVideoUrl,
            sea: table.seaVideoUrl,
            nea: table.neaVideoUrl
          }
        };

        // Update the existing data
        _.merge(tbl, update);

        // Format data needed on front-end
        _.assign(toUpdateOnPlayer, {
          [table.tableNumber]: update
        })
      });

      return cb(null, { tables: toUpdateOnPlayer });
    });
};

module.exports = Game;
