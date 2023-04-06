const request = require("supertest");
const { serverApp, serverStart } = require("./appServer");
const { authApp, authStart} = require("./authServer");
const userModel = require("./userModel");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { before } = require("node:test");



// Before all tests, run the authServer and connect to the DB and run the appServer
beforeAll (async () => {
  await authStart;
  await serverStart;
});

// After all tests, close the DB connection
afterAll(async () => {
  // drop the database
  // await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe("Auth Server", () => {
  describe("POST /register", () => {
    it("should create a new user with a hashed password and admin rights", async () => {
      const response = await request(authApp)
        .post("/register")
        .send({ 
              username: "admin", 
              password: "admin", 
              role: "admin", 
              email: "admin@admin.ca",
              accessToken: "",
              refreshToken: ""
            });

      expect(response.statusCode).toBe(200);
      const user = await userModel.findOne({ username: "admin" });
      expect(user).toBeDefined();
      expect(user.password).not.toBe("admin");
    });

    it("should return a 500 error if the user already exists", async () => {
      // Send a request to create a user
      await request(authApp)
        .post("/register")
        .send({
          username: "testuser",
          password: "testpassword",
          role: "user",
          email: "testuser@example.com",
          accessToken: "",
          refreshToken: ""
        });

      // Try to create the same user again
      let response = await request(authApp)
        .post("/register")
        .send({
          username: "testuser",
          password: "testpassword",
          role: "user",
          email: "testuser@example.com",
          accessToken: "",
          refreshToken: ""
        });

      expect(response.status).toEqual(500);
    });

    it("should return a 500 error if the username is missing", async () => {
      let response = await request(authApp)
        .post("/register")
        .send({
          password: "Notestpassword",
          role: "user",
          email: "noUsername@test.ca",
          accessToken: "",
          refreshToken: ""
        });

      expect(response.status).toEqual(500);
    });
  });

  describe("POST /login", () => {
    it("should return a JWT access token and refresh token for valid credentials", async () => {
      let response = await request(authApp)
        .post("/login")
        .set("Content-Type", "application/json")
        .send({ username: "admin", password: "admin" });
  
      expect(response.status).toEqual(200);
      expect(response.header["authorization"]).toBeDefined();
      let splitHeader = response.header["authorization"].split(" ");
      const accessToken = splitHeader[1];
      const refreshToken = splitHeader[3];
      expect(jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)).toBeDefined();
      expect(jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)).toBeDefined();
    });

    it("should return a 401 error for invalid credentials", async () => {
      let response = await request(authApp)
        .post("/login")
        .set("Content-Type", "application/json")
        .send({ username: "admin", password: "wrongpassword" });
      expect(response.status).toEqual(500);
    });

    it("should return a 401 error for invalid username", async () => {
      let response = await request(authApp)
        .post("/login")
        .set("Content-Type", "application/json")
        .send({ username: "wrongusername", password: "admin" });
      expect(response.status).toEqual(500);
    });

    it("should return a 401 error for missing username", async () => {
      let response = await request(authApp)
        .post("/login")
        .set("Content-Type", "application/json")
        .send({ password: "admin" });
      expect(response.status).toEqual(500);
    });

    it("should return a 401 error for missing password", async () => {
      let response = await request(authApp)
        .post("/login")
        .set("Content-Type", "application/json")
        .send({ username: "admin" });
      expect(response.status).toEqual(500);
    });
  });

  describe("POST /requestNewAccessToken", () => {
    it("should return a new access token for a valid refresh token", async () => {
      let response = await request(authApp)
        .post("/login")
        .set("Content-Type", "application/json")
        .send({ username: "admin", password: "admin" });

      expect(response.status).toEqual(200);
      expect(response.header["authorization"]).toBeDefined();
      let splitHeader = response.header["authorization"].split(" ");
      const refreshToken = splitHeader[3];
      let finalRefresh = "Refresh " + refreshToken;
      response = await request(authApp)
        .post("/requestNewAccessToken")
        .set("Content-Type", "application/json")
        .set("Authorization", finalRefresh);
      expect(response.status).toEqual(200);
      expect(response.header["authorization"]).toBeDefined();
      splitHeader = response.header["authorization"].split(" ");
      const accessToken = splitHeader[1];
      expect(jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)).toBeDefined();
    });

    it("should throw a PokemonAuthError for an invalid or missing refresh token", async () => {
      const response = await request(authApp)
        .post("/requestNewAccessToken")
        .set("Authorization", "invalidtoken");

      expect(response.status).toEqual(500);
      // expect(response.body.error).toEqual("Access denied: Invalid or missing refresh token");
    });
  });


  describe("POST /logout", () => {
    it("should delete the refresh token from the database", async () => {
      let response = await request(authApp)
        .post("/login")
        .set("Content-Type", "application/json")
        .send({ username: "admin", password: "admin" });

      expect(response.status).toEqual(200);
      expect(response.header["authorization"]).toBeDefined();
      let splitHeader = response.header["authorization"].split(" ");
      const refreshToken = splitHeader[3];
      let finalRefresh = "Refresh " + refreshToken;
      response = await request(authApp)
        .post("/logout")
        .set("Content-Type", "application/json")
        .set("Authorization", finalRefresh);
    
      expect(response.status).toEqual(200);
      // check that the refresh token has been deleted from the database
      const refreshedUser = await userModel.findOne({ username: 'admin' });
      expect(refreshedUser.lastRefreshToken).toBeNull();
    });
  });
});