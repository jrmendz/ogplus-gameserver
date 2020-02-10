module.exports = {
  connections: {
    adapter: 'mysql',
    host: 'localhost',
    port: '3306',
    user: 'root', // optional
    password: '', // optional
    database: 'panda_dev', //optional
  },
  cache: {
    prefix: "cache:",
    ttl: 7200,
    adapter: "redis",
    host: "localhost",
    password: "",
    port: 6379,
    db: 1 // Should not be the same as Game Server and Athens DB number
  },
  athens: 'http://localhost:8001/',
  gameCode: {
    baccarat: 1,
    dragontiger: 2,
    moneywheel: 4,
    roulette: 5
  },
  studio: "prestige"
};
