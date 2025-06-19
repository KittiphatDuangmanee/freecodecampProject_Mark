const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI,{ useNewUrlParser: true, useUnifiedTopology: true});
//user Section
const userSchema = new mongoose.Schema({
  username: {
    type:String,
    required: true
  },
  description: {
    type: String
  },
  duration: {
    type: Number
  },
  date: {
    type: String
  },
  count: {
    type: Number
  },
  log: {
    type:[]
  }
});
const userModel = mongoose.model("User",userSchema);
const createUser = (data) => {
  return new Promise((resolve, reject) => {
    userModel.create(data, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};
const getAllUser = ()=>{
  return new Promise((resolve,reject)=>{
    userModel.find({})
    .select({
      _id:true,
      username:true
    })
    .exec((err,data)=>{
      if(err)
        return reject(err);
      resolve(data);
    });
  });
};
const getUserByID = (id)=>{
    return new Promise((resolve,reject)=>{
      userModel.findById(id,(err,data)=>{
        if(err)
          return reject(err);
        resolve(data);
      });
    });
};
const find_update_user_log = (userID,excercise)=>{
  return new Promise((resolve,reject)=>{
    userModel.findByIdAndUpdate(
      userID,
      {
        $push: { log: excercise }
      },
      { 
        new: true,
        runValidators: true
      },
      (err,data)=>{
        if(err)
          return reject(err);
        resolve(data);
      }
    );
  });
}
//


// excercises Section
const excerciseSchema = new mongoose.Schema({
  username: String,
  description: {
    type:String,
    required:true  
  },
  duration: {
    type:Number,
    required:true  
  },
  date: Date,
  user_id: String
});
const exerciseModel = mongoose.model("Exercise",excerciseSchema);
const createExercise = (data)=>{
  return new Promise((resolve,reject)=>{
    exerciseModel.create(data,(err,data)=>{
        if(err)
          return reject(err);
        resolve(data);
    });
  });
};
const  userExercise  = (userID)=>{
  return new Promise((resolve,reject)=>{
    exerciseModel.find({user_id:userID})
    .select({
      _id:false,
      description:true,
      duration:true,
      date:true
    })
    .exec((err,data)=>{
      if(err)
        return reject(err);
      resolve(data);
    })
  })
}
//
app.use(bodyParser.urlencoded({extended: false}));
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
app.route("/api/users")
.post((req,res)=>{
  let userData ={
    username: req.body.username,
    log:[]
  };
  createUser(userData)
  .then((data)=>{
    res.json({
      username:data.username,
      _id:data._id
    });
  })
  .catch((err)=>{
    res.json({error: err});
  });
}).get((req,res)=>{
  getAllUser()
  .then((data)=>{
    res.send(data);
  })
  .catch(err=>{
    res.send(err);
  });
});
app.post("/api/users/:_id/exercises",(req,res)=>{
  getUserByID(req.params._id)
  .then(data=>{
    let dateData = new Date(req.body.date);
    let check = 1
    if(req.body.date==""){
      dateData = new Date();
    }else if(dateData === "Invalid Date"){
      res.send("Error date input");
      check = 0
    }
    if(check){
      let exerciseData ={
        username: data.username,
        description: req.body.description,
        duration: req.body.duration,
        date: dateData,
        user_id: data._id
      }
      createExercise(exerciseData)
      .then((data)=>{
        let logTemp ={
          description: data.description,
          duration: data.duration,
          date: data.date.toDateString()
        }
        find_update_user_log(data.user_id,logTemp).then(data=>console.log(data)).catch(err=>console.log(err));
        res.json({
          _id: data.user_id,
          username:data.username,
          date: data.date.toDateString(),
          duration:data.duration,
          description:data.description
        });
      })
      .catch(err=>{
        res.send(err);
      });
    }
  })
  .catch(err=>{
    console.log(err);
  })
});
app.get("/api/users/:_id/logs",async (req,res)=>{
  let from = new Date(req.query.from).getTime();
  let to = new Date(req.query.to).getTime();
  const limit = req.query.limit;

  const userData = await userModel.findById(req.params._id);

  if (req.query.from || req.query.to) {
    userData.log = userData.log.filter((session) => {
      let sessionDate = new Date(session.date).getTime();
      return sessionDate >= from && sessionDate <= to;
    });
  }
  //  // DEBUG
  // console.log({log: userData.log[0].date});
  // console.log("Date from log: "+userData.log[0].date);
  // if (Array.isArray(userData.log)) {
  // console.log(userData.log[0].date)
  //   console.log(Array.from(userData.log)) // array from log
  // }
  res.json({
    username: userData.username,
    count: userData.log.length,
    _id: req.params._id,
    log: (userData.log).slice(0, limit)
  });
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
