const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const location = process.env.SQLITE_DB_LOCATION || '/etc/todos/todo.db';

let db, dbAll, dbRun;

function init() {
    const dirName = require('path').dirname(location);
    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
    }

    return new Promise((acc, rej) => {
        db = new sqlite3.Database(location, err => {
            if (err) return rej(err);

            if (process.env.NODE_ENV !== 'test')
                console.log(`Using sqlite database at ${location}`);

            db.run(
                'CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean)',
                (err, result) => {
                    if (err) return rej(err);
                    db.run(
                        'CREATE TABLE IF NOT EXISTS todo_attachments (id varchar(36) PRIMARY KEY, item_id varchar(36), filename varchar(255), content_type varchar(255), size integer, blob_key varchar(512), created_at integer)',
                        err2 => {
                            if (err2) return rej(err2);
                            acc();
                        },
                    );
                },
            );
        });
    });
}

async function teardown() {
    return new Promise((acc, rej) => {
        db.close(err => {
            if (err) rej(err);
            else acc();
        });
    });
}

async function getItems() {
    return new Promise((acc, rej) => {
        db.all('SELECT * FROM todo_items', (err, rows) => {
            if (err) return rej(err);
            acc(
                rows.map(item =>
                    Object.assign({}, item, {
                        completed: item.completed === 1,
                    }),
                ),
            );
        });
    });
}

async function getItem(id) {
    return new Promise((acc, rej) => {
        db.all('SELECT * FROM todo_items WHERE id=?', [id], (err, rows) => {
            if (err) return rej(err);
            acc(
                rows.map(item =>
                    Object.assign({}, item, {
                        completed: item.completed === 1,
                    }),
                )[0],
            );
        });
    });
}

async function storeItem(item) {
    return new Promise((acc, rej) => {
        db.run(
            'INSERT INTO todo_items (id, name, completed) VALUES (?, ?, ?)',
            [item.id, item.name, item.completed ? 1 : 0],
            err => {
                if (err) return rej(err);
                acc();
            },
        );
    });
}

async function updateItem(id, item) {
    return new Promise((acc, rej) => {
        db.run(
            'UPDATE todo_items SET name=?, completed=? WHERE id = ?',
            [item.name, item.completed ? 1 : 0, id],
            err => {
                if (err) return rej(err);
                acc();
            },
        );
    });
} 

async function removeItem(id) {
    return new Promise((acc, rej) => {
        db.run('DELETE FROM todo_items WHERE id = ?', [id], err => {
            if (err) return rej(err);
            acc();
        });
    });
}

async function addAttachment(att) {
    return new Promise((acc, rej) => {
        db.run(
            'INSERT INTO todo_attachments (id, item_id, filename, content_type, size, blob_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [att.id, att.item_id, att.filename, att.content_type, att.size, att.blob_key, att.created_at],
            err => {
                if (err) return rej(err);
                acc();
            },
        );
    });
}

async function listAttachmentsForItem(itemId) {
    return new Promise((acc, rej) => {
        db.all(
            'SELECT id, item_id, filename, content_type, size, blob_key, created_at FROM todo_attachments WHERE item_id = ? ORDER BY created_at ASC',
            [itemId],
            (err, rows) => {
                if (err) return rej(err);
                acc(rows);
            },
        );
    });
}

async function getAttachment(id) {
    return new Promise((acc, rej) => {
        db.all(
            'SELECT id, item_id, filename, content_type, size, blob_key, created_at FROM todo_attachments WHERE id = ?',
            [id],
            (err, rows) => {
                if (err) return rej(err);
                acc(rows[0]);
            },
        );
    });
}

async function removeAttachment(id) {
    return new Promise((acc, rej) => {
        db.run('DELETE FROM todo_attachments WHERE id = ?', [id], err => {
            if (err) return rej(err);
            acc();
        });
    });
}

async function removeAttachmentsForItem(itemId) {
    return new Promise((acc, rej) => {
        db.all(
            'SELECT id, blob_key FROM todo_attachments WHERE item_id = ?',
            [itemId],
            (err, rows) => {
                if (err) return rej(err);
                db.run(
                    'DELETE FROM todo_attachments WHERE item_id = ?',
                    [itemId],
                    err2 => {
                        if (err2) return rej(err2);
                        acc(rows || []);
                    },
                );
            },
        );
    });
}

module.exports = {
    init,
    teardown,
    getItems,
    getItem,
    storeItem,
    updateItem,
    removeItem,
    addAttachment,
    listAttachmentsForItem,
    getAttachment,
    removeAttachment,
    removeAttachmentsForItem,
};
