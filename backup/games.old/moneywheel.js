const cache = require("../helpers/cache");
const config = require("../../config/moneywheel");
const moment = require("moment");
const envConfig = require('../../config/env/' + appEnvironment)
const req = require('request')

module.exports = MoneyWheel;

function MoneyWheel() {}

/***********************
 * Process Input Card
 ***********************/
MoneyWheel.prototype.processInput = (params, cb) => {
  const values = params.data.values;
  const shoeDate = params.data.shoeDate;
  const tableNumber = params.table;
  const createTime = moment().format('YYYY-MM-DD hh:mm:ss');

  let tasks = {
    checkWinner: (next) => {
      const isEnded = false;
      if (!values || values.length == 0) return next("incomplete_input")
      for (let value of values) {
        if (isEnded) return next("invalid_input")
        if (!_.includes(["1", "2", "5", "10", "20", "og", "x3"], value)) {
          if (true) isEnded = true
          return next("invalid_input")
        }
      }
      if (values[values.length - 1] == "x3") return next("incomplete_input")
      return next(null, values[values.length - 1]);
    },
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
    saveValues: ["saveResult", (results, next) => {
      const gameResult = results.saveResult
      const gameValue = {
        values: {
          values: values.join()
        },
        gameType: envConfig.gameCode['moneywheel'],
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
        let data = result || {totalResult: {"1": 0, "2": 0, "5": 0, "10": 0, "20": 0, "og": 0}};
        if (gameResult == "1") data.totalResult["1"]++;
        else if (gameResult == "2") data.totalResult["2"]++;
        else if (gameResult == "5") data.totalResult["5"]++;
        else if (gameResult == "10") data.totalResult["10"]++;
        else if (gameResult == "20") data.totalResult["20"]++;
        else if (gameResult == "og") data.totalResult["og"]++;

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
          values: values,
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
    if (err) return cb({error:err});
    return cb(null, {result: results.checkWinner, values});
  });
}

/***********************
 * Set Input to Broadcast
 ***********************/
MoneyWheel.prototype.setCards = (params, cb) => {
  const values = params.data.values;
  const result = params.data.result;
  const tableNumber = params.table;
  let isEnded = false;
  tables[tableNumber].game ={}

  if (!values || values.length == 0) return cb({error:"incomplete_input"})
  for (let value of values) {
    if (isEnded) return cb({error:"invalid_input"})
    if (!_.includes(["1", "2", "5", "10", "20", "og", "x3"], value)) return cb({error:"invalid_input"})
    if (_.includes(["1", "2", "5", "10", "20", "og"], value)) isEnded = true
  }
  if (result && values[values.length - 1] == "x3") return cb({error:"incomplete_input"})

  const tableData = {
    values: values.join(),
    result: result
  }
  tables[tableNumber].game = tableData;
  return cb({});
}

/***********************
 * Update Table Status
 ***********************/
MoneyWheel.prototype.updateStatus = (params, cb) => {
  const status = params.data;
  const tableNumber = params.table;

  if (_.startsWith(_.toLower(status), "betting")) tables[tableNumber].status = "betting";
  else if (_.startsWith(_.toLower(status), "no more")) tables[tableNumber].status = "dealing";
  else tables[tableNumber].status = "default";

  return cb({});
}

/***********************
 * Send Countdown Timer
 ***********************/
MoneyWheel.prototype.setTimer = (params, cb) => {
  const timer = params.data;
  const tableNumber = params.table;

  tables[tableNumber].game = { timer };
  return cb({});
}

/***********************
 * Send Dealer Info
 ***********************/
MoneyWheel.prototype.updateDealerInfo = (params, cb) => {
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
MoneyWheel.prototype.updateShoeGame = (params, cb) => {
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
      cache.set(cacheKeyTotal, {totalResult: {"1": 0, "2": 0, "5": 0, "10": 0, "20": 0, "og": 0}}, 60 * 60 * 24, (err, result) => {});
      return next();
    }],
    updateTableDetails: ["checkShoe", (results, next) => {
      tables[tableNumber].totalResult = {"1": 0, "2": 0, "5": 0, "10": 0, "20": 0, "og": 0};
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
 * Calculate Payout
 ***********************/
MoneyWheel.prototype.calculatePayout = (params, cb) => {
  const shoeHandNumber = params.data.shoeGame;
  const shoeDate = params.data.shoeDate;
  const tableNumber = params.table;
  const gameSet = params.data.gameSet;
  const cacheKey = "result_" + tableNumber
  // ####################### ATHENS API #######################
  const opts = {
    url: envConfig.athens + 'transaction/payout',
    body: {shoeHandNumber, shoeDate, gameSet, cacheKey, gameType: 'moneywheel', tableNumber},
    json: true
  }
  req.post(opts, (err, response, body) => {
    if (err) { console.log('MoneyWheel@calculatePayout - Error: ' + err) }
    return cb()
  })
  // ####################### ATHENS API #######################
}

/***********************
 * Set Road Snippet
 ***********************/
MoneyWheel.prototype.roadVideo = (params, cb) => {
  const shoeGame = params.data.shoeGame;
  const videoUrl = params.data.url;
  const tableNumber = params.table;
  const cacheKey = "road_" + tableNumber;

  let tasks = {
    getRoadCache: (next) => {
      cache.get(cacheKey, (err, result) => {
        return next(err, result.road);
      });
    },
    updateRoadUrl: ["getRoadCache", (results, next) => {
      const road = results.getRoadCache || [];
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
  };

  async.auto(tasks, (err, results) => {
    return cb();
  });
}

function isPositive(s) {
  return /^\+?[1-9][\d]*$/.test(s);
}
