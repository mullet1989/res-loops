const redis = require("redis");
const axios = require("axios");
const moment = require("moment");

const Keys = {
  ATHLETE: "athletes_",
};

class RedisDatabase {
  constructor(url = process.env.REDIS_URL) {
    try {
      this._client = redis.createClient(url);
    } catch (e) {
      process.exit(1);
    }

    this._client.on("error", e => {
      console.log(e);
      process.exit(1);
    });

    this._client.on("ready", () => {
      // console.log("REDIS CONNECTED");
    });
  }

  // clean up
  close() {
    this._client.quit((err, response) => {
      if (!err) {
        // console.log("REDIS DISCONNECTED");
      } else {
        console.log(err);
      }
    });
  }

  async addAthlete({ athlete, ...authResponse }, cb) {
    return new Promise(async (resolve, reject) => {
      // add id to the set
      const args = [Keys.ATHLETE, athlete.id];
      try {
        this._client.send_command("SADD", args, (err, response) => {
          if (err) {
            console.log(err);
          } else if (cb) {
            cb(response);
          }
        });
        // add athlete json as an object
        const composite = { ...athlete, ...authResponse };
        Object.keys(composite).forEach(
          key =>
            (composite[key] === null || composite[key] === "null") &&
            delete composite[key]
        );
        this._client.hmset(
          `athlete_${athlete.id}`,
          composite,
          (err, response) => {
            if (err) {
              console.log(err);
            } else if (cb) {
              cb(response);
            }
          }
        );
        resolve();
      } catch (e) {
        console.log(e);
        resolve();
      }
    });
  }

  async updateAthleteToken(athleteId, data) {
    return new Promise((resolve, reject) => {
      const {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
      } = { ...data };

      try {
        const args = [
          `athlete_${athleteId}`,
          "access_token",
          accessToken,
          "refresh_token",
          refreshToken,
          "expires_at",
          expiresAt,
        ];
        this._client.send_command("HMSET", args, (err, response) => {
          if (err) {
            console.log(err);
            reject();
          } else {
            resolve();
          }
        });
      } catch (e) {}
    });
  }

  async getAthlete(athleteId) {
    return new Promise((resolve, reject) => {
      const args = [`athlete_${athleteId}`];
      this._client.send_command("HGETALL", args, (err, response) => {
        if (err) {
          console.log(err);
          reject();
        } else {
          const athleteInfo = response;
          resolve(athleteInfo);
        }
      });
    });
  }

  get AllAthletes() {
    const args = [Keys.ATHLETE];
    return new Promise((resolve, reject) => {
      this._client.send_command("SMEMBERS", args, (err, response) => {
        if (err) {
          reject();
        } else {
          resolve(response);
        }
      });
    });
  }

  addSegmentEffort(athleteId, segmentId, time, cb = () => {}) {
    const momentTime = moment(time);
    const args = [
      `segment_${segmentId}_athlete_${athleteId}`,
      momentTime.unix(),
      momentTime.toISOString(),
    ];
    this._client.send_command("ZADD", args, (err, response) => {
      if (err) {
        console.log(err);
      } else {
        cb(response);
      }
    });
  }

  deleteKey(key, cb = () => {}) {
    const args = [key];
    this._client.send_command("DEL", args, (err, response) => {
      if (err) {
        console.log(err);
      } else {
        cb(response);
      }
    });
  }

  async getSegmentEffortsForAthleteSegmentByDateRange(
    athleteId,
    segmentId,
    startDate = undefined,
    endDate = undefined
  ) {
    return new Promise((resolve, reject) => {
      const startScore = startDate ? moment(startDate).unix() : 0;
      const endScore = endDate
        ? moment(endDate).unix()
        : moment
            .utc()
            .add(-5, "h") // this is the time difference
            .unix();
      const args = [
        `segment_${segmentId}_athlete_${athleteId}`,
        startScore,
        endScore,
      ];
      this._client.send_command("ZRANGEBYSCORE", args, (err, response) => {
        if (err) {
          console.log(err);
          reject();
        } else {
          resolve({
            athleteId: athleteId,
            segmentId: segmentId,
            efforts: response,
          });
        }
      });
    });
  }
}

class StravaClient {
  constructor() {
    // todo : set up

    this._clientId = 563;
    this._clientSecret = process.env.CLIENT_SECRET || "";
  }

  async authenticate(code) {
    return new Promise(async (resolve, reject) => {
      try {
        const r = await axios.post("https://www.strava.com/oauth/token", {
          client_id: 563,
          client_secret: process.env.CLIENT_SECRET,
          code: code,
          grant_type: "authorization_code",
        });

        resolve(r.data);
      } catch (e) {
        console.log(e);
        reject(e.message);
      }
    });
  }

  async getStravaActivity(athleteInfo, activityId) {
    let {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      athlete,
    } = {
      ...athleteInfo,
    };

    // check whether the athlete token is expired :
    if (
      moment(Number(expiresAt)).toDate() < moment(new Date() / 1000).toDate()
    ) {
      // if expired
      const data = await this._refreshTokenFunc(athlete.id, refreshToken);

      const redisClient = new RedisDatabase(); // it's call diff :derp:
      try {
        console.log("updating token");
        await redisClient.updateAthleteToken(athlete.id, data);
      } catch (e) {
        console.log("error updating token");
        console.log(e);
      } finally {
        redisClient.close();
      }

      accessToken = newAccessToken;
    }

    try {
      // returns a promise
      return axios.get(
        `https://www.strava.com/api/v3/activities/${activityId}?include_all_efforts=true`, // make sure to get all efforts
        {
          headers: { Authorization: "Bearer " + accessToken },
        }
      );
    } catch (e) {
      console.log(e.message);
      // returns a promise
      return Promise.reject(e.message);
    }
  }

  async _refreshTokenFunc(athleteId, refreshToken) {
    console.log("refreshing token");
    const stravaResponse = await axios.post(
      `https://www.strava.com/oauth/token`,
      {
        grant_type: "refresh_token",
        client_id: this._clientId,
        client_secret: this._clientSecret,
        refresh_token: refreshToken,
      }
    );
    const data = stravaResponse.data;

    return data;
  }
}

module.exports.RedisClient = RedisDatabase;
module.exports.StravaClient = StravaClient;
