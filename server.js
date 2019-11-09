/* jshint esversion : 6 */
/* jshint asi : true */
const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
var Schema=mongoose.Schema;
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

const userSchema  = new Schema({
  userName: { type: String, required: true },
}); 
var User= mongoose.model("exerciseUser", userSchema);

const exerciseSchema = new Schema({
userId: { type: String, required: true },
description: { type: String, required: true },
duration: { type: Number, required: true },
date: Date
})
var Exercise= mongoose.model("Exercise", exerciseSchema);


app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

var notConnected = new Error("database not connected");

app.post("/api/exercise/new-user", function (req,res, next) {
  
  if(mongoose.connection.readyState!==1) {
   return next(notConnected);
 }

  let userName = req.body.username;
  if(userName) {
    let document = new User({});//"userName": userName})
    document.save(function (err, data) {
      if (err) {
        return next(err)
      }
      res.json(data);
    });

  } else {
    return next(new Error("missing username"));
  }

 });

 

 app.get("/api/exercise/users", function (req,res,next) {
  if(mongoose.connection.readyState!==1) {
    return next(notConnected);
  }

  User.find({}, ['_id','userName'],function (err, userList) {
    if (err) {
      return next(err)
    }

    res.json(userList);
  })

 });

 app.post("/api/exercise/add", function (req,res, next) {
  
  if(mongoose.connection.readyState!==1) {
    return next(notConnected);
  }
  let description=req.body.description;
  if(!description) {
    return next(new Error("missing description"));
  }

  let duration=req.body.duration;
  if(!duration || isNaN(duration)) {
    return next(new Error("missing or invalid duration"));
  }

  let date=req.body.date;

  let userId = req.body.userId;
  console.log('req.body: ', req.body);
  if(userId && userId.match(/^[0-9a-fA-F]{24}$/)) {
    let user = User.findById(userId, function(err, user) {
      if (err) {
        return next(err)
      } else if(!user) {
        return next(new Error("invalid user"));
      }
      let exercise=new Exercise({"userId": userId, "description": description, "duration": duration, "date": date });
      exercise.save(function (err, data) {
        if (err) {
          return next(err)
        }
        res.json(data);
      });
    });
    } else {
      return next(new Error("missing or invalid userId"));
    }
  }); 

  app.get("/api/exercise/log", function (req,res,next) {
    if(mongoose.connection.readyState!==1) {
      return next(notConnected);
    }
    
    let userId=req.query.userId;

    if(userId && userId.match(/^[0-9a-fA-F]{24}$/)) {
      let user = User.findById(userId, function(err, user) {
        if (err) {
          return next(err)
        } else if(!user) {
          return next(new Error("invalid user"));
        }
        
        let query = Exercise.find({userId: userId},{'_id': 0,'description':1, 'duration':1, 'date':1});
        if(req.query.limit ) {
          if(isNaN(req.query.limit)) {
            return next(new Error("invalid limit"));
          } else {
            query.limit(req.query.limit*1)
          }
        }
        if(req.query.from ) {
          if(!req.query.from.match(/\d{4}-\d{2}-\d{2}/)) {
            return next(new Error("invalid date"));
          } else {
            query.find({date: {
              $gte: new Date(req.query.from)
            }})
          }
        }
        if(req.query.to ) {
          if(!req.query.to.match(/\d{4}-\d{2}-\d{2}/)) {
            return next(new Error("invalid date"));
          } else {
            query.find({date: {
              $lte: new Date(req.query.to)
            }})
          }
        }
        query.exec(function (err, exerciseList) {
          if (err) {
            return next(err)
          }
          let result = {_id : user.id,
            userName : user.userName,
            log: exerciseList,
            count: exerciseList.length }
            console.log('user: ', result);
            res.json(result);
          })
        });
      } else {
        return next(new Error("invalid user"));
    }
  });

 

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})




const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
