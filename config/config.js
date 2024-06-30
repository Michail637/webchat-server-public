const nodemailer = require("nodemailer");
require("dotenv").config();

const configuration = {
  emailManagement:{
    transporter: () => {
      return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: 587,
        secure: false,
        auth:{
          user: process.env.EMAIL_ADDRESS, // sender's email address
          pass: process.env.EMAIL_PASSWORD
        }
      })
    },
    emailInfo: (recipientAddress, keyWord, URL) => {
      return {
        from: process.env.EMAIL_ADDRESS ,
        to: recipientAddress,
        html: `<h1>Hello</h1> Click here to finish the process of ${keyWord}: ${URL}  `
      }
    }
  },
  validation: {
    emailRegExp: new RegExp(/^(?=.{1,320}$)[A-Za-z0-9_.+-]{1,64}@[A-Za-z0-9-]{1,255}(?:\.[A-Za-z]{2,6}){0,2}.*$/),
    passwordRegExp: new RegExp(/^(?=.*[A-Za-z])(?=.*\d).{8,40}$/),
    usernameRegExp:  new RegExp(/^[A-Za-z][A-Za-z\d]{7,29}$/)
  },
  database:{
    connectionObject: () => {
      return {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }
    }
  }
 
}

module.exports = configuration;