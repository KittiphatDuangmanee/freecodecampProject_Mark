require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('dns').promises;
bodyParser=require('body-parser');
const url = require("url");
app.use(bodyParser.urlencoded({extended: false}));
const options = {
    all:true,
}
const mongoose = require("mongoose");
const { log } = require('console');
mongoose.connect(process.env.MONGO_URI,{ useNewUrlParser: true, useUnifiedTopology: true });
const short_url = new mongoose.Schema({
  dns: {
    type: String,
    required: true
  },
  short: {
    type: Number,
    unique:true
  }
});
const URLModel = mongoose.model('url',short_url);
const insertOneURL = (data,done) =>{
    URLModel.create(data,(err,data)=>{
      if(err)
        return done(err);
      done(null,data);
    })
}
const searchURL_name = (name,done)=>{
  URLModel.find({dns:name},(err,data)=>{
    if(err)
      return done(err);
    done(null,data);
  });
}
const searchURL_latest = (done)=>{
  URLModel.find({})
          .sort({short:-1})
          .limit(1)
          .exec((err,data)=>{
            if(err)
              return done(err);
            done(null,data);
          });
}
function searchURL_latestAsync() {
  return new Promise((resolve, reject) => {
    searchURL_latest((err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}
let latestURL;
async function getlatestURL(){
  try{
    latestURL = await searchURL_latestAsync();
    console.log(latestURL);
    return latestURL;
  }catch(err){
    console.log("No data in database");
  }
}
// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});
let status;
async function getDNSCheck(hostname){
  try{
     await dns.lookup(hostname);
     status = 3;
  }
  catch(err){
    console.log("Invalid URL type 2");
    status = 2;
  }
  console.log(status);    
}
function searchURL_nameAsync(name) {
  return new Promise((resolve, reject) => {
    searchURL_name(name, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}
const searchURL_short = (shortUrl,done)=>{
  URLModel.find({short:shortUrl},(err,data)=>{
    if(err)
      return done(err);
    done(null,data);
  })
}
function searchURL_shortAsync(shortUrl) {
  return new Promise((resolve, reject) => {
    searchURL_short(shortUrl, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}
async function getShortURL(shortUrl) {
  let urlShort;
  try{
    urlShort = await searchURL_shortAsync(shortUrl);
  }catch(err){
    console.log("Don't have this url in database need to insert");
  }
  return urlShort;
}
let urlData;
async function getURL(name) {
  try{
    urlData = await searchURL_nameAsync(name);
  }catch(err){
    console.log("Don't have this url in database need to insert");
  }
  return urlData;
}
app.post('/api/shorturl',(req,res,next)=>{
  let parsedUrl = url.parse(req.body.url);
  let hostname = parsedUrl.hostname;
  console.log(parsedUrl.port + " "+ parsedUrl.path+" "+parsedUrl.host+" "+parsedUrl.protocol);
  console.log(hostname);
  if(hostname){
      getDNSCheck(hostname);
  }
  else{
    console.log("Invalid URL type 1");
    status = 1;
  }   
  next();
}
,(req,res)=>{
  console.log(req.body.url);
  switch(status){
    case 1: res.json({error: 'invalid url'})
      break;
    case 2: res.json({error: 'invalid url'})
      break;
    case 3: 
    getURL(req.body.url)
    .then(data=>{
      if(data.length == 0){
      getlatestURL().then(data=>{
        let insertData = {
          dns: req.body.url,
          short: data[0].short+1
        }
        insertOneURL(insertData,(err,data)=>{
          if(err)
            return 1
          console.log("Success\n\n\n");
        });
        res.json({original_url : req.body.url , short_url : data[0].short+1 });
      }).catch((err)=>{
        console.log("There is some thing wrong");
      });
      }else{
      console.log(data.length);
      res.json({original_url : data[0].dns , short_url : data[0].short })
     }
    }).catch((err)=>{
        console.log("There is some thing wrong");
      });
      break;
  }
});
// {"error":"No short URL found for the given input"}
app.get("/api/shorturl/:short",(req,res)=>{
  getShortURL(req.params.short)
  .then(data => {
    if(data.length == 0)
      res.json({"error":"No short URL found for the given input"});
    else{
      res.redirect(data[0].dns);
    }
  }).catch(err => {
    console.log(err);
  })
});
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
