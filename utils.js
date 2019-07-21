const axios = require("axios");
const athleteTokens = require("./routes/auth").AthleteTokens;

const fetchActivity = async (activityId, athleteId) => {
  if (athleteId in athleteTokens.Tokens) {
    let {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt
    } = {
      ...athleteTokens.Tokens[athleteId]
    };

    // check whether the athlete token is expired :
    if (expiresAt < new Date() / 1000) {
      // if expired
      const newAccessToken = await refreshTokenFunc(athleteId, refreshToken);
      // update the athlete token collection
      accessToken = newAccessToken;
    }

    try {
      const response = await axios.get(
        `https://www.strava.com/api/v3/activities/${activityId}`,
        {
          headers: { Authorization: "Bearer " + accessToken }
        }
      );
      return response;
    } catch (e) {
      console.log(e.message);
      return null;
    }
  }
};

const refreshTokenFunc = async (athleteId, refreshToken) => {
  const stravaResponse = await axios.post(
    `https://www.strava.com/oauth/token`,
    {
      grant_type: "refresh_token",
      client_id: 563,
      client_secret: process.env.CLIENT_SECRET,
      refresh_token: refreshToken
    }
  );
  const data = stravaResponse.data;
  const {
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    expires_at: newExpiresAt
  } = { ...data };

  athleteTokens.addOrUpdateToken({
    id: athleteId,
    refresh_token: newRefreshToken,
    access_token: newAccessToken,
    expires_at: newExpiresAt
  });

  return newAccessToken;
};

module.exports.fetchActivity = fetchActivity;
module.exports.refreshToken = refreshTokenFunc;
