require("dotenv").config();
const crypto = require("crypto");

const accountModel = require("../models/accountModel");
const validationManager = require("../utils/validationManager");
const encryptionManager = require("../utils/encryptionManager");
const jwtManager = require("../utils/jwtManager");
const emailManager = require("../utils/emailManager");
const hashManager = require("../utils/hashManager");

const accountController = {

  manageAccountCreation: async ( request, response ) => {
    const email = request.body.email;
    const username = request.body.username;
    const password = request.body.password;

    const emailValidation = validationManager.emailValidation(email);
    const usernameValidation = validationManager.usernameValidation(username);
    const passwordValidation = validationManager.passwordValidation(password);

    if(emailValidation == false || usernameValidation == false || passwordValidation == false ) {
      response.status(400).json({error:"Unauthorised", message:"Credentials do not meet the format"});
      return;
    }

    const result = await accountModel.manageAccountCreation(username, email);
    if(result == false) {
      response.status(409).json({error:"Conflict", message: "Username or email already exist"});
      return;
    }

    const encryptedPassword = encryptionManager.encrypt(password, process.env.PASSWORD_ENCRYPTION_KEY);
    if( !encryptedPassword ) {
      response.status(500).json( {error: "Internal server error", message: "Encryption failed"} );
      return;
    }
    const registrationData = {
      username,
      email,
      password: encryptedPassword
    }

    const registrationToken = jwtManager.createJWT(registrationData, process.env.REGISTRATION_KEY, parseInt(process.env.REGISTRATION_KEY_EXPIRE) );
    if(!registrationToken) {
      response.status(500).json( {error: "Internal server error", message: "Token creation failed"} );
      return;
    }
    const URL = `http://13.60.17.115:${process.env.PORT}/account/registration-confirmation?token=${registrationToken}`;

    emailManager.sendEmail(email, "Registration", URL)
    .then( () => {
      response.status(200).json({message: "Click on the link we sent you via email"});
      return;
    } )
    .catch( () => {
      response.status(500).json({error: "Internal server error", message:"Failed to send an email"});
      return;
    } )
  } ,

  createAccount: async (request,response) => {
    const regestrationToken = request.query.token;
    const registrationData = jwtManager.authorise(regestrationToken, process.env.REGISTRATION_KEY); // returns either data or false 
    if(!registrationData) {
      response.redirect(`http://13.60.17.115:${process.env.PORT}/registration-confirmation?success=false`);
      return;
    }
    const decryptedPassword = encryptionManager.decrypt(registrationData.password, process.env.PASSWORD_ENCRYPTION_KEY);
    const hashedPassword = await hashManager.hash(decryptedPassword);
    const uuid = crypto.randomUUID();
    const databaseResult = await accountModel.createAccount(uuid, registrationData.username, registrationData.email, hashedPassword);
    response.redirect(`http://13.60.17.115:${process.env.PORT}/registration-confirmation?success=${databaseResult}`);
    return;
  },

  manageAccountRemoval: async (request, response) => {
    const authToken = request.cookies.authToken;
    const authData = jwtManager.authorise(authToken, process.env.AUTH_KEY); // returns data or false

    if(!authData) {
      response.status(401).json({error: "Unauthorised", message: "Token is either expired or invalid"});
      return;
    }
    const credentials = {
      userID: authData.userID
    }
    const removalToken = jwtManager.createJWT(credentials, process.env.REMOVAL_KEY, parseInt(process.env.REMOVAL_KEY_EXPIRE));
    const URL = `http://13.60.17.115:${process.env.PORT}/account/removal-confirmation?token=${removalToken}`;
    emailManager.sendEmail( authData.email, "Removal of account", URL )
    .then( () => {
      response.status(200).json({message: "Click on the link we sent you via email"});
      return;
    } )
    .catch( () => {
      response.status(500).json({error: "Internal server error", message:"Failed to send an email"});
      return;
  } )
  },

  removeAccount: async( request, response ) => {
    const removalToken = request.query.token;
    const removalData = jwtManager.authorise(removalToken, process.env.REMOVAL_KEY);
    if( !removalData ) {
      response.redirect( `http://13.60.17.115:${process.env.PORT}/removal-confirmation?success=false` )
      response.status(401).json({error: "Unauthorised", message: "Token is either expired or invalid"});
      return;
    }
    const userID = removalData.userID;
    const databaseResult = await accountModel.removeAccount(userID);
    if(!databaseResult){
      response.redirect(`http://13.60.17.115:${process.env.PORT}/removal-confirmation?success=${databaseResult}`);
    }
    else {
      response.cookie("authToken", "");
      response.redirect(`http://13.60.17.115:${process.env.PORT}/removal-confirmation?success=${databaseResult}`);
    }
    return;
  },

  createSession: async (request,response) => {
    let authToken = request.cookies.authToken;
    const authData = jwtManager.authorise(authToken, process.env.AUTH_KEY);
    if( authData != false ) {
      const doesUserExist = await accountModel.createSession(authData.email);
      if(doesUserExist.length == 0) { // i.e. the user does not exist
        response.cookie("authToken", "");
        response.status(400).json({error: "Bad request", message: "The user does not exist"});
        return;
      }
      response.status(200).json({message: "Authenticated"});
      return;
    }
    const email = request.body.email;
    const password = request.body.password;

    const emailValidation = validationManager.emailValidation(email);
    const passwordValidation = validationManager.passwordValidation(password);

    if( emailValidation == false || passwordValidation == false ) {
      response.status(400).json({error: "Bad request", message: "Credentials do not meet the format or empty"});
      return;
    }

    const databaseResult = await accountModel.createSession(email, password);
    if(databaseResult.length == 0) {
      response.status(401).json({error: "Unauthorised", message: "Authentication failed"});
      return;
    }

    const hashedDatabasePassword = databaseResult[0].password;
    const userID = databaseResult[0].userID;
    
    const passwordComparison = await hashManager.compareHash(password, hashedDatabasePassword);
    
    if( !passwordComparison) {
      response.status(401).json({error: "Unauthorised", message: "Authentication failed"});
      return;
    }

    const credentials = {
      email,
      userID
    }

    authToken = jwtManager.createJWT(credentials, process.env.AUTH_KEY,parseInt( process.env.AUTH_KEY_EXPIRE));
    response.cookie("authToken", authToken);
    response.status(200).json({message: "Authenticated"});
    return;
  },

  removeSession: async( request, response ) => {
    response.cookie("authToken", "");
    response.status(200).json({message:"Logged out successfully"});
    return;
  }
}

module.exports = accountController;