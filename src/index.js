const express = require('express');
const multer = require('multer');
const app = express();
const db = require('./persistence');
const blob = require('./persistence/blobStorage');
const getItems = require('./routes/getItems');
const addItem = require('./routes/addItem');
const updateItem = require('./routes/updateItem');
const deleteItem = require('./routes/deleteItem');
const attachments = require('./routes/attachments');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
});

app.use(express.json());
app.use(express.static(__dirname + '/static'));

app.get('/items', getItems);
app.post('/items', addItem);
app.put('/items/:id', updateItem);
app.delete('/items/:id', deleteItem);

app.get('/items/:id/attachments', attachments.listAttachments);
app.post(
    '/items/:id/attachments',
    upload.single('file'),
    attachments.uploadAttachment,
);
app.get('/attachments/:id', attachments.downloadAttachment);
app.delete('/attachments/:id', attachments.deleteAttachment);

db.init()
    .then(() => blob.init())
    .then(() => {
        app.listen(3000, () => console.log('Listening on port 3000'));
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

const gracefulShutdown = () => {
    db.teardown()
        .catch(() => {})
        .then(() => process.exit());
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // Sent by nodemon
