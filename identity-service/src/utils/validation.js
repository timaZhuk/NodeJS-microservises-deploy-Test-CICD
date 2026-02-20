const Joi = require("joi");

// --------SIGN UP------------------
const validateRegistration = (data) => {
  const schema = Joi.object({
    //----username
    username: Joi.string().min(3).max(50).required(),
    //----email
    email: Joi.string().email().required(),
    //---password
    password: Joi.string().min(6).required(),
  });

  return schema.validate(data);
};

//-----LOGIN------
const validateLogin = (data) => {
  const schema = Joi.object({
    //----email
    email: Joi.string().email().required(),
    //---password
    password: Joi.string().min(6).required(),
  });

  return schema.validate(data);
};
//---
module.exports = { validateRegistration, validateLogin };
