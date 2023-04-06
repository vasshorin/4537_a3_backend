const mongoose = require('mongoose')
const express = require('express')

handleErr = (err, req, res, next) => {
  if (err.pokeErrCode)
    res.status(err.pokeErrCode)
  else
    res.status(500)
  res.send(err.message)
  console.log("####################")
  console.log(err);
  console.log("####################")
}


module.exports = { handleErr }