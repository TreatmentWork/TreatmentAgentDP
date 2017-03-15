var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var commonConfig = require(appRoot + '/config/commonConfig.json');
var dpConfig = require(appRoot + '/config/dpConfig.json');
var logger = require(appRoot + '/js/util/winstonConfig.js');
var httpClient = require(appRoot + '/js/httpClient.js');
var dpScan =  require(appRoot + '/js/dpScan.js')();

var app = express();
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
// parse application/json
app.use(bodyParser.json());

app.set('port', commonConfig.dpTreatmentAgentAppPort);
app.set('host', '127.0.0.1');

app.post('/datapower/treatment', function(req, res) {
	var requestId = req.body.requestId;
	var vmName = req.body.vmName;
	var configData = req.body.configData;
	//var scanFile = req.body.scanFile;
	var scanFiles = req.body.scanFiles;
	var reqIp = req.ip;
	logger.debug('scanFiles:' + scanFiles);
	logger.debug('scanFiles type:' + Object.prototype.toString.call(scanFiles));
	//var scanFiles = JSON.parse(scanFilesReq);
	logger.debug('DataPower request received from IP:' + reqIp);
	logger.debug('requestId:' + requestId + ', vmName:' + vmName + ', configData:' + configData +', scanFiles:' + scanFiles);
	res.send('Treament is being performed aysnchronously. Once treatment completes result will be sent to Treatment Controller.');
	var scanFilesFileOnly = [];
	var scanFilesDirOnly = [];
	for (var i=0; i<scanFiles.length ;i++) {
		if(fs.lstatSync(scanFiles[i]).isDirectory()) {
			scanFilesDirOnly.push(scanFiles[i]);
		} else {
			scanFilesFileOnly.push(scanFiles[i]);
		}
	}
	logger.debug('scanFilesDirOnly:' + scanFilesDirOnly);
	logger.debug('scanFilesFileOnly:' + scanFilesFileOnly);
	// 	for (var j=0; j<scanFilesDirOnly.length ;j++) {
	//  							// path specified is a directory
	// 						fs.readdir(scanFilesDirOnly[j], function(err, items) {
	// 							logger.debug('Files in the directory[' + scanFilesDirOnly[j] + '] are :' + items);
	// 							dpScan.scan_files(items,  function(a, good_files, bad_files) {
	// 											var finalBody = [];
	// 											finalBody.push({msg: "Multiple scan files aggregated result..." });
	// 											finalBody.push({msg: "DataPower Treatment Good files:" + good_files});
	// 											finalBody.push({msg: "DataPower Treatment Bad files:" + bad_files});
	// 											logger.info(requestId + 'Finished scan of multiple files.');
	// 											postData = {"requestId" : requestId, "vmName": vmName, "configData": configData, "result" : finalBody};
	// 											httpClient.sendHttpRequest(commonConfig.jsonContentType, postData, commonConfig.dpTreatmentResultEP, reqIp, commonConfig.treatmentControllerPort);
	// 									});
	// 						});
	// }
	dpScan.scan_files(scanFilesFileOnly,  function(a, good_files, bad_files) {
					var finalBody = [];
					finalBody.push({msg: "Multiple scan files aggregated result..." });
					finalBody.push({msg: "DataPower Treatment Good files:" + good_files});
					finalBody.push({msg: "DataPower Treatment Bad files:" + bad_files});
					logger.info(requestId + 'Finished scan of multiple files.');
					postData = {"requestId" : requestId, "vmName": vmName, "configData": configData, "result" : finalBody};
					httpClient.sendHttpRequest(commonConfig.jsonContentType, postData, commonConfig.dpTreatmentResultEP, reqIp, commonConfig.treatmentControllerPort);
		 	});

});

// Checking if supplied path is directory
var isDir = function (file, callback) {
	fs.stat(file, function (err, stats){
    if (err) {
      // Directory doesn't exist or something.
      logger.error('Directory doesn\'t exist ' + file);
    } else {
    	return callback(stats.isDirectory());
		}
  });
};

// Checking if supplied file path is valid
var validateInput = function  (file, callback) {
	fs.stat(file, function (err, stats){
    if (err) {
      logger.error(err);
			return callback(err);
    } else {
    	return callback(null, true);
		}
  });
};

var server = app.listen(app.get('port'), function (req, res){
  logger.info('Treatment Agent is listening on port ' + app.get('host') + ':' + app.get('port'));
});

// Never timeout as ClamAV scan could be very  long running process
server.timeout = 0;
