const express = require("express");
const router = express.Router();
const axios = require("axios");

router.get("/", (req, res, next) => {
  const code = req.query.code;
  axios
    .post("https://www.strava.com/oauth/token", {
      client_id: 563,
      client_secret: process.env.CLIENT_SECRET,
      code: code,
      grant_type: "authorization_code"
    })
    .then(r => {
      res.send(r.data.athlete);
    })
    .catch(res => console.log(res));
});

module.exports = router;
