const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadBucketCommand,
    CreateBucketCommand,
} = require('@aws-sdk/client-s3');

const ENDPOINT = process.env.CONNECTION_ATTACHMENTS_ENDPOINT;
const KEY = process.env.CONNECTION_ATTACHMENTS_KEY;
const REGION = process.env.AWS_REGION || 'us-east-1';
const BUCKET = process.env.ATTACHMENTS_BUCKET || 'attachments';

let client;
let ready = false;

function isConfigured() {
    return ready;
}

async function init() {
    if (!ENDPOINT || !KEY) {
        console.warn(
            'Blob storage not configured (missing CONNECTION_ATTACHMENTS_ENDPOINT/KEY); attachment routes will return 503',
        );
        return;
    }

    client = new S3Client({
        endpoint: ENDPOINT,
        region: REGION,
        forcePathStyle: true,
        credentials: {
            accessKeyId: 'radius',
            secretAccessKey: KEY,
        },
    });

    try {
        await client.send(new HeadBucketCommand({ Bucket: BUCKET }));
    } catch (err) {
        if (err.$metadata && err.$metadata.httpStatusCode === 404) {
            await client.send(new CreateBucketCommand({ Bucket: BUCKET }));
        } else if (err.name !== 'NotFound' && err.name !== 'NoSuchBucket') {
            try {
                await client.send(new CreateBucketCommand({ Bucket: BUCKET }));
            } catch (createErr) {
                console.error('Failed to ensure attachments bucket', createErr);
                return;
            }
        }
    }

    ready = true;
    console.log(`Blob storage ready at ${ENDPOINT} (bucket: ${BUCKET})`);
}

async function putObject(key, body, contentType) {
    if (!ready) throw new Error('Blob storage not configured');
    await client.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: body,
            ContentType: contentType,
        }),
    );
}

async function getObject(key) {
    if (!ready) throw new Error('Blob storage not configured');
    const out = await client.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    );
    return out;
}

async function deleteObject(key) {
    if (!ready) throw new Error('Blob storage not configured');
    await client.send(
        new DeleteObjectCommand({ Bucket: BUCKET, Key: key }),
    );
}

module.exports = {
    init,
    isConfigured,
    putObject,
    getObject,
    deleteObject,
};
