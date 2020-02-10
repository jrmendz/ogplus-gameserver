let rules = {
  /*
  __________                                                __
  \______   \_____     ____   ____  _____  _______ _____  _/  |_
   |    |  _/\__  \  _/ ___\_/ ___\ \__  \ \_  __ \\__  \ \   __\
   |    |   \ / __ \_\  \___\  \___  / __ \_|  | \/ / __ \_|  |
   |______  /(____  / \___  >\___  >(____  /|__|   (____  /|__|
          \/      \/      \/     \/      \/             \/
   */
  baccarat: (pCards, bCards, cb) => {
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
    if (!_.isEmpty(gameError)) return cb(null, gameError);

    if (_.includes([8,9], bSet1) || _.includes([8,9], pSet1)){
      if (!_.isUndefined(pCard3)) gameError.player = "3rd_card_not_required";
      if (!_.isUndefined(bCard3)) gameError.banker = "3rd_card_not_required";
      if (!_.isEmpty(gameError)) return cb(null, gameError);

      bFinal = bSet1;
      pFinal = pSet1;
    } else if (_.includes([0,1,2,3,4,5], pSet1)) {
      pFinal = p3rdCard;
      if (_.isUndefined(pCard3)) {
        gameError.player = "3rd_card_missing";
        return cb(null, gameError);
      }

      if (_.includes([0,1,2], bSet1)) {
        if (_.isUndefined(bCard3)) {
          gameError.banker = "3rd_card_missing";
          return cb(null, gameError);
        }
        bFinal =  b3rdCard;
      }
      else if (bSet1 === 3) {
        if (pCard3 === 8) {
          bFinal = bSet1;
        }
        else {
          if (_.isUndefined(bCard3)) {
            gameError.banker = "3rd_card_missing";
            return cb(null, gameError);
          }
          bFinal = b3rdCard;
        }
      }
      else if (bSet1 === 4) {
        if (_.includes([0,1,8,9], pCard3)) {
          if (!_.isUndefined(bCard3)) {
            gameError.banker = "3rd_card_not_required";
            return cb(null, gameError);
          }
          bFinal =  bSet1;
        }
        else {
          if (_.isUndefined(bCard3)) {
            gameError.banker = "3rd_card_missing";
            return cb(null, gameError);
          }
          bFinal = b3rdCard;
        }
      }
      else if (bSet1 === 5) {
        if (_.includes([0,1,2,3,8,9], pCard3)) {
          if (!_.isUndefined(bCard3)){
            gameError.banker = "3rd_card_not_required";
            return cb(null, gameError);
          }
          bFinal = bSet1;
        }
        else {
          if (_.isUndefined(bCard3)) {
            gameError.banker = "3rd_card_missing";
            return cb(null, gameError);
          }
          bFinal = b3rdCard;
        }
      }
      else if (bSet1 === 6) {
        if (!_.includes([6,7], pCard3)) {
          if (!_.isUndefined(bCard3)){
            gameError.banker = "3rd_card_not_required";
            return cb(null, gameError);
          }
          bFinal = bSet1;
        }
        else {
          if (_.isUndefined(bCard3)) {
            gameError.banker = "3rd_card_missing";
            return cb(null, gameError);
          }
          bFinal = b3rdCard;
        }
      }
      else if (bSet1 === 7) {
        if (!_.isUndefined(bCard3)) {
          gameError.banker = "3rd_card_not_required";
          return cb(null, gameError);
        }
        bFinal = bSet1;
      }
    }
    else {
      pFinal = pSet1;
      if (!_.isUndefined(pCard3)) {
        gameError.player = "3rd_card_not_required";
        return cb(null,gameError);
      }
      else if (_.includes([0,1,2], bSet1)) {
        if (_.isUndefined(bCard3)) {
          gameError.banker = "3rd_card_missing";
          return cb(null, gameError);
        }
        bFinal = b3rdCard;
      }
      else if (bSet1 === 3) {
        if (_.isUndefined(bCard3)) {
          gameError.banker = "3rd_card_missing";
          return cb(null, gameError);
        }
        bFinal = b3rdCard;
      }
      else if (bSet1 === 4) {
        if (_.includes([0,1,8,9], pSet1)) {
          bFinal = bSet1;
        }
        else {
          if (_.isUndefined(bCard3)) {
            gameError.banker = "3rd_card_missing";
            return cb(null, gameError);
          }
          bFinal = b3rdCard;
        }
      }
      else if (bSet1 === 5) {
        if (_.includes([0,1,2,3,8,9], pSet1)) {
          bFinal = bSet1;
        }
        else {
          if (_.isUndefined(bCard3)) {
            gameError.banker = "3rd_card_missing";
            return cb(null, gameError);
          }
          bFinal = b3rdCard;
        }
      }
      else if (bSet1 === 6) {
        if (_.includes([6,7], pSet1)) {
          if (!_.isUndefined(pCard3)) {
            gameError.banker = "3rd_card_not_required";
            return cb(null, gameError);
          }
          bFinal = bSet1;
        }
        else {
          if (_.isUndefined(bCard3)) {
            gameError.banker = "3rd_card_missing";
            return cb(null, gameError);
          }
          bFinal = b3rdCard;
        }
      }
      else if (bSet1 === 7) {
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
    if (pFinal === bFinal) {
      winResult.push('tie');
    }

    if (b1 === b2) {
      winResult.push('banker_pair');
    }
    if (p1 === p2) {
      winResult.push('player_pair');
    }
    if ((bFinal > pFinal) && (bFinal === 6)) {
      winResult.push('super_six');
    }

    // Return result
    return cb(null, winResult.join());
  },

  /*
  ________                                                 ___________.__
  \______ \ _______ _____     ____    ____    ____         \__    ___/|__|  ____    ____ _______
   |    |  \\_  __ \\__  \   / ___\  /  _ \  /    \   ______ |    |   |  | / ___\ _/ __ \\_  __ \
   |    `   \|  | \/ / __ \_/ /_/  >(  <_> )|   |  \ /_____/ |    |   |  |/ /_/  >\  ___/ |  | \/
  /_______  /|__|   (____  /\___  /  \____/ |___|  /         |____|   |__|\___  /  \___  >|__|
          \/             \//_____/               \/                      /_____/       \/
   */
  dragontiger: (dVal = {}, tVal = {}, tableNo = "", type = "", cb) => {
    let gameError = {};
    let suits = ["D", "C", "H", "S"];
    let dCardVal = dVal.value;
    let tCardVal = tVal.value;
    let dCardSuit = _.toUpper(dVal.card).slice(-1);
    let tCardSuit = _.toUpper(tVal.card).slice(-1);

    // Validators
    if (!tableNo) return cb("Invalid Parameter: [tableNo]");

    if (_.isUndefined(dCardVal)) gameError.dragon = "dragon_card_missing";
    if (_.isUndefined(tCardVal)) gameError.tiger = "tiger_card_missing";
    if (!_.isEmpty(gameError)) return cb(gameError);
    if (tCardVal > dCardVal) return cb(null, "tiger");
    else if (dCardVal > tCardVal) return cb(null, "dragon");
    else {
      if (!type) return cb("Invalid Parameter: [type]");

      if (_.isEqual(_.toLower(type), "new")) {
        return cb(null, "tie");
      } else {
        let dSuitVal = suits.indexOf(dCardSuit);
        let tSuitVal = suits.indexOf(tCardSuit);

        if (tSuitVal > dSuitVal) return cb(null, "tiger");
        else if (dSuitVal > tSuitVal) return cb(null, "dragon");
        return cb(null, "tie");
      }
    }
  },

  /*
     _____                                           .__                    .__
    /     \    ____    ____    ____  ___.__.__  _  __|  |__    ____   ____  |  |
   /  \ /  \  /  _ \  /    \ _/ __ \<   |  |\ \/ \/ /|  |  \ _/ __ \_/ __ \ |  |
  /    Y    \(  <_> )|   |  \\  ___/ \___  | \     / |   Y  \\  ___/\  ___/ |  |__
  \____|__  / \____/ |___|  / \___  >/ ____|  \/\_/  |___|  / \___  >\___  >|____/
          \/              \/      \/ \/                   \/      \/     \/
   */
  moneywheel: function (values, cb) {
    if (!values || !values.length) return cb("incomplete_input");

    _.map(values, (value) => {
      if (!_.includes(["1", "2", "5", "10", "20", "og", "x3"], value)) {
        return cb("invalid_input");
      }
    });

    if (_.last(values) === "x3") return cb("incomplete_input");
    return cb(null, _.last(values));
  }
};


module.exports = rules;
