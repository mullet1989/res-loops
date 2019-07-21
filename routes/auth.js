const express = require("express");
const router = express.Router();
const axios = require("axios");

class AthleteTokens {
  constructor(props) {
    this._tokens = {};
  }
  get Tokens() {
    return this._tokens;
  }
  addOrUpdateToken({
    id,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt
  }) {
    this._tokens[id] = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt
    };
  }
}

const athleteTokens = new AthleteTokens();

router.get("/", async (req, res, next) => {
  const code = req.query.code;
  try {
    const r = await axios.post("https://www.strava.com/oauth/token", {
      client_id: 563,
      client_secret: process.env.CLIENT_SECRET,
      code: code,
      grant_type: "authorization_code"
    });

    const accessToken = r.data["access_token"];
    const refreshToken = r.data["refresh_token"];
    const expiresAt = r.data["expires_at"];
    const athlete = r.data.athlete;
    const { id } = { ...athlete };

    // update this
    athleteTokens.addOrUpdateToken({
      id: id,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt
    });

    res.send(accessToken);
  } catch (e) {
    console.log(e);
  }
});

module.exports = router;
module.exports.AthleteTokens = athleteTokens;
