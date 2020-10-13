require('dotenv').config();

const axios = require('axios');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const helmet = require('helmet');
const OpenTok = require('opentok');

const port = process.env.PORT || 8080;
const apiKey = process.env.API_KEY;
const apiSecret = process.env.API_SECRET;

const client = new OpenTok(apiKey, apiSecret);

// Always use UTC Timezone
process.env.TZ = 'Etc/UTC';
const requestMaxSize = '150mb';

const app = express();

app.set('trust proxy', true);
app.use(helmet());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true, limit: requestMaxSize }));
app.use(bodyParser.json({ limit: requestMaxSize }));

app.use('/', express.static('public'));
app.get('/success', (_, res) => res.send('You have successfully deployed the Simple Opentok Audio Level'));

app.get('/token', async (req, res, next) => {
  try {
    const { sessionId } = req.query;
    const token = client.generateToken(sessionId);
    res.json({
      apiKey,
      sessionId,
      token,
    });
  } catch (error) {
    next(error);
  }
});

// Create Application HTTP Server
const httpServer = http.createServer(app);
httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
