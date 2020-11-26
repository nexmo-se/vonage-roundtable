require('dotenv').config();

const axios = require('axios');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const helmet = require('helmet');
const { v4: uuid } = require('uuid');
const OpenTok = require('opentok');

const DatabaseService = require('./database');

const port = process.env.PORT || 8080;
const apiKey = process.env.API_KEY;
const apiSecret = process.env.API_SECRET;
const sessionId = process.env.SESSION_ID;
const sessionExpiryDelay = parseInt(process.env.SESSION_EXPIRY_DELAY || '90000', 10);

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

const createSession = () => new Promise((resolve, reject) => {
  const options = { mediaMode: 'routed' };
  client.createSession(options, (error, session) => {
    if (error) {
      reject(error);
    } else {
      const { sessionId } = session;
      resolve(sessionId);
    }
  })
});

const getRoomSessionId = async (room) => {
  const { RoomSession } = DatabaseService.models;
  try {
    const query = {
      where: {
        room,
        deleted: 0,
      },
      order: [['lastPing', 'DESC']],
    };
    const roomSessionRaw = await RoomSession.findOne(query);
    if (roomSessionRaw == null) {
      console.log(`No such session: ${room}`)
      return Promise.resolve(null);
    }

    const roomSession = roomSessionRaw.dataValues;
    const currentTime = Math.floor(new Date().getTime() / 1000);
    if ((roomSession.lastPing + sessionExpiryDelay) < currentTime) {
      console.log(`Room session has expired`);
      return Promise.resolve(null);
    }
    
    
    console.log('Updating last ping');
    roomSessionRaw.lastPing = currentTime;
    await roomSessionRaw.save();

    return Promise.resolve(roomSession.sessionId);
  } catch (error) {
    return Promise.reject(error);
  }
};

const createRoomSession = async (room, sessionId) => {
  const { RoomSession } = DatabaseService.models;
  try {
    await RoomSession.create({
      id: uuid(),
      room,
      sessionId,
      lastPing: Math.floor(new Date().getTime() / 1000),
      deleted: 0,
    });
    return Promise.resolve(sessionId);
  } catch (error) {
    return Promise.reject(error);
  }
}

app.get('/token', async (req, res, next) => {
  try {
    const { RoomSession } = DatabaseService.models;
    const { room } = req.query;

    let sanitizedSessionId = sessionId;
    if (room != null && room != '') {
      console.log(`Getting token for room: ${room}`);
      const roomSessionId = await getRoomSessionId(room);
      if (roomSessionId == null) {
        console.log('creating new session');
        const newSessionId = await createSession();
        await createRoomSession(room, newSessionId);
        sanitizedSessionId = newSessionId;
      } else {
        console.log('using existing session');
        sanitizedSessionId = roomSessionId;
      }
    }

    const token = client.generateToken(sanitizedSessionId);
    res.json({
      apiKey,
      sessionId: sanitizedSessionId,
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
