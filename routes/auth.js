const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = process.env;

router.post('/signup',(req,res) => {
  const {name,email,password,role} = req.body;
  if(!name || !email || !password || !role){
      return res.status(422).json({error:"please fill in all the details"});    
  }
  User.findOne({email:email})
  .then((savedUser) => {
      if(savedUser){
          return res.status(422).json({error:"the user already exists"});
      }

      bcrypt.hash(password,12)
      .then(hashedPassword => {
          const user = new User({
              email,
              password:hashedPassword,
              name,
              role
          })
          user.save()
          .then((user)=>{
              res.json({message:"saved successfully"})
          })
          .catch(err => {
              console.log(err);
          })
      })
      
  })
  .catch(err => {
      console.log(err);
  })
})

router.post('/signin',(req,res) => {
  const {email,password} = req.body;
  if(!email || !password){
      return res.status(422).json({error:"please add email or password"});    
  }
  User.findOne({email:email})
  .then((savedUser) => {
      if(!savedUser){
          return res.status(422).json({error:"Invalid email or password"});
      }
      bcrypt.compare(password,savedUser.password)
      .then(doMatch => {
          if(doMatch){
              // res.json({message:"successfully logged in"})
              const {_id,name,email,role,status} = savedUser;
              const token = jwt.sign({_id:savedUser._id,role: savedUser.role},JWT_SECRET);
              res.json({token,user:{_id,name,email,role,status}});
          }
          else{
              return res.status(422).json({error:"Invalid email or password"})
          }
      })
      .catch(err => {
          console.log(err);
      })
      
  })
  .catch(err => {
      console.log(err);
  })
})

module.exports = router;
