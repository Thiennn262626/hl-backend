const {
  reasonStatusCode,
  statusCodes,
  reasonPhrases,
} = require("../utils/httpStatusCode");
class ErrorResponses extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.now = new Date();
  }
}

class RedisErrorResponse extends ErrorResponses {
  constructor(
    message = reasonPhrases.INTERNAL_SERVER_ERROR,
    statusCode = statusCodes.INTERNAL_SERVER_ERROR
  ) {
    super(message, statusCode);
  }
}

module.exports = {
  RedisErrorResponse,
};
