const mongoose = require("mongoose")
const express = require("express")
const { connectDB } = require("./connectDB.js")
const { populatePokemons } = require("./populatePokemons.js")
const { getTypes } = require("./getTypes.js")
const logModel = require("./logModel.js")
const { handleErr } = require("./errorHandler.js")
const { asyncWrapper } = require("./asyncWrapper.js")
const dotenv = require("dotenv")
const morgan = require("morgan")
const cors = require("cors")
const app = express()
const jwt = require("jsonwebtoken")
const fs = require('fs');
const path = require('path');
const userModel = require("./userModel.js");
const { CLIENT_RENEG_WINDOW } = require("tls");

app.use(cors())
app.use(express.json())
app.use(morgan(":method"))



var pokeModel = null;

const {
  PokemonBadRequest,
  PokemonBadRequestMissingID,
  PokemonBadRequestMissingAfter,
  PokemonDbError,
  PokemonNotFoundError,
  PokemonDuplicateError,
  PokemonNoSuchRouteError,
  PokemonAuthError
} = require("./errors.js")

dotenv.config();

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

  app.listen(process.env.serverPORT, async (err) => {
    if (err) throw new PokemonDbError(err);
    else console.log(`Phew! [Auth] server is running on port: ${5003}`);
    const docAdmin = await userModel.findOne({ "username": "admin" })

    await connectDB({ "drop": false });
    const pokeSchema = await getTypes();
    const logSchema = await logModel.schema;
  
    // pokeModel = await populatePokemons(pokeSchema);
    pokeModel = mongoose.model('pokemons', pokeSchema);

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

// module.exports = { authApp: app, authStart: start() };


// const start = asyncWrapper(async () => {


//   app.listen(6003, (err) => {
//     if (err)
//       throw new PokemonDbError(err)
//     else
//       console.log(`Phew! Server is running on port: ${process.env.pokeServerPORT}`);
//   })
// })

const authUser = asyncWrapper(async (req, res, next) => {
  // const token = req.body.appid
  const token = req.header('auth-token-access')

  if (!token) {
    // throw new PokemonAuthError("No Token: Please provide an appid query parameter.")
    throw new PokemonAuthError("No Token: Please provide the access token using the headers.")
  }
  try {
    const verified = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    next()
  } catch (err) {
    throw new PokemonAuthError("Invalid Token Verification. Log in again.")
  }
})


const authAdmin = asyncWrapper(async (req, res, next) => {
  const payload = jwt.verify(req.header('auth-token-access'), process.env.ACCESS_TOKEN_SECRET)
  if (payload?.user?.role == "admin") {
    return next()
  }
  throw new PokemonAuthError("Access denied")
})


app.use(authUser) // Boom! All routes below this line are protected
app.get('/api/v1/pokemons', asyncWrapper(async (req, res) => {
  if (!req.query["count"])
    req.query["count"] = 10
  if (!req.query["after"])
    req.query["after"] = 0
  // try {
  const docs = await pokeModel.find({})
    .sort({ "id": 1 })
    .skip(req.query["after"])
    .limit(req.query["count"])
  res.json(docs)
  // } catch (err) { res.json(handleErr(err)) }
}))

app.get('/api/v1/pokemon', asyncWrapper(async (req, res) => {
  // try {
  const { id } = req.query
  const docs = await pokeModel.find({ "id": id })
  if (docs.length != 0) res.json(docs)
  else res.json({ errMsg: "Pokemon not found" })
  // } catch (err) { res.json(handleErr(err)) }
}))

app.use(authAdmin)
app.post('/api/v1/pokemon/', asyncWrapper(async (req, res) => {
  // try {
  console.log(req.body);
  if (!req.body.id) throw new PokemonBadRequestMissingID()
  const poke = await pokeModel.find({ "id": req.body.id })
  if (poke.length != 0) throw new PokemonDuplicateError()
  const pokeDoc = await pokeModel.create(req.body)
  res.json({
    msg: "Added Successfully"
  })
  // } catch (err) { res.json(handleErr(err)) }
}))

app.delete('/api/v1/pokemon', asyncWrapper(async (req, res) => {
  // try {
  const docs = await pokeModel.findOneAndRemove({ id: req.query.id })
  if (docs)
    res.json({
      msg: "Deleted Successfully"
    })
  else
    // res.json({ errMsg: "Pokemon not found" })
    throw new PokemonNotFoundError("");
  // } catch (err) { res.json(handleErr(err)) }
}))

  app.get('/users/me', authUser, asyncWrapper(async (req, res) => {
    const user = req.user;
    res.send(user);
  }));
  
app.put('/api/v1/pokemon/:id', asyncWrapper(async (req, res) => {
  // try {
  const selection = { id: req.params.id }
  const update = req.body
  const options = {
    new: true,
    runValidators: true,
    overwrite: true
  }
  const doc = await pokeModel.findOneAndUpdate(selection, update, options)
  // console.log(docs);
  if (doc) {
    res.json({
      msg: "Updated Successfully",
      pokeInfo: doc
    })
  } else {
    // res.json({ msg: "Not found", })
    throw new PokemonNotFoundError("");
  }
  // } catch (err) { res.json(handleErr(err)) }
}))

app.patch('/api/v1/pokemon/:id', asyncWrapper(async (req, res) => {
  // try {
  const selection = { id: req.params.id }
  const update = req.body
  const options = {
    new: true,
    runValidators: true
  }
  const doc = await pokeModel.findOneAndUpdate(selection, update, options)
  if (doc) {
    res.json({
      msg: "Updated Successfully",
      pokeInfo: doc
    })
  } else {
    // res.json({  msg: "Not found" })
    throw new PokemonNotFoundError("");
  }
  // } catch (err) { res.json(handleErr(err)) }
}))

app.get('/report', asyncWrapper(async (req, res) => {
  
}))



app.get('/log/top-api-users', asyncWrapper(async (req, res) => {
  const startDate = new Date('2023-03-01T00:00:00.000Z');
  const endDate = new Date('2023-05-03T00:00:00.000Z');
  console.log("Report requested");
 const docs = await logModel.aggregate([
  {
    $match: {
      timestamp: {
        $gte: startDate,
        $lte: endDate
      }
    }
  },
  {
    $group: {
      _id: '$user_id',
      count: { $sum: 1 } // add a new field to hold the count of requests
    }
  },
  {
    $sort: {
      count: -1 // sort by the count field in descending order
    }
  },
  {
    $limit: 10
  }
]);


  res.send(docs)
}))

app.get('/logs/recent-errors', asyncWrapper(async (req, res) => {
  const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const docs = await logModel.aggregate([
    {
      $match: {
        timestamp: {
          $gte: date
        },
        status_code: {
          $gte: 400,
          $lt: 500
        }
      }
    },
    {
      $sort: {
        timestamp: -1
      }
    },
    {
      $limit: 10
    }
  ]);

  res.send(docs)
}))

app.get("/logs/top-users-by-endpoint", asyncWrapper(async (req, res) => {
  const docs = await logModel.aggregate([
    {
      $match: {
        status_code: { $gte: 400, $lt: 500 }
      }
    },
    {
      $group: {
        _id: { endpoint: "$endpoint", user_id: "$user_id" },
        count: { $sum: 1 }
      }
    },
    {
      $sort: {
        "_id.endpoint": 1,
        count: -1
      }
    },
    {
      $group: {
        _id: "$_id.endpoint",
        top_user: { $first: "$_id.user_id" },
        count: { $first: "$count" }
      }
    },
    {
      $project: {
        _id: 0,
        endpoint: "$_id",
        top_user: 1,
        count: 1
      }
    }
  ])
  res.send(docs)
}))

app.get("/logs/error-by-endpoint", asyncWrapper(async (req, res) => {
  const startDate = new Date('2023-03-01T00:00:00.000Z');
  const endDate = new Date('2023-05-03T00:00:00.000Z');
  const docs = await logModel.aggregate([
    {
      $match: {
        status_code: {
          $gte: 400,
          $lt: 500
        }
      }
    },
    {
      $group: {
        _id: {
          endpoint: "$endpoint",
          status_code: "$status_code"
        },
        count: {
          $sum: 1
        }
      }
    },
    {
      $sort: {
        count: -1
      }
    },
    {
      $limit: 10
    }
  ])
  res.send(docs)
}))


app.get('/logs/unique-api-users', asyncWrapper(async (req, res) => {
  const startDate = new Date('2023-03-01T00:00:00.000Z');
  const endDate = new Date('2023-06-01T00:00:00.000Z');
  
  const docs = await logModel.aggregate([
    {
      $match: {
        timestamp: {
          $gte: startDate,
          $lt: endDate
        }
      }
    },
    {
      $group: {
        _id: {
          year: {
            $year: '$timestamp'
          },
          month: {
            $month: '$timestamp'
          },
          day: {
            $dayOfMonth: '$timestamp'
          },
          user_id: '$user_id'
        }
      }
    },
    {
      $group: {
        _id: {
          year: '$_id.year',
          month: '$_id.month',
          day: '$_id.day'
        },
        count: {
          $sum: 1
        }
      }
    },
    {
      $sort: {
        '_id.year': 1,
        '_id.month': 1,
        '_id.day': 1
      }
    }
  ]);
  

console.log(docs);
  res.send(docs);
}));



app.use(handleErr)

module.exports = { serverApp: app, serverStart: start() }


