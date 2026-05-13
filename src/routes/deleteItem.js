const db = require('../persistence');
const blob = require('../persistence/blobStorage');

module.exports = async (req, res) => {
    const removed = await db.removeAttachmentsForItem(req.params.id);
    if (blob.isConfigured() && removed && removed.length) {
        await Promise.all(
            removed.map(a =>
                blob.deleteObject(a.blob_key).catch(err => {
                    console.warn('Blob delete failed (continuing)', err);
                }),
            ),
        );
    }
    await db.removeItem(req.params.id);
    res.sendStatus(200);
};
