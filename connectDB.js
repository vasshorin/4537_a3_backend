const { mongoose } = require('mongoose')
const dotenv = require("dotenv")
dotenv.config();

const connectDB = async (input) => {
  try {
    const x = await mongoose.connect('mongodb+srv://testUser:testUser@cluster0.etygx.mongodb.net/a2?retryWrites=true&w=majority');
    // const x = await mongoose.connect('mongodb://localhost:27017/pokemonLocal');
    console.log("Connected to db");
    if (input.drop === true)
      mongoose.connection.db.dropDatabase();
    // console.log("Dropped db");
    // get the data from Github 
  } catch (error) {
    console.log('db error');
  }
}

module.exports = { connectDB }