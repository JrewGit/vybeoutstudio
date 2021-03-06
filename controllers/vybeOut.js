const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const VybeOut = require('../models/vybeOut');
const mongodbURI = require('../config/config');

// gridfs stream init
const conn = mongoose.createConnection(process.env.URI);
let gfs;
conn.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

// mongodb storage engine
/* istanbul ignore next */
const storage = new GridFsStorage({
  url: mongodbURI,
  file: (req, file) => new Promise((resolve, reject) => {
    crypto.randomBytes(16, (err, buf) => {
      if (err) {
        return reject(err);
      }
      const filename = buf.toString('hex') + path.extname(file.originalname);
      const fileInfo = {
        filename,
        bucketName: 'uploads',
      };
      resolve(fileInfo);
    });
  }),
});

const upload = multer({ storage });
const router = express.Router();


// GET Routes
router.get('/', (req, res) => {
  res.render('home');
});

router.get('/view', (req, res) => {
  VybeOut.find((err, vybeBeats) => {
    if (err) throw new Error('Something went wrong');
    res.render('view', { vybeBeats });
  });
});

router.get('/create', (req, res) => {
  res.render('create');
});

router.get('/contribute', (req, res) => {
  VybeOut.find((err, vybeBeats) => {
    if (err) throw new Error('Something went wrong');
    res.render('contribute', { vybeBeats });
  });
});

// POST Route
/* istanbul ignore next */
router.post('/create', upload.single('audio'), (req, res) => {
  VybeOut.create({
    Author: req.body.producerName, BeatName: req.body.beatName, Beat: req.file.filename, Contribute: req.body.contribute, Tempo: req.body.tempo,
  });
  res.status(201).end();
});

router.get('/api/data', (req, res) => {
  VybeOut.find({}, (err, vybeBeats) => {
    if (err) throw new Error('Something went wrong');
    res.json(vybeBeats);
  });
});

// route that streams audio from mongodb SUPER COOL!!!
/* istanbul ignore next */
router.get('/audio/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (err) throw new Error('file not there or something went wrong');
    const readstream = gfs.createReadStream(file.filename);
    readstream.pipe(res);
  });
});

module.exports = router;
