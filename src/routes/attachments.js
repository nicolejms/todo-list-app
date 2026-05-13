const { v4: uuid } = require('uuid');
const db = require('../persistence');
const blob = require('../persistence/blobStorage');

function notReady(res) {
    res.status(503).json({ error: 'Blob storage not configured' });
}

async function uploadAttachment(req, res) {
    if (!blob.isConfigured()) return notReady(res);
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const item = await db.getItem(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const id = uuid();
    const blobKey = `${item.id}/${id}/${req.file.originalname}`;

    try {
        await blob.putObject(blobKey, req.file.buffer, req.file.mimetype);
    } catch (err) {
        console.error('Blob upload failed', err);
        return res.status(500).json({ error: 'Upload failed' });
    }

    const att = {
        id,
        item_id: item.id,
        filename: req.file.originalname,
        content_type: req.file.mimetype || 'application/octet-stream',
        size: req.file.size,
        blob_key: blobKey,
        created_at: Date.now(),
    };
    await db.addAttachment(att);

    res.status(201).json(att);
}

async function listAttachments(req, res) {
    const rows = await db.listAttachmentsForItem(req.params.id);
    res.json(rows);
}

async function downloadAttachment(req, res) {
    if (!blob.isConfigured()) return notReady(res);

    const att = await db.getAttachment(req.params.id);
    if (!att) return res.status(404).json({ error: 'Attachment not found' });

    let out;
    try {
        out = await blob.getObject(att.blob_key);
    } catch (err) {
        console.error('Blob fetch failed', err);
        return res.status(500).json({ error: 'Download failed' });
    }

    res.setHeader('Content-Type', att.content_type || 'application/octet-stream');
    res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(att.filename)}"`,
    );
    if (out.ContentLength) res.setHeader('Content-Length', out.ContentLength);
    out.Body.pipe(res);
}

async function deleteAttachment(req, res) {
    const att = await db.getAttachment(req.params.id);
    if (!att) return res.status(404).json({ error: 'Attachment not found' });

    if (blob.isConfigured()) {
        try {
            await blob.deleteObject(att.blob_key);
        } catch (err) {
            console.warn('Blob delete failed (continuing)', err);
        }
    }

    await db.removeAttachment(att.id);
    res.sendStatus(204);
}

module.exports = {
    uploadAttachment,
    listAttachments,
    downloadAttachment,
    deleteAttachment,
};
