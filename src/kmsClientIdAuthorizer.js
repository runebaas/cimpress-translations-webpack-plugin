"use strict";

const AWS = require("aws-sdk");
const jwt = require("jsonwebtoken");

const Auth0Authenticator = require("./auth0Authenticator");

class kmsClientIdAuthorizer {
  constructor(clientId, encryptedClientSecret, defaultRegion = null) {
    this.clientId = clientId;
    this.encryptedClientSecret = encryptedClientSecret;
    this.defaultRegion = defaultRegion;
    this.KMS = new AWS.KMS(this.defaultRegion ? { region: this.defaultRegion} : {});

    this.token = null;
    this.authenticator = null;
  }

  async init() {
    let params = { CiphertextBlob: new Buffer(this.encryptedClientSecret, "base64") };
    let data = await this.KMS.decrypt(params).promise();

    this.authenticator = new Auth0Authenticator("cimpress.auth0.com", this.clientId, data.Plaintext.toString());
  }

  static isTokenExpired(token) {
    let exp = jwt.decode(token).exp;
    return exp && exp < (new Date().getTime() / 1000)
  }

  async getAccessToken() {
    if (!this.token || kmsClientIdAuthorizer.isTokenExpired(this.token)) {
      this.token = await this._getNewAccessToken();
    }

    return this.token;
  }

  async _getNewAccessToken() {
    if (!this.authenticator) {
      await this.init();
    }

    return await this.authenticator.getAuthorization();
  }
}

module.exports = kmsClientIdAuthorizer;
