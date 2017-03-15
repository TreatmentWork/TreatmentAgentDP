// Module dependencies.
var __ = require('underscore');
var fs = require('fs');
var commonConfig = require(appRoot + '/config/commonConfig.json');
var dpConfig = require(appRoot + '/config/dpConfig.json');
var logger = require(appRoot + '/js/util/winstonConfig.js');
var httpClient = require(appRoot + '/js/httpClient.js');
var path = require('path');

// ****************************************************************************
// Scans an array of files or paths. You must provide the full paths of the
// files and/or paths.
// -----
// @param    Array        files        A list of files or paths (full paths) to be scanned.
// @param    Function    end_cb        What to do after the scan
// ****************************************************************************
function DPScanner() {
  logger.debug('In DPScanner constructor');
}
DPScanner.prototype.scan_files = function(files, end_cb) {
    files = files || [];
    end_cb = end_cb || null;

    var bad_files = [];
    var good_files = [];
    var completed_files = 0;
    var self = this;
    var file, file_list;

    // Verify second param, if supplied, is a function
    if (end_cb && typeof end_cb !== 'function') {
        throw new Error("Invalid end-scan callback provided. Second paramter, if provided, must be a function!");
    }

    // The function that actually scans the files
    var do_scan = function(files) {
        var num_files = files.length;

        console.log("Nodejs-DataPower-Scanner: Scanning a list of " + num_files + " passed files.");

        (function scan_file() {
            file = files.shift();
            self.doDPScan(file, function(err, file, infected) {
                completed_files++;

                console.log("Nodejs-DataPower-Scanner: " + completed_files + "/" + num_files + " have been scanned!");

                if(infected || err) {
                    bad_files.push(file);
                } else if(!infected ) {
                    good_files.push(file);
                }

                if(completed_files >= num_files) {
                        console.log('Nodejs-DataPower-Scanner: Scan Complete!');
                        console.log("Nodejs-DataPower-Scanner: Bad Files: " + bad_files);
                        console.log("Nodejs-DataPower-Scanner: Good Files: " + good_files);
                    if(__.isFunction(end_cb)) end_cb(null, good_files, bad_files);
                }
                // All files have not been scanned yet, scan next item.
                else {
                    setTimeout(scan_file, 0);
                }
            });
        })();
    };

    // If string is provided in files param create an array
    if (typeof files === 'string' && files.trim().length > 0) {
        files = files.trim().split(',').map(function(v) { return v.trim(); });
    }

    // Do some parameter validation
    if (!__.isArray(files) || files.length <= 0) {
        if (__.isEmpty(this.settings.file_list)) {
            var err = new Error("No files provided to scan and no file list provided!");
            return end_cb(err, [], []);
        }

        fs.exists(this.settings.file_list, function(exists) {
            if (exists === false) {
                var err = new Error("No files provided and file list provided ("+this.settings.file_list+") could not be found!");
                return end_cb(err, [], []);
            }

            fs.readFile(self.settings.file_list, function(err, data) {
                if (err) {
                    return end_cb(err, [], []);
                }
                data = data.toString().split(os.EOL);
                return do_scan(data);
            });
        });
    } else {
        return do_scan(files);
    }
};


// ****************************************************************************
// Checks if a particular file is infected.
// -----
// @param    String        file        Path to the file to check
// @param    Function    callback    (optional) What to do after the scan
// ****************************************************************************
DPScanner.prototype.doDPScan = function(file, callback) {
    // Verify second param, if supplied, is a function
    if (callback && typeof callback !== 'function') {
        throw new Error("Invalid callback provided. Second paramter, if provided, must be a function!");
    }

    // Verify string is passed to the file parameter
    if (typeof file !== 'string' || file.trim() === '') {
        var err = new Error("Invalid or empty file name provided.");
        if (callback && typeof callback === 'function') {
            return callback(err, '', null);
        } else {
            throw err;
        }
    }

    var self = this;

    console.log("Nodejs-ClamAv-Scanner: Scanning " + file);
    dpTreatment(file, callback);
    // Execute the clam binary with the proper flags
    // execFile(this.settings[this.scanner].path, this.build_clam_args(file), function(err, stdout, stderr) {
    //     if (err || stderr) {
    //         if (err) {
    //             if(err.hasOwnProperty('code') && err.code === 1) {
    //                 callback(null, file, true);
    //             } else {
    //                 if(self.settings.debug_mode)
    //                     console.log("Nodejs-ClamAv-Scanner: " + err);
    //                 callback(new Error(err), file, null);
    //             }
    //         } else {
    //             console.error("Nodejs-ClamAv-Scanner: " + stderr);
    //             callback(err, file, null);
    //         }
    //     } else {
    //         var result = stdout.trim();
    //
    //         if(self.settings.debug_mode) {
    //             console.log('Nodejs-ClamAv-Scanner: file size: ' + fs.statSync(file).size);
    //             console.log('Nodejs-ClamAv-Scanner: ' + result);
    //         }
    //         isDir(file, function(status) {
    //           if(!status) {
    //             if(result.match(/OK$/)) {
    //                 if(self.settings.debug_mode) {
    //                     console.log("Nodejs-ClamAv-Scanner: " + file + ' is OK!');
    //                   }
    //                 callback(null, file, false);
    //             } else {
    //                 if(self.settings.debug_mode) {
    //                     console.log("Nodejs-ClamAv-Scanner: " + file + ' is INFECTED!');
    //                   }
    //                 callback(null, file, true);
    //             }
    //         } else {
    //           if(self.settings.debug_mode) {
    //               console.log("Nodejs-ClamAv-Scanner: Directory scanning done!");
    //             }
    //           callback(null, result, null);
    //         }
    //       });
    //     }
    // });
};

function dpTreatment(file, callback) {
	fs.readFile(file, {encoding: 'utf-8'}, function(err,data){
		if (!err){
			// Send HTTP request to  DataPower XML Firewall Service
      logger.debug('sedning request to DP at localhost:'  );
			httpClient.sendHttpRequest(commonConfig.xmlContentType, data, dpConfig.dpServiceEP, 'localhost', dpConfig.dpServicePort, function(err, data) {
				if (err) {
					logger.error('DP HTTP call ended in error:' + err);
          callback(err, file, null);
				} else {
          var outputDir = '/mountshare/treatmentResult/';
          if (!fs.existsSync(outputDir)){
      		    fs.mkdirSync(outputDir);
      				logger.debug("Dir successfully created:" + outputDir);
      		} else {
      			logger.debug("Dir already  exists:" + outputDir);
      		}
            logger.debug("file path.basename(file):" + path.basename(file));
          var fileToWrite = outputDir  + path.basename(file);
          logger.debug("Going to write the output to file:" + fileToWrite);
          fs.writeFile(fileToWrite, data, function(err) {
            if(err) {
                return console.log(err);
            }
            console.log("The file was saved!" + outputDir  + file);
          });

          logger.debug('DP HTTP call sucessful:' + data);
          var findFault = data.search("Fault");
          logger.debug('findFault:' + findFault);
          if(findFault >0) {
              callback(null, file, true);
          } else {
              callback(null, file, false);
          }
				}
			});
		} else{
				logger.error(err);
        callback(err, file, null);
		}
	});
}


module.exports = function() {
    return new DPScanner();
};
