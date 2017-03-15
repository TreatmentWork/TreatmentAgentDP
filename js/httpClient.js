var http = require('http');
var bodyParser = require("body-parser");
var commonConfig = require(appRoot + '/config/commonConfig.json');
var logger = require(appRoot + '/js/util/winstonConfig.js');

var  sendHttpRequest = function  (contentType, data, endPoint, host, port, callback ) {
    var postData;
    logger.debug('contentType:' + contentType);
    if(contentType === commonConfig.jsonContentType) {
      postData = JSON.stringify(data);
    }  else if(contentType === commonConfig.xmlContentType) {
      postData = data;
    } else {
      throw new Error('unsupported contentType:' + contentType);
    }
    var headers = {
      'Content-Type': contentType,
      'Content-Length': postData.length
    };
    var options = {
      host: host,
      port: port,
      path: endPoint,
      method: 'POST',
      headers: headers
    };

    var result = '';
    // request object
    var reqHttp = http.request(options, function (resHttp) {
      // response data
      resHttp.on('data', function (chunk) {
        result += chunk;
      });
      // response end
      resHttp.on('end', function () {
        logger.info(postData.requestId + 'HTTP response received:' + result);
        if(callback) {
          callback(null, result);
        }
      });
      //response error
      resHttp.on('error', function (err) {
        logger.error(postData.requestId + 'Error:' + err);
        if(callback) {
          callback(err);
        }
      });
    });

    reqHttp.setTimeout(parseInt(commonConfig.timeout), function (err) {
      logger.error(postData.requestId + 'Request Set Timeout occured after ' + commonConfig.timeout + ' milliseconds. Error details: ' + err);
      reqHttp.abort();
      if(callback) {
        callback(err);
      }
    });

    // request error
    reqHttp.on('error', function (err) {
      if (err.code === "ECONNRESET") {
        logger.error(postData.requestId + 'Request Error Timeout occured after ' + commonConfig.timeout + ' milliseconds. Error details: ' + err);
      } else {
        logger.error(postData.requestId + err);
      }
      if(callback) {
        callback(err);
      }
    });
    //send request witht the postData form
    reqHttp.write(postData);
    reqHttp.end();

    // Do not wait for response. Response will be logged  for satus check
    logger.info(postData.requestId + ' For endpoint [' + endPoint + '] request is sent. ');

};

module.exports = {
    sendHttpRequest: sendHttpRequest
};
