class Player {
  constructor(id, name) {
    this.id = id; // the socket id
    this.name = name;
    this.score = 0;
    this.hasGuessed = false;
    this.ready = false;
    this.connected = true;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      score: this.score,
      hasGuessed: this.hasGuessed,
      ready: this.ready,
      connected: this.connected,
    };
  }
}

module.exports = Player;
