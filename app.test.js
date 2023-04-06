const request = require("supertest");
const mongoose = require("mongoose");
const { serverApp, serverStart } = require("./appServer");
const { authApp, authStart } = require("./authServer");
const app2 = require("./appServer");
const jwt = require("jsonwebtoken");
const { before } = require("node:test");
const authServer = require("./authServer");
const userModel = require("./userModel.js")

beforeAll(async () => {
  await authStart;
  await serverStart;
});

afterAll(async () => {
  // drop the database
  // await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

  describe("GET /api/v1/pokemons", () => {

    it("should create a new user with a hashed password and admin rights", async () => {
      const response = await request(authApp)
        .post("/register")
        .send({
          username: "admin",
          password: "admin",
          role: "admin",
          email: "admin@admin.ca",
          accessToken: "",
          refreshToken: "",
        });

      expect(response.statusCode).toBe(200);
      const user = await userModel.findOne({ username: "admin" });
      expect(user).toBeDefined();
      expect(user.username).toBe("admin");
      expect(user.role).toBe("admin");
      expect(user.password).not.toBe("admin");
    });

    it("should login user and return array of pokemons", async () => {
      const newUser = {
        username: "testuser",
        email: "testuser@test.com",
        password: "testpassword",
        role: "user",
      };

      // Register the user
      let response = await request(authApp)
        .post("/register")
        .set("Content-Type", "application/json")
        .send(newUser);

      expect(response.status).toEqual(200);

      // Login the user
      response = await request(authApp)
        .post("/login")
        .set("Content-Type", "application/json")
        .send({ username: newUser.username, password: newUser.password });

      expect(response.status).toEqual(200);
      expect(response.header["authorization"]).toBeDefined();
      let splitHeader = response.header["authorization"].split(" ");
      const accessToken = splitHeader[1];
      const refreshToken = splitHeader[3];
      // Verify the tokens
      expect(jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)).toBeDefined();
      expect(jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)).toBeDefined();

      const response2 = await request(serverApp)
        .get("/api/v1/pokemons")
        .query({ count: 10, after: 0 })
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
    });

    it("should return 401 if user is not logged in", async () => {
      const response = await request(serverApp).get("/api/v1/pokemons").expect(500);
    }
  );

  });

describe("POST /api/v1/pokemon", () => {
  it("should add a new pokemon to the database", async () => {
    const newPokemon = {
      id: 1,
      name: {
        english: "Bulbasaur",
        japanese: "フシギダネ",
        chinese: "妙蛙种子",
        french: "Bulbizarre",
      },
      type: ["Grass", "Poison"],
      base: {
        HP: 45,
        Attack: 49,
        Defense: 49,
        "Sp. Attack": 65,
        "Sp. Defense": 65,
        Speed: 45,
      },
    };

    // Login as admin
    let response = await request(authApp)
      .post("/login")
      .set("Content-Type", "application/json")
      .send({ username: "admin", password: "admin" });

    expect(response.status).toEqual(200);
    expect(response.header["authorization"]).toBeDefined();
    let splitHeader = response.header["authorization"].split(" ");
    const accessToken = splitHeader[1];

    // Add new pokemon
    const response2 = await request(serverApp)
      .post("/api/v1/pokemon")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(newPokemon);

    expect(response2.status).toEqual(200);
    expect(response2.body.msg).toEqual("Added Successfully");
  });
});

  it("should return 500 if user is not admin", async () => {
    const newPokemon = {
      id: 2,
      name: {
        english: "Bulbasaur",
        japanese: "フシギダネ",
        chinese: "妙蛙种子",
        french: "Bulbizarre",
      },
      type: ["Grass", "Poison"],
      base: {
        HP: 45,
        Attack: 49,
        Defense: 49,
        "Sp. Attack": 65,
        "Sp. Defense": 65,
        Speed: 45,
      },
    };

    const newUser = {
      username: "notadmin",
      email: "notAdmin@test.ca",
      password: "testpassword",
      role: "user",
    };

    // Register the user
    let response = await request(authApp)
      .post("/register")
      .set("Content-Type", "application/json")
      .send(newUser);

    expect(response.status).toEqual(200);

    // Login the user
    response = await request(authApp)
      .post("/login")
      .set("Content-Type", "application/json")
      .send({ username: newUser.username, password: newUser.password });

    expect(response.status).toEqual(200);
    expect(response.header["authorization"]).toBeDefined();
    let splitHeader = response.header["authorization"].split(" ");
    const accessToken = splitHeader[1];

    // Add new pokemon
    const response2 = await request(serverApp)
      .post("/api/v1/pokemon")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(newPokemon);

    expect(response2.status).toEqual(401);
    expect(response2.body.msg).toEqual("Unauthorized");
  });


describe("PUT /api/v1/pokemon/:id", () => {
  it("should update a pokemon in the database", async () => {
    const updatedPokemon = {
      id: 1,
      name: {
        english: "Bulbasaur",
        japanese: "フシギダネ",
        chinese: "妙蛙种子",
        french: "Bulbizarre",
      },
      type: ["Grass", "Poison"],
      base: {
        HP: 111,
        Attack: 111,
        Defense: 111,
        "Sp. Attack": 65,
        "Sp. Defense": 65,
        Speed: 45,
      },
    };

    // Login as admin
    let response = await request(authApp)
      .post("/login")
      .set("Content-Type", "application/json")
      .send({ username: "admin", password: "admin" });

    expect(response.status).toEqual(200);
    expect(response.header["authorization"]).toBeDefined();
    let splitHeader = response.header["authorization"].split(" ");
    const accessToken = splitHeader[1];

    // Update pokemon
    const response2 = await request(serverApp)
      .put("/api/v1/pokemon/1")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(updatedPokemon);

    expect(response2.status).toEqual(200);
    expect(response2.body.msg).toEqual("Updated Successfully");
  });

  it("should return 500 if user is not admin", async () => {
    const updatedPokemon = {
      id: 1,
      name: {
        english: "Bulbasaur",
        japanese: "フシギダネ",
        chinese: "妙蛙种子",
        french: "Bulbizarre",
      },
      type: ["Grass", "Poison"],
      base: {
        HP: 45,
        Attack: 49,
        Defense: 49,
        "Sp. Attack": 65,
        "Sp. Defense": 65,
        Speed: 45,
      },
    };

    // Login the user
    response = await request(authApp)
      .post("/login")
      .set("Content-Type", "application/json")
      .send({ username: "notadmin", password: "testpassword" });

    expect(response.status).toEqual(200);
    expect(response.header["authorization"]).toBeDefined();
    let splitHeader = response.header["authorization"].split(" ");
    const accessToken = splitHeader[1];

    // Update pokemon
    const response2 = await request(serverApp)
      .put("/api/v1/pokemon/1")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(updatedPokemon);

    expect(response2.status).toEqual(401);
    expect(response2.body.msg).toEqual("Unauthorized");
  });

  it("should return 401 if invalid JWT token is provided", async () => {
    const updatedPokemon = {
        id: 1,
        name: {
          english: "Bulbasaur",
          japanese: "フシギダネ",
          chinese: "妙蛙种子",
          french: "Bulbizarre",
        },
        type: ["Grass", "Poison"],
        base: {
          HP: 111,
          Attack: 111,
          Defense: 111,
          "Sp. Attack": 65,
          "Sp. Defense": 65,
          Speed: 45,
        },
      };

    // Login as admin
    let response = await request(authApp)
        .post("/login")
        .set("Content-Type", "application/json")
        .send({ username: "admin", password: "admin" });

    expect(response.status).toEqual(200);
    expect(response.header["authorization"]).toBeDefined();
    let splitHeader = response.header["authorization"].split(" ");
    const accessToken = splitHeader[1] + "invalid";

    // Update pokemon
    const response2 = await request(serverApp)
        .put("/api/v1/pokemon/1")   
        .set("Authorization", `Bearer ${accessToken}`)
        .send(updatedPokemon);

    expect(response2.status).toEqual(401);
    });

    // - Test that a refresh token cannot be used to access protected endpoints
    it("should return 401 if refresh token is used to access protected endpoints", async () => {
         // Login as admin
         const updatedPokemon = {
            id: 1,
            name: {
              english: "Bulbasaur",
              japanese: "フシギダネ",
              chinese: "妙蛙种子",
              french: "Bulbizarre",
            },
            type: ["Grass", "Poison"],
            base: {
              HP: 111,
              Attack: 111,
              Defense: 111,
              "Sp. Attack": 65,
              "Sp. Defense": 65,
              Speed: 45,
            },
          };
    let response = await request(authApp)
    .post("/login")
    .set("Content-Type", "application/json")
    .send({ username: "admin", password: "admin" });

    expect(response.status).toEqual(200);
    expect(response.header["authorization"]).toBeDefined();
    let splitHeader = response.header["authorization"].split(" ");
    const accessToken = splitHeader[1];
    const refreshToken = splitHeader[2];

    // Update pokemon
    const response2 = await request(serverApp)
    .put("/api/v1/pokemon/1")   
    .set("Authorization", `Refresh ${refreshToken}`)
    .send(updatedPokemon);

    expect(response2.status).toEqual(401);

    });
});

describe("POST /logout", () => {
  it("should logout the user and user should not be able to access protected routes", async () => {
    let response = await request(authApp)
      .post("/login")
      .set("Content-Type", "application/json")
      .send({ username: "admin", password: "admin" });

    expect(response.status).toEqual(200);
    expect(response.header["authorization"]).toBeDefined();
    let splitHeader = response.header["authorization"].split(" ");
    let accessToken = splitHeader[1];
    let refreshToken = splitHeader[3];
    let finalRefresh = "Refresh " + refreshToken;

    // Logout the user
    response = await request(authApp)
      .post("/logout")
      .set("Content-Type", "application/json")
      .set("Authorization", finalRefresh);
    expect(response.status).toEqual(200);

    // Get the updated tokens from the user
    const user = await userModel.findOne({ username: 'admin' });
    accessToken = user.lastAccessToken;
    refreshToken = user.lastRefreshToken;

    // Try to access protected route
    const response3 = await request(serverApp)
      .get("/api/v1/pokemon")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response3.status).toEqual(401);
  });
});



