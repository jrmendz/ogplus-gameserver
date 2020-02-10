module.exports =  {
  /*
  __________                                                __
  \______   \_____     ____   ____  _____  _______ _____  _/  |_
   |    |  _/\__  \  _/ ___\_/ ___\ \__  \ \_  __ \\__  \ \   __\
   |    |   \ / __ \_\  \___\  \___  / __ \_|  | \/ / __ \_|  |
   |______  /(____  / \___  >\___  >(____  /|__|   (____  /|__|
          \/      \/      \/     \/      \/             \/
   */
  baccarat: function (card = "") {
    let cardCode = _.toUpper(card);
    let data = {};

    // Validations
    if (!card) return data;

    // Value conversion
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
  },
  /*
  ________                                                 ___________.__
  \______ \ _______ _____     ____    ____    ____         \__    ___/|__|  ____    ____ _______
   |    |  \\_  __ \\__  \   / ___\  /  _ \  /    \   ______ |    |   |  | / ___\ _/ __ \\_  __ \
   |    `   \|  | \/ / __ \_/ /_/  >(  <_> )|   |  \ /_____/ |    |   |  |/ /_/  >\  ___/ |  | \/
  /_______  /|__|   (____  /\___  /  \____/ |___|  /         |____|   |__|\___  /  \___  >|__|
          \/             \//_____/               \/                      /_____/       \/
   */
  dragontiger: function (card = "") {
    const cardCode = _.toUpper(card);
    let data = {};

    // Validations
    if (!card) return data;

    // Value conversion
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
  },
  /*
     _____                                           .__                    .__
    /     \    ____    ____    ____  ___.__.__  _  __|  |__    ____   ____  |  |
   /  \ /  \  /  _ \  /    \ _/ __ \<   |  |\ \/ \/ /|  |  \ _/ __ \_/ __ \ |  |
  /    Y    \(  <_> )|   |  \\  ___/ \___  | \     / |   Y  \\  ___/\  ___/ |  |__
  \____|__  / \____/ |___|  / \___  >/ ____|  \/\_/  |___|  / \___  >\___  >|____/
          \/              \/      \/ \/                   \/      \/     \/
   */
  moneywheel: function (card = "") {
    const cardCode = _.toUpper(card);
    let data = { value: -1 };

    // Validations
    if (!card) return data;

    return data;
  }
};
