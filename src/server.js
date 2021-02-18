require('dotenv').config();

const axios = require('axios');
const libRequest = require('request');
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
const authEmailDomains = (process.env.AUTH_EMAIL_DOMAINS || '*').split(/,/g);
const secretToken = process.env.SECRET_TOKEN;
const roundtableHost = process.env.ROUNDTABLE_HOST;
const transcriptionHost = process.env.TRANSCRIPTION_HOST;

const client = new OpenTok(apiKey, apiSecret);

// Always use UTC Timezone
process.env.TZ = 'Etc/UTC';
const requestMaxSize = '150mb';

const app = express();

app.set('trust proxy', true);
// app.use(helmet());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true, limit: requestMaxSize }));
app.use(bodyParser.json({ limit: requestMaxSize }));

app.use('/', express.static('public'));
app.get('/success', (_, res) => res.send('You have successfully deployed the Vonage Roundtable Application'));

const authenticate = async (req, res, next) => {
  try {
    const { headers } = req;
    const authorizationHeader = headers['authorization'];
  
    const { room } = req.query;
    if (room.charAt(0) !== '_') {
      next();
      return;
    }
  
    console.log('Requires Authentication');
  
    if (authorizationHeader == null || authorizationHeader === '' || authorizationHeader.indexOf('Bearer ') !== 0) {
      res.status(401).send('not authenticated');
      return;
    }
  
    const token = authorizationHeader.slice('Bearer '.length);

    if (secretToken != null && secretToken != '' && token === secretToken) {
      // Match Secret Token, authenticated
      console.log('Matched Secret Token');
      next();
      return;
    }

    const validateResult = await validateGoogleIdToken(token);
    const { email } = validateResult;

    const atIndex = email.indexOf('@');
    const emailDomain = email.slice(atIndex + 1);

    // Must Fit Specific Domains
    let emailDomainAllowed = false;
    for (let i = 0; i < authEmailDomains.length; i += 1) {
      const authEmailDomain = authEmailDomains[i];
      if (authEmailDomain === '*') {
        // Wildcard, all domains are allowed
        emailDomainAllowed = true;
        break;
      } else if (authEmailDomain === emailDomain) {
        // Matching email domain
        emailDomainAllowed = true;
        break;
      }
    }

    if (!emailDomainAllowed) {
      res.status(403).send('domain not allowed');
      return;
    }

    next();
  } catch (error) {
    console.error(error);
    next(error);
  }
}

const validateGoogleIdToken = async (token) => {
  try {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`;
    const response = await axios.get(url);
    return Promise.resolve(response.data);
  } catch (error) {
    return Promise.reject(error);
  }
}

const sendMuteAllSignal = (sessionId) => new Promise((resolve, reject) => {
  client.signal(sessionId, null, { type: 'muteall', data: 'muteall' }, (error) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
});

const sendTranscriptionSignal = (sessionId, transcription) => new Promise((resolve, reject) => {
  client.signal(sessionId, null, { type: 'transcription', data: transcription }, (error) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
});

const listArchives = (sessionId) => new Promise((resolve, reject) => {
  const options = { sessionId };
  client.listArchives(options, (error, archives) => {
    if (error) {
      reject(error);
    } else {
      resolve(archives);
    }
  });
});

const getArchiveById = (archiveId) => new Promise((resolve, reject) => {
  const options = { sessionId };
  client.getArchive(archiveId, (error, archive) => {
    if (error) {
      reject(error);
    } else {
      resolve(archive);
    }
  });
});

const getArchive = async (sessionId) => {
  try {
    const archives = await listArchives(sessionId);
    for (let i = 0; i < archives.length; i += 1) {
      const archive = archives[i];
      const { status } = archive;
      if (status === 'started' || status === 'paused') {
        return Promise.resolve(archive);
      }
    }

    return Promise.resolve(null);
  } catch (error) {
    return Promise.reject(error);
  }
}

const startArchive = (sessionId) => new Promise((resolve, reject) => {
  client.startArchive(sessionId, { resolution: '1280x720' }, (error, archive) => {
    if (error) {
      reject(error);
    } else {
      resolve(archive);
    }
  });
});

const stopArchiveById = (archiveId) => new Promise((resolve, reject) => {
  client.stopArchive(archiveId, (error, archive) => {
    if (error) {
      reject(error);
    } else {
      resolve(archive);
    }
  });
});

const stopArchive = async (sessionId) => {
  try {
    const archive = await getArchive(sessionId);
    if (archive == null) {
      return Promise.reject(new Error('No on-going archive for session'));
    }

    const archiveId = archive.id;
    const stoppedArchive = await stopArchiveById(archiveId);
    return Promise.resolve(stoppedArchive);
  } catch (error) {
    return Promise.reject(error);
  }
}

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

const getRoomSession = async (room) => {
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
      return Promise.resolve({});
    }

    const roomSession = roomSessionRaw.dataValues;
    const currentTime = Math.floor(new Date().getTime() / 1000);
    if ((roomSession.lastPing + sessionExpiryDelay) < currentTime) {
      console.log(`Room session has expired`);
      return Promise.resolve({});
    }
    
    
    console.log('Updating last ping');
    roomSessionRaw.lastPing = currentTime;
    await roomSessionRaw.save();

    return Promise.resolve(roomSession);
  } catch (error) {
    return Promise.reject(error);
  }
};

const createRoomSession = async (room, sessionId) => {
  const { RoomSession } = DatabaseService.models;
  try {
    const roomSessionRaw = await RoomSession.create({
      id: uuid(),
      room,
      sessionId,
      lastPing: Math.floor(new Date().getTime() / 1000),
      muteOnJoin: false,
      deleted: 0,
    });
    const roomSession = roomSessionRaw.dataValues;
    return Promise.resolve(roomSession);
  } catch (error) {
    return Promise.reject(error);
  }
}

app.get('/token', authenticate, async (req, res, next) => {
  try {
    const { RoomSession } = DatabaseService.models;
    const { room } = req.query;

    let sanitizedSessionId = sessionId;
    let muteOnJoin = false;

    if (room != null && room != '') {
      console.log(`Getting token for room: ${room}`);
      const { sessionId: roomSessionId, muteOnJoin: roomMuteOnJoin } = await getRoomSession(room);
      if (roomSessionId == null) {
        console.log('creating new session');
        const newSessionId = await createSession();
        const { sessionId: newRoomSessionId, muteOnJoin: newRoomMuteOnJoin } = await createRoomSession(room, newSessionId);
        sanitizedSessionId = newRoomSessionId;
        muteOnJoin = newRoomMuteOnJoin;
      } else {
        console.log('using existing session');
        sanitizedSessionId = roomSessionId;
        muteOnJoin = roomMuteOnJoin;
      }
    }

    const token = client.generateToken(sanitizedSessionId);
    res.json({
      apiKey,
      sessionId: sanitizedSessionId,
      token,
      muteOnJoin,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

app.get('/muteAll', authenticate, async (req, res, next) => {
  try {
    const { room, mute = 'true' } = req.query;
    const { sessionId } = await getRoomSession(room);

    const boolMute = mute === 'true';

    // Update to Database
    const { RoomSession } = DatabaseService.models;
    const query = { where: { sessionId } };
    const changes = { muteOnJoin: boolMute };
    await RoomSession.update(changes, query);

    // Send Signal to Everyone if needs to mute
    if (boolMute) {
      console.log('Sending Mute All Signal');
      await sendMuteAllSignal(sessionId);
    }
    res.send('ok');
  } catch (error) {
    console.log(error);
    next(error);
  }
});

app.get('/archives/:archiveId/download', async (req, res, next) => {
  try {
    const { archiveId } = req.params;
    const archive = await getArchiveById(archiveId)
    const { url } = archive;
    
    console.log(`Archive to Download: ${archiveId}`);
    libRequest.get(url).pipe(res);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

app.get('/archives', async (req, res, next) => {
  try {
    const { sessionId } = req.query;
    const archives = await listArchives(sessionId);
    
    res.json(archives);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

app.post('/archives', async (req, res, next) => {
  try {
    const { sessionId, action } = req.body;
    if (action === 'start') {
      const archive = await startArchive(sessionId);
      res.json(archive);
    } else if (action === 'stop') {
      const archive = await stopArchive(sessionId);
      res.json(archive);
    } else {
      res.status(400).send('unknown action');
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

app.get('/transcribeHost', async (req, res, next) => {
  try {
    res.json({ host: transcriptionHost });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

app.post('/gcallback', async (req, res) => {
  console.log(req.query);
  console.log(req.body);
  res.send('ok');
});

app.get('/gcallback', async (req, res) => {
  console.log(req.query);
  res.send('ok');
});

// Create Application HTTP Server
const httpServer = http.createServer(app);
httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
