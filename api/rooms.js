const {ROOMS, PRIVATE} = require('./_lib');
module.exports = (req, res) => {
  res.status(200).json(Object.keys(ROOMS).map(id => ({id, name: ROOMS[id], private: PRIVATE.has(id)})));
};
