 module.exports = GameServiceInterface;

function GameServiceInterface(service) {
  this.service = service;
}

GameServiceInterface.prototype.processInput = function(params, done) {
  this.service.processInput(params, done);
};

GameServiceInterface.prototype.updateStatus = function(params, done) {
  this.service.updateStatus(params, done);
};

GameServiceInterface.prototype.setTimer = function(params, done) {
  this.service.setTimer(params, done);
};

GameServiceInterface.prototype.updateDealerInfo = function(params, done) {
  this.service.updateDealerInfo(params, done);
};

GameServiceInterface.prototype.updateShoeGame = function(params, done) {
  this.service.updateShoeGame(params, done);
};

GameServiceInterface.prototype.calculatePayout = function(params, done) {
  this.service.calculatePayout(params, done);
};

GameServiceInterface.prototype.savePayout = function(params, done) {
  this.service.savePayout(params, done);
};

GameServiceInterface.prototype.setCards = function(params, done) {
  this.service.setCards(params, done);
};

GameServiceInterface.prototype.roadVideo = function(params, done) {
  this.service.roadVideo(params, done);
};
