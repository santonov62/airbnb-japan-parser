const parser = require('./src/parser');
const {refreshTime} = require('./config.json');

parser.start();
setInterval(() => parser.start(), refreshTime * 60000);
