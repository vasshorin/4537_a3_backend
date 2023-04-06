[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-c66648af7eb3fe8bc4f294546bfd86ef473780cde1dea487d3c4ff354943c9ae.svg)](https://classroom.github.com/online_ide?assignment_repo_id=10432834&assignment_repo_type=AssignmentRepo)
# Assignment 2
For this assignment, write *Supertest* tests to ensure that the JWT authentication and authorization system that we have developed this week works as expected for the Pokemon API. Here are requirements for the tests:

## Introduction
In this assignment, you will learn how to implement JSON Web Tokens (JWT) for authentication and authorization in a Node.js application that communicates with a MongoDB database. You will use the provided authentication and resource servers that are already implemented using Express.js, Mongoose, and JWT. 


## Objective
The objective of this assignment is to teach you how to implement JWT-based authentication and authorization in a Node.js application that communicates with a MongoDB database. By the end of the assignment, you should be able to understand the principles of JWT-based authentication, implement JWT-based authentication and authorization in a Node.js application, and understand how to use JWT to protect routes and resources.


## JWT Requirement #1 - `Authorization` header
Distinguish access tokens from refresh tokens using a single `Authorization` header and use different token types or prefixes for each token type.

For example, you could use the `Bearer` prefix for access tokens and the `Refresh` prefix for refresh tokens. This would allow you to easily differentiate between the two types of tokens based on their prefix.

Here's an example of how you could use this approach:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```
Send the refresh token in the Authorization header with the Refresh prefix, like this:

```
Authorization: Refresh eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

On the server-side, you would need to parse the Authorization header and check the prefix to determine whether the token is an access token or a refresh token.

## JWT Requirement #2 - Logout
When a user logs out or their account is disabled. Previously issued tokens should be invalidated. 

## Testing Requirements
+ Test that the /register endpoint creates a new user in the database with the correct hashed password 
+ Test that the /login endpoint returns a JWT access token and refresh token for valid credentials
+ Test that the /login endpoint throws a PokemonAuthError for invalid credentials
+ Test that the /requestNewAccessToken endpoint returns a new JWT access token for a valid refresh token
+ Test that the /requestNewAccessToken endpoint throws a PokemonAuthError for an invalid or missing refresh token
+ Test that the refresh token is added to the refreshTokens array on login and removed on logout
- Test that the JWT access token can be decoded and contains the correct user data

More tests:

+ Test that a user can successfully register, login, and make a request with a JWT access token
+ Test that an unauthenticated user cannot access protected endpoints
+ Test that an expired JWT access token cannot be used to access protected endpoints
+ Test that a request with an invalid JWT access token throws a PokemonAuthError
+ Test that a refresh token cannot be used to access protected endpoints
+ Test that a request with an invalid or missing refresh token throws a PokemonAuthError
+ Test that non-admin user cannot access admin protected routes
+ Test that after logging out, a user cannot access protected routes until the user re-login

Also test error handling and edge cases, such as:

+ Invalid payloads for register and login endpoints
- Invalid token secrets or expiration times
- Unhandled database errors
- Duplicate or missing documents in the database
- Invalid HTTP requests or responses

Tests should cover all possible scenarios and ensure that the authentication and authorization system works correctly and securely.

## Deliverables
- 5-min YT presentation going over your tests
- GitHub classroom link  

