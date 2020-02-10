/*
 *  Game Service Factory
 */
const GameServiceInterface = require("./game-service-interface");
const Baccarat = require("./games/baccarat");
const DragonTiger = require("./games/dragontiger");
const Roulette = require("./games/roulette");
const MoneyWheel = require("./games/moneywheel");

module.exports = {
  create: (game) => {
    var service = null;
    switch(game) {
      case "baccarat": {
        service = new Baccarat();
        break;
      }
      case "dragontiger": {
        service = new DragonTiger();
        break;
      }
      case "roulette": {
        service = new Roulette();
        break;
      }
      case "moneywheel": {
        service = new MoneyWheel();
        break;
      }
    }
    return service ? new GameServiceInterface(service) : null;
  }
};
