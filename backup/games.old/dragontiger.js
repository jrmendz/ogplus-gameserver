const cache = require("../helpers/cache");
const config = require("../../config/dragontiger");
const moment = require("moment");
const envConfig = require('../../config/env/' + appEnvironment)
const req = require('request')

module.exports = DragonTiger;

function DragonTiger() {}

/***********************
 * Process Input Card
 ***********************/
DragonTiger.prototype.processInput = (params, cb) => {
  const dragon = params.data.cards.dragon;
  const tiger = params.data.cards.tiger;
  const shoeDate = params.data.shoeDate;
  const tableNumber = params.table;

  let tasks = {
    dragonValue: (next) => {
      let dragonVal = cardValue(dragon);
      if (_.isEmpty(dragonVal) && dragon !== "") {
        console.error("invalid card : %s", dragonVal);
        return next("invalid_card");
      }
      return next(null, dragonVal);
    },
    tigerValue: (next) => {
      let tigerVal = cardValue(tiger);
      if (_.isEmpty(tigerVal) && tiger !== "") {
        console.error("invalid card : %s", tigerVal);
        return next("invalid_card");
      }
      return next(null, tigerVal);
    },
    checkWinner: ["dragonValue", "tigerValue", (results, next) => {
      const dVal = results.dragonValue;
      const tVal = results.tigerValue;
      checkWinner({value: dVal.value, card: dragon}, {value: tVal.value, card: tiger}, tableNumber, (err, result) => {
        return next(err, result);
      });
    }],
    getShoeHand: ["checkWinner", (results, next) => {
      if (tables[tableNumber].shoeGame) {
        ShoeHand.findOne({ shoehandnumber: tables[tableNumber].shoeGame }, (err,result) => {
          return next(err, result);
        });
      } else {
        console.log('no shoe')
      }
    }],
    getTableNo: ["checkWinner", (results, next) => {
      TableNo.findOne({ tableNumber }, (err, result) => {
        return next(err, result);
      });
    }],
    getResultList: ["checkWinner", (results, next) => {
      const gameResult = results.checkWinner;
      ResultList.findOne({ results: gameResult }, (err, result) => {
        return next(err, result);
      });
    }],
    saveResult: ["getShoeHand","getTableNo", "getResultList", (results, next) => {
      const shoeHand = results.getShoeHand;
      const tableNo = results.getTableNo;
      const cacheKey = "result_" + tableNumber
      const resultList = results.getResultList;

      const resultData = {
        idTableNo: tableNo.id,
        idShoeHand: shoeHand.id,
        idResultList: resultList.id,
        shoeDate: shoeDate
      }

      Result.create(resultData, (err, savedResult) => {
        if (err) { res.serverError(err) }
        cache.set(cacheKey, savedResult, 60 * 60 * 24, (err, result) => {
          console.log('ResultId: ' + savedResult.id + ' inserted!')
          return next(err, savedResult);
        });
      });
    }],
    saveCardValues: ["saveResult", (results, next) => {
      const gameResult = results.saveResult;

      const gameValue = {
        values: {
          dragonCards: dragon,
          tigerCards: tiger
        },
        gameType: envConfig.gameCode['dragontiger'],
        resultId: gameResult.id
      }

      GameValue.create(gameValue, (err, savedGameValue) => {
        return next(err)
      })
    }],
    cacheTotal: ["saveResult", (results, next) => {
      const gameResult = results.checkWinner;
      const cacheKeyTotal = "total_" + tableNumber;

      cache.get(cacheKeyTotal, (err, result) => {
        let data = result || {totalResult: {dragon: 0, tiger: 0, tie: 0}};
        if (gameResult == "dragon") data.totalResult.dragon++;
        if (gameResult == "tiger") data.totalResult.tiger++;
        if (gameResult == "tie") data.totalResult.tie++;

        cache.set(cacheKeyTotal, data, 60 * 60 * 24, (err, result) => {});
        tables[tableNumber].totalResult = data.totalResult;
        return next();
      });
    }],
    cacheRoad: ["saveResult", (results, next) => {
      const winner = results.checkWinner;
      const cacheKeyRoad = "road_" + tableNumber;

      cache.get(cacheKeyRoad, (err, result) => {
        let data = result || {road: []};
        const roundData = {
          shoeGame: tables[tableNumber].shoeGame,
          result: winner,
          cards: { dragon, tiger },
          videoUrl: ""
        }

        data.road.push(roundData);
        cache.set(cacheKeyRoad, data, 60 * 60 * 24, (err, result) => {});
        tables[tableNumber].road = data.road;
        return next();
      });
    }]
  };

  async.auto(tasks, (err, results) => {
    if (err && err != "invalid_card") return cb({error:err, cards: { dragon, tiger }});
    if (err) return cb({error:err});
    return cb({result: results.checkWinner, cards: { dragon, tiger }});
  });
}

/***********************
 * Set Card to Broadcast
 ***********************/
DragonTiger.prototype.setCards = (params, cb) => {
  const dragon = params.data.cards.dragon;
  const tiger = params.data.cards.tiger;
  const result = params.data.result;
  const tableNumber = params.table;

  const tasks = {
    dragonValue: (next) => {
      let dVal = cardValue(dragon);
      if (_.isEmpty(dVal) && dragon !== "") {
        console.error("invalid card : %s", dragon);
        return next("invalid_card");
      }
      return next(null, dVal);
    },
    tigerValue: (next) => {
      let tVal = cardValue(tiger);
      if (_.isEmpty(tVal) && tiger !== "") {
       console.error("invalid card : %s", tiger);
       return next("invalid_card");
      }
      return next(null, tVal);
    }
  };

  async.auto(tasks, (err, results) => {
    if (err) return cb({error:err});
    const tableData = {
      cards: {
        dragon: dragon,
        tiger: tiger,
        dragonValue: results.dragonValue,
        tigerValue: results.tigerValue
      },
      result: result
    }
    tables[tableNumber].game = tableData;
    return cb({});
  });
}

/***********************
 * Update Table Status
 ***********************/
DragonTiger.prototype.updateStatus = (params, cb) => {
  const status = params.data;
  const tableNumber = params.table;

  if (_.startsWith(_.toLower(status), "betting")) {
    tables[tableNumber].status = "betting";
    // Execute Good Tips Calculation
    req.post( {
      headers: {'content-type' :  'application/x-www-form-urlencoded'},
      url: envConfig.athens + 'getGoodTips/',
      body: 'params=' + JSON.stringify({ tableNumber }, null, ' '),
    }, function (err){
      if (err) { console.log('Error: ' + err) }
    })
  }
  else if (_.startsWith(_.toLower(status), "no more")) tables[tableNumber].status = "dealing";
  else if (_.startsWith(_.toLower(status), "shuffle")) tables[tableNumber].status = "shuffling";
  else if (_.startsWith(_.toLower(status), "squeeze")) tables[tableNumber].status = _.toLower(status);
  else tables[tableNumber].status = "default";

  // Reset RoadMap if status is shuffling
  if (tables[tableNumber].status === "shuffling") {
    cache.set("road_" + tableNumber, {road: []}, 60 * 60 * 24,function (err) {
      console.log(err ? err : 'Table ' + tableNumber + ' resetting road map');
    })
  }

  return cb({});
}

/***********************
 * Send Countdown Timer
 ***********************/
DragonTiger.prototype.setTimer = (params, cb) => {
  const timer = params.data;
  const tableNumber = params.table;

  tables[tableNumber].game = { timer };
  return cb({});
}

/***********************
 * Send Dealer Info
 ***********************/
DragonTiger.prototype.updateDealerInfo = (params, cb) => {
  const dealer = params.data;
  const tableNumber = params.table;
  dealer.name = dealer.nickname;
  delete dealer.nickname;

  tables[tableNumber].dealer = dealer;
  return cb({});
}

/***********************
 * Send Shoe Game
 ***********************/
DragonTiger.prototype.updateShoeGame = (params, cb) => {
  const shoeGame = params.data;
  const tableNumber = params.table;
  const cacheKeyRoad = "road_" + tableNumber;
  const cacheKeyTotal = "total_" + tableNumber;
  const cacheShoeHand = "shoehand_" + tableNumber;

  var tasks = {
    checkShoe: (next) => {
      let pShoe = _.split(tables[tableNumber].shoeGame, '-')[0];
      let nShoe = _.split(shoeGame, '-')[0];

      if (pShoe == "") {
        cache.get(cacheShoeHand, (err, value) => {
          if (!value || value != nShoe) return next();
          return next("end");
        })
      } else {
        if (pShoe == nShoe && pShoe != "") return next("end");
        return next();
      }
    },
    deleteRoadCache: ["checkShoe", (results, next) => {
      cache.set(cacheShoeHand, shoeGame, 60 * 60 * 24, (err, result) => {});
      cache.set(cacheKeyRoad, {road: []}, 60 * 60 * 24, (err, result) => {});
      return next();
    }],
    deleteResultCache: ["checkShoe", (results, next) => {
      cache.set(cacheKeyTotal, {totalResult: { dragon:0, tiger:0, tie:0 }}, 60 * 60 * 24, (err, result) => {});
      return next();
    }],
    updateTableDetails: ["checkShoe", (results, next) => {
      tables[tableNumber].totalResult = { dragon:0, tiger:0, tie:0 };
      tables[tableNumber].road = [];
      return next();
    }]
  };

  async.auto(tasks, (err, result) => {
    tables[tableNumber].shoeGame = shoeGame;
    return cb({});
  });
}

/***********************
 * Game Logic
 ***********************/
const checkWinner = (dVal, tVal, tableNo, cb) => {
  const gameError = {};

  let dCardVal = dVal.value;
  let tCardVal = tVal.value;
  let dCardSuit = _.toUpper(dVal.card).slice(-1);
  let tCardSuit = _.toUpper(tVal.card).slice(-1);

  if (_.isUndefined(dCardVal)){
      gameError.dragon = "dragon_card_missing";
  }
  if (_.isUndefined(tCardVal)){
      gameError.tiger = "tiger_card_missing";
  }
  if (!_.isEmpty(gameError)) {
      return cb(gameError);
  }

  if (tCardVal > dCardVal) return cb(null, "tiger");
  else if (dCardVal > tCardVal) return cb(null, "dragon");
  else {
    if (_.includes(["C10", "G9", "P6", "P7", "P10", "P11"], tableNo)) {
      return cb(null, "tie");
    } else {
      const suits = ["D", "C", "H", "S"];
      let dSuitVal = suits.indexOf(dCardSuit);
      let tSuitVal = suits.indexOf(tCardSuit);

      if (tSuitVal > dSuitVal) return cb(null, "tiger");
      else if (dSuitVal > tSuitVal) return cb(null, "dragon");
      return cb(null, "tie");
    }
  }
}

/***********************
 * Calculate Payout
 ***********************/
DragonTiger.prototype.calculatePayout = (params, cb) => {
  const shoeHandNumber = params.data.shoeGame;
  const shoeDate = params.data.shoeDate;
  const gameSet = params.data.gameSet;
  const tableNumber = params.table;
  const cacheKey = "result_" + tableNumber
  // ####################### ATHENS API #######################
  const opts = {
    url: envConfig.athens + 'transaction/payout',
    body: {shoeDate, gameSet, tableNumber, cacheKey, gameType: 'dragontiger'},
    json: true
  }
  req.post(opts, (err, response, body) => {
    if (err) { console.log('DragonTiger@calculatePayout - Error: ' + err) }
    return cb()
  })
  // ####################### ATHENS API #######################
}

/***********************
 * Set Road Snippet
 ***********************/
DragonTiger.prototype.roadVideo = (params, cb) => {
  const shoeGame = params.data.shoeGame;
  const videoUrl = params.data.url;
  const tableNumber = params.table;
  const cacheKey = "road_" + tableNumber;

  let tasks = {
    getRoadCache: (next) => {
      cache.get(cacheKey, (err, result) => {
        return next(err, result);
      });
    },
    updateRoadUrl: ["getRoadCache", (results, next) => {
      const road = results.getRoadCache.road || [];
      for(let i=road.length-1; i>=0; i--) {
        if (road[i].shoeGame == shoeGame) {
          road[i].videoUrl = videoUrl;
          break;
        }
      }
      return next(null, road);
    }],
    updateCache: ["updateRoadUrl", (results, next) => {
      const updatedRoad = results.updateRoadUrl;
      cache.set(cacheKey, {road: updatedRoad}, 60 * 60 * 24, (err, result) => {
        tables[tableNumber].road = updatedRoad;
        return next();
      });
    }],

    // START: This will be depreciated on future release
    bigRoad: ["updateCache", function (results, next) {
      const token = "DzyebTTPOc"
      req.post( {
        headers: {'content-type' :  'application/x-www-form-urlencoded'},
        url: envConfig.athens + 'roadmaps/',
        body: 'params=' + JSON.stringify({tableNumber, token}, null, ' '),
      }, function (err, response, body){
        if (err) { console.log('Error: ' + err) }
        return next();
      })
    }]
    // END: This will be depreciated on future release
  };

  async.auto(tasks, (err, results) => {
    return cb();
  });
}

/***********************
 * Get Card Value
 ***********************/
const cardValue = (card) => {
  const cardCode = _.toUpper(card);
  let data = {};
  switch(cardCode) {
    case "AD": case "AH": case "AS": case "AC":
      data = {
        value: 1
      };
      break;
    case "2D": case "2H": case "2S": case "2C":
      data = {
        value: 2
      };
      break;
    case "3D": case "3H": case "3S": case "3C":
      data = {
        value: 3
      };
      break;
    case "4D": case "4H": case "4S": case "4C":
      data = {
        value: 4
      };
      break;
    case "5D": case "5H": case "5S": case "5C":
      data = {
        value: 5
      };
      break;
    case "6D": case "6H": case "6S": case "6C":
      data = {
        value: 6
      };
      break;
    case "7D": case "7H": case "7S": case "7C":
      data = {
        value: 7
      };
      break;
    case "8D": case "8H": case "8S": case "8C":
      data = {
        value: 8
      };
      break;
    case "9D": case "9H": case "9S": case "9C":
      data = {
        value: 9
      };
      break;
    case "10D": case "10H": case "10S": case "10C":
    data = {
      value: 10
    };
    break;
    case "JD": case "JH": case "JS": case "JC":
    data = {
      value: 11
    };
    break;
    case "QD": case "QH": case "QS": case "QC":
    data = {
      value: 12
    };
    break;
    case "KD": case "KH": case "KS": case "KC":
      data = {
        value: 13
      };
      break;
  }
  return data;
}

function isPositive(s) {
  return /^\+?[1-9][\d]*$/.test(s);
}
