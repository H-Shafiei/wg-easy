'use strict';

const childProcess = require('child_process');

module.exports = class Util {

  static isValidIPv4(str) {
    const blocks = str.split('.');
    if (blocks.length !== 4) return false;

    for (let value of blocks) {
      value = parseInt(value, 10);
      if (Number.isNaN(value)) return false;
      if (value < 0 || value > 255) return false;
    }

    return true;
  }

  static promisify(fn) {
    // eslint-disable-next-line func-names
    return function(req, res) {
      Promise.resolve().then(async () => fn(req, res))
        .then((result) => {
          if (res.headersSent) return;

          if (typeof result === 'undefined') {
            return res
              .status(204)
              .end();
          }

          return res
            .status(200)
            .json(result);
        })
        .catch((error) => {
          if (typeof error === 'string') {
            error = new Error(error);
          }

          // eslint-disable-next-line no-console
          console.error(error);

          return res
            .status(error.statusCode || 500)
            .json({
              error: error.message || error.toString(),
              stack: error.stack,
            });
        });
    };
  }

  static async exec(cmd, {
    log = true,
  } = {}) {
    if (typeof log === 'string') {
      // eslint-disable-next-line no-console
      console.log(`$ ${log}`);
    } else if (log === true) {
      // eslint-disable-next-line no-console
      console.log(`$ ${cmd}`);
    }

    if (process.platform !== 'linux') {
      return '';
    }

    return new Promise((resolve, reject) => {
      childProcess.exec(cmd, {
        shell: 'bash',
      }, (err, stdout) => {
        if (err) return reject(err);
        return resolve(String(stdout).trim());
      });
    });
  }

  static findSmallestAvailableIp(serverIp, prefixLength, takenIps) {

    const ipToNumber = (ip) => {
      return ip.split('.').reduce((acc, part) => (acc << 8) + parseInt(part, 10), 0);
    };
    
    const numberToIp = (num) => {
      return [num >>> 24, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');
    };

    const serverIpNumber = ipToNumber(serverIp);
    const mask = ~(2 ** (32 - prefixLength) - 1);
    const rangeStart = serverIpNumber & mask;
    const rangeEnd = rangeStart | ~mask;

    const takenIpNumbers = new Set(takenIps.map(ipToNumber));
    takenIpNumbers.add(serverIpNumber)
    
    for (let ip = rangeStart; ip <= rangeEnd; ip++) {
      if (!takenIpNumbers.has(ip)) {
        return numberToIp(ip);
      }
    }

    return null; // No available IPs
  };

};
