const cache = require("../helpers/cache");
const config = require("../../config/baccarat");
const moment = require("moment");
const envConfig = require('../../config/env/' + appEnvironment)
const req = require('request')
module.exports = Baccarat;

function Baccarat() {}

/***********************
 * Process Input Card
 ***********************/
Baccarat.prototype.processInput = (params, cb) => {
  const playerCards = params.data.cards.player;
  const bankerCards = params.data.cards.banker;
  const shoeDate = params.data.shoeDate;
  const tableNumber = params.table;
  let tasks = {
    playerCardValues: (next) => {
      for (let i in playerCards) {
        playerCards[i + "value"] = cardValue(playerCards[i]);
        if (_.isEmpty(playerCards[i + "value"]) && playerCards[i] !== "") {
          console.error("invalid card : %s", playerCards[i]);
          return next("invalid_card");
        }
      }
      return next(null, playerCards);
    },
    bankerCardValues: (next) => {
      for (let i in bankerCards) {
        bankerCards[i + "value"] = cardValue(bankerCards[i]);
        if (_.isEmpty(bankerCards[i + "value"]) && bankerCards[i] !== "") {
          console.error("invalid card : %s", bankerCards[i]);
          return next("invalid_card");
        }
      }
      return next(null, bankerCards);
    },
    checkWinner: ["playerCardValues", "bankerCardValues", (results, next) => {
      const pCards = results.playerCardValues;
      const bCards = results.bankerCardValues;
      checkWinner(pCards, bCards, (err, result) => {
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
      console.log('gameResult@getResultList', gameResult);
      ResultList.findOne({ results: gameResult }, (err, resultlist) => {
        console.log('resultlist@getResultList', resultlist);
        return next(err, resultlist);
      });
    }],
    saveResult: ["getShoeHand","getTableNo", "getResultList", (results, next) => {
      const shoeHand = results.getShoeHand;
      const tableNo = results.getTableNo;
      const cacheKey = "result_" + tableNumber
      const resultList = results.getResultList;
      console.log('resultList@saveResult', resultList);

      const resultData = {
        idTableNo: tableNo.id,
        idShoeHand: shoeHand.id,
        idResultList: resultList.id,
        shoeDate: shoeDate,
      }
      console.log('resultData@saveResult', resultData);

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
      const pCards = results.playerCardValues;
      const bCards = results.bankerCardValues;
      const playerCards = [];
      const bankerCards = [];

      playerCards.push(pCards.card1);
      playerCards.push(pCards.card2);
      playerCards.push(pCards.card3);
      bankerCards.push(bCards.card1);
      bankerCards.push(bCards.card2);
      bankerCards.push(bCards.card3);

      const gameValue = {
        values: {
          playerCards: playerCards.join(),
          bankerCards: bankerCards.join()
        },
        gameType: envConfig.gameCode['baccarat'],
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
        let data = result || {totalResult: {player: 0, banker: 0, tie: 0, bankerPair: 0, playerPair: 0}};
        if (_.startsWith(gameResult, "banker")) data.totalResult.banker++;
        if (_.startsWith(gameResult, "player")) data.totalResult.player++;
        if (_.startsWith(gameResult, "tie")) data.totalResult.tie++;
        if (_.includes(gameResult, "banker_pair")) data.totalResult.bankerPair++;
        if (_.includes(gameResult, "player_pair")) data.totalResult.playerPair++;

        cache.set(cacheKeyTotal, data, 60 * 60 * 24, (err, result) => {});
        tables[tableNumber].totalResult = data.totalResult;
        return next();
      });
    }],
    cacheRoad: ["saveResult", (results, next) => {
      const pCards = results.playerCardValues;
      const bCards = results.bankerCardValues;
      const winner = results.checkWinner;
      const cacheKeyRoad = "road_" + tableNumber;
      const playerCards = [];
      const bankerCards = [];

      playerCards.push(pCards.card1);
      playerCards.push(pCards.card2);
      playerCards.push(pCards.card3);
      bankerCards.push(bCards.card1);
      bankerCards.push(bCards.card2);
      bankerCards.push(bCards.card3);

      cache.get(cacheKeyRoad, (err, result) => {
        let data = result || {road: []};
        const roundData = {
          shoeGame: tables[tableNumber].shoeGame,
          result: winner,
          cards: {
            player: playerCards.join(),
            banker: bankerCards.join(),
          },
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
    const player = results.playerCardValues;
    const banker = results.bankerCardValues;
    if (err && err != "invalid_card") return cb({error:err, cards: {player, banker}});
    if (err) return cb({error:err});
    return cb({result: results.checkWinner, cards: {player, banker}});
  });
}

/***********************
 * Set Card to Broadcast
 ***********************/
Baccarat.prototype.setCards = (params, cb) => {
  const playerCards = params.data.cards.player;
  const bankerCards = params.data.cards.banker;
  const result = params.data.result;
  const tableNumber = params.table;

  const tasks = {
    playerCardValues: (next) => {
      for (let i in playerCards) {
        playerCards[i + "value"] = cardValue(playerCards[i]);
        if (_.isEmpty(playerCards[i + "value"]) && playerCards[i] !== "") {
          console.error("invalid card : %s", playerCards[i]);
          return next("invalid_card");
        }
      }
      return next(null, playerCards);
    },
    bankerCardValues: (next) => {
      for (let i in bankerCards) {
        bankerCards[i + "value"] = cardValue(bankerCards[i]);
        if (_.isEmpty(bankerCards[i + "value"]) && bankerCards[i] !== "") {
          console.error("invalid card : %s", bankerCards[i]);
          return next("invalid_card");
        }
      }
      return next(null, bankerCards);
    }
  }

  async.auto(tasks, (err, results) => {
    if (err) return cb({error:err});
    const tableData = {
      cards: {
        player: results.playerCardValues,
        banker: results.bankerCardValues
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
Baccarat.prototype.updateStatus = (params, cb) => {
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
Baccarat.prototype.setTimer = (params, cb) => {
  const timer = params.data;
  const tableNumber = params.table;

  tables[tableNumber].game = { timer };
  return cb({});
}

/***********************
 * Send Dealer Info
 ***********************/
Baccarat.prototype.updateDealerInfo = (params, cb) => {
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
Baccarat.prototype.updateShoeGame = (params, cb) => {
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
      cache.set(cacheKeyTotal, {totalResult: { player:0, banker:0, tie:0, bankerPair:0, playerPair:0 }}, 60 * 60 * 24, (err, result) => {});
      return next();
    }],
    updateTableDetails: ["checkShoe", (results, next) => {
      tables[tableNumber].totalResult = { player:0, banker:0, tie:0, bankerPair:0, playerPair:0 };
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
const checkWinner = (pCards, bCards, cb) => {
  const p1 = pCards.card1.slice(0, -1);
  const p2 = pCards.card2.slice(0, -1);
  const b1 = bCards.card1.slice(0, -1);
  const b2 = bCards.card2.slice(0, -1);

  const pCard1 = pCards.card1value.value;
  const pCard2 = pCards.card2value.value;
  const pCard3 = pCards.card3value.value;
  const bCard1 = bCards.card1value.value;
  const bCard2 = bCards.card2value.value;
  const bCard3 = bCards.card3value.value;

  const pSet1 = (pCards.card1value.value + pCards.card2value.value)%10;
  const bSet1 = (bCards.card1value.value + bCards.card2value.value)%10;
  const p3rdCard = (pSet1 + pCards.card3value.value)%10;
  const b3rdCard = (bSet1 + bCards.card3value.value)%10;

  const gameError = {};
  let pFinal;
  let bFinal;

  if (_.isUndefined(pCard1) || _.isUndefined(pCard2)) gameError.player = "incomplete_card_pair";
  if (_.isUndefined(bCard1) || _.isUndefined(bCard2)) gameError.banker = "incomplete_card_pair";
  if (!_.isEmpty(gameError)) return cb(gameError);

  if (_.includes([8,9], bSet1) || _.includes([8,9], pSet1)){
    if (!_.isUndefined(pCard3)) gameError.player = "3rd_card_not_required";
    if (!_.isUndefined(bCard3)) gameError.banker = "3rd_card_not_required";
    if (!_.isEmpty(gameError)) return cb(gameError);

    bFinal = bSet1;
    pFinal = pSet1;
  }
  else if (_.includes([0,1,2,3,4,5], pSet1)) {
    pFinal = p3rdCard;
    if (_.isUndefined(pCard3)) {
      gameError.player = "3rd_card_missing";
      return cb(gameError);
    }

    if (_.includes([0,1,2], bSet1)) {
      if (_.isUndefined(bCard3)) {
        gameError.banker = "3rd_card_missing";
        return cb(gameError);
      }
      bFinal =  b3rdCard;
    }
    else if (bSet1 == 3) {
      if (pCard3 == 8) {
        bFinal = bSet1;
      }
      else {
        if (_.isUndefined(bCard3)) {
          gameError.banker = "3rd_card_missing";
          return cb(gameError);
        }
        bFinal = b3rdCard;
      }
    }
    else if (bSet1 == 4) {
      if (_.includes([0,1,8,9], pCard3)) {
        if (!_.isUndefined(bCard3)) {
          gameError.banker = "3rd_card_not_required";
          return cb(gameError);
        }
        bFinal =  bSet1;
      }
      else {
        if (_.isUndefined(bCard3)) {
          gameError.banker = "3rd_card_missing";
          return cb(gameError);
        }
        bFinal = b3rdCard;
      }
    }
    else if (bSet1 == 5) {
      if (_.includes([0,1,2,3,8,9], pCard3)) {
        if (!_.isUndefined(bCard3)){
          gameError.banker = "3rd_card_not_required";
          return cb(gameError);
        }
        bFinal = bSet1;
      }
      else {
        if (_.isUndefined(bCard3)) {
          gameError.banker = "3rd_card_missing";
          return cb(gameError);
        }
        bFinal = b3rdCard;
      }
    }
    else if (bSet1 == 6) {
      if (!_.includes([6,7], pCard3)) {
        if (!_.isUndefined(bCard3)){
          gameError.banker = "3rd_card_not_required";
          return cb(gameError);
        }
        bFinal = bSet1;
      }
      else {
        if (_.isUndefined(bCard3)) {
          gameError.banker = "3rd_card_missing";
          return cb(gameError);
        }
        bFinal = b3rdCard;
      }
    }
    else if (bSet1 == 7) {
      if (!_.isUndefined(bCard3)) {
        gameError.banker = "3rd_card_not_required";
        return cb(gameError);
      }
      bFinal = bSet1;
    }
  }
  else {
    pFinal = pSet1;
    if (!_.isUndefined(pCard3)) {
      gameError.player = "3rd_card_not_required";
      return cb(gameError);
    }
    else if (_.includes([0,1,2], bSet1)) {
      if (_.isUndefined(bCard3)) {
        gameError.banker = "3rd_card_missing";
        return cb(gameError);
      }
      bFinal = b3rdCard;
    }
    else if (bSet1 == 3) {
      if (_.isUndefined(bCard3)) {
        gameError.banker = "3rd_card_missing";
        return cb(gameError);
      }
      bFinal = b3rdCard;
    }
    else if (bSet1 == 4) {
      if (_.includes([0,1,8,9], pSet1)) {
        bFinal = bSet1;
      }
      else {
        if (_.isUndefined(bCard3)) {
          gameError.banker = "3rd_card_missing";
          return cb(gameError);
        }
        bFinal = b3rdCard;
      }
    }
    else if (bSet1 == 5) {
      if (_.includes([0,1,2,3,8,9], pSet1)) {
        bFinal = bSet1;
      }
      else {
        if (_.isUndefined(bCard3)) {
          gameError.banker = "3rd_card_missing";
          return cb(gameError);
        }
        bFinal = b3rdCard;
      }
    }
    else if (bSet1 == 6) {
      if (_.includes([6,7], pSet1)) {
        if (!_.isUndefined(pCard3)) {
          gameError.banker = "3rd_card_not_required";
          return cb(gameError);
        }
        bFinal = bSet1;
      }
      else {
        if (_.isUndefined(bCard3)) {
          gameError.banker = "3rd_card_missing";
          return cb(gameError);
        }
        bFinal = b3rdCard;
      }
    }
    else if (bSet1 == 7) {
      bFinal = bSet1;
    }
  }

  const winResult = [];
  if (bFinal > pFinal) {
    winResult.push('banker');
  }
  if (pFinal > bFinal) {
    winResult.push('player');
  }
  if (pFinal == bFinal) {
    winResult.push('tie');
  }

  if (b1 == b2) {
    winResult.push('banker_pair');
  }
  if (p1 == p2) {
    winResult.push('player_pair');
  }
  if ((bFinal > pFinal) && (bFinal == 6)) {
    winResult.push('super_six');
  }
  return cb(null, winResult.join());
}

/***********************
 * Calculate Payout
 ***********************/
Baccarat.prototype.calculatePayout = (params, cb) => {
  const shoeHandNumber = params.data.shoeGame;
  const shoeDate = params.data.shoeDate;
  const tableNumber = params.table;
  const gameSet = params.data.gameSet;
  const cacheKey = "result_" + tableNumber
  // ####################### ATHENS API #######################
  const opts = {
    url: envConfig.athens + 'transaction/payout',
    body: {shoeDate, gameSet, tableNumber, cacheKey, gameType: 'baccarat', tableNumber},
    json: true
  }
  req.post(opts, (err, response, body) => {
    if (err) { console.log('Baccarat@calculatePayout - Error: ' + err) }
    return cb()
  })
  // ####################### ATHENS API #######################
}

/***********************
 * Set Road Snippet
 ***********************/
Baccarat.prototype.roadVideo = (params, cb) => {
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
    case "JD": case "JH": case "JS": case "JC":
    case "QD": case "QH": case "QS": case "QC":
    case "KD": case "KH": case "KS": case "KC":
      data = {
        value: 0
      };
      break;
  }
  return data;
}

function isPositive(s) {
  return /^\+?[1-9][\d]*$/.test(s);
}
