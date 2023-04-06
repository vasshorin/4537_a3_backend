const { handleErr } = require("./errorHandler.js");
const { asyncWrapper } = require("./asyncWrapper.js");
const express = require("express");
const dotenv = require("dotenv");
const userModel = require("./userModel.js");
const logModel = require("./logModel.js");
const { connectDB } = require("./connectDB.js");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { CLIENT_RENEG_WINDOW } = require("tls");
dotenv.config();

const {
  PokemonBadRequest,
  PokemonDbError,
  PokemonAuthError,
} = require("./errors.js");

const app = express();

const start = asyncWrapper(async () => {
  await connectDB({ drop: false });

  logModel.updateMany({}, [
    {
      $set: {
        timestamp: {
          $convert: {
            input: "$timestamp",
            to: "date",
            timezone: "UTC",
          },
        },
      },
    },
  ]);

  app.listen(5003, async (err) => {
    if (err) throw new PokemonDbError(err);
    else console.log(`Phew! [Auth] server is running on port: ${5003}`);
    const docAdmin = await userModel.findOne({ "username": "admin" })

    if (!docAdmin)
      userModel.create
      ({
        username: "admin",
        password: bcrypt.hashSync("admin", 10),
        role: "admin",
        email: "admin@admin.ca",
      })
    else
      console.log("Admin already exists")
    const doc = await userModel.findOne({ username: "test1" });
    if (!doc) {
      userModel.create({
        username: "test1",
        password: bcrypt.hashSync("test1", 10),
        role: "user",
        email: "test@test.ca",
        accessToken: null,
        refreshToken: null,
      });
    } else {
      console.log("User already exists");
    }

    const doc2 = await userModel.findOne({ username: "test2" });
    if (!doc2) {
      userModel.create({
        username: "test2",
        password: bcrypt.hashSync("test2", 10),
        role: "user",
        email: "test34@test.ca",
        accessToken: null,
        refreshToken: null,
      });
    } else {
      console.log("User already exists");
    }

    const doc3 = await userModel.findOne({ username: "test3" });
    if (!doc3) {
      userModel.create({
        username: "test3",
        password: bcrypt.hashSync("test3", 10),
        role: "user",
        email: "test3@test.ca",
        accessToken: null,
        refreshToken: null,
      });
    } else {
      console.log("User already exists");
    }

    const doc4 = await userModel.findOne({ username: "test4" });
    if (!doc4) {
      userModel.create({
        username: "test4",
        password: bcrypt.hashSync("test3", 10),
        role: "user",
        email: "test4@test.ca",
        accessToken: null,
        refreshToken: null,
      });
    } else {
      console.log("User already exists");
    }
  });
});

app.use(express.json());
app.use(
  cors({
    exposedHeaders: ["auth-token-access", "auth-token-refresh"],
  })
);

const bcrypt = require("bcrypt");
const { populatePokemons } = require("./populatePokemons.js");
const { time } = require("console");
app.post(
  "/register",
  asyncWrapper(async (req, res) => {
    const { username, password, email } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userWithHashedPassword = { ...req.body, password: hashedPassword };

    const user = await userModel.create(userWithHashedPassword);
    const timestamp = new Date().toUTCString();
    logModel.create({
      timestamp: timestamp,
      user_id: user._id,
      endpoint: "/register",
      status_code: 200,
      response_time: 0,
    });

    res.send(user);
  })
);

app.post(
  "/login",
  asyncWrapper(async (req, res) => {
    const { username, password } = req.body;

    const user = await userModel.findOne({ username });
    if (!user) {
      throw new PokemonAuthError("User not found");
    }

    user.lastAccessToken = null;
    user.lastRefreshToken = null;
    user.save();

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      const timestamp = new Date().toUTCString();
      logModel.create({
        timestamp: timestamp,
        user_id: user._id,
        endpoint: "/login",
        status_code: 401,
        response_time: 0,
      });
      throw new PokemonAuthError("Password is incorrect");
    }

    const accessToken = jwt.sign(
      { user: user },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "60m" }
    );
    const refreshToken = jwt.sign(
      { user: user },
      process.env.REFRESH_TOKEN_SECRET
    );

    // save the new tokens to the user
    user.lastAccessToken = accessToken;
    user.lastRefreshToken = refreshToken;
    user.save();
    const timestamp = new Date().toUTCString();
    logModel.create({
      timestamp: timestamp,
      user_id: user._id,
      endpoint: "/login",
      status_code: 200,
      response_time: 0,
    });

    res.header("auth-token-access", accessToken);
    res.header("auth-token-refresh", refreshToken);
    res.send(user);
  })
);

app.post(
  "/requestNewAccessToken",
  asyncWrapper(async (req, res) => {
    const refreshToken = req.header("auth-token-refresh"); // get the refresh token from the header
    console.log(refreshToken);

    if (!refreshToken) {
      const timestamp = new Date().toUTCString();
      logModel.create({
        timestamp: timestamp,
        user_id: null,
        endpoint: "/requestNewAccessToken",
        status_code: 401,
        response_time: 0,
      });

      throw new PokemonAuthError("No Token: Please provide a token.");
    }

    // check if the refresh token is valid by checking if any user has this refresh token in the database
    const user = await userModel.findOne({ lastRefreshToken: refreshToken });
    if (!user)
      throw new PokemonAuthError(
        "Invalid Token: Please provide a valid token."
      );
    try {
      const payload = await jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
      const accessToken = jwt.sign(
        { user: payload.user },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "60m" }
      );
      logModel.create({
        timestamp: new Date(),
        user_id: user._id,
        endpoint: "/requestNewAccessToken",
        status_code: 200,
        response_time: 0,
      });

      // save the new access token to the user
      res.header("auth-token-access", accessToken);
      res.send("All good!");
    } catch (error) {
      const timestamp = new Date().toUTCString();
      logModel.create({
        timestamp: timestamp,
        user_id: user._id,
        endpoint: "/requestNewAccessToken",
        status_code: 401,
        response_time: 0,
      });
      throw new PokemonAuthError(
        "Invalid Token: Please provide a valid token."
      );
    }
  })
);

app.post(
  "/logout",
  asyncWrapper(async (req, res) => {
    const refreshToken = req.header("auth-token-refresh"); // get the refresh token from the header

    if (!refreshToken) {
      throw new PokemonAuthError("No Token: Please provide a token.");
    }

    try {
      // verify the refresh token with the REFRESH_TOKEN_SECRET
      const payload = await jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );

      // get the user with this refresh token from the database
      const user = await userModel.findOne({ lastRefreshToken: refreshToken });
      if (!user)
        throw new PokemonAuthError(
          "Invalid Token: Please provide a valid token."
        );

      // clear the user's access and refresh tokens and save the user
      user.lastAccessToken = null;
      user.lastRefreshToken = null;
      await user.save();

      res.send("All good! Good bye!");
    } catch (error) {
      throw new PokemonAuthError(
        "Invalid Token: Please provide a valid token."
      );
    }
  })
);

module.exports = { authApp: app, authStart: start() };
