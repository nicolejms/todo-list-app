function App() {
    const { Container, Row, Col } = ReactBootstrap;
    return (
        <Container>
            <Row>
                <Col md={{ offset: 3, span: 6 }}>
                    <TodoListCard />
                </Col>
            </Row>
        </Container>
    );
}

function TodoListCard() {
    const [items, setItems] = React.useState(null);

    React.useEffect(() => {
        fetch('/items')
            .then(r => r.json())
            .then(setItems);
    }, []);

    const onNewItem = React.useCallback(
        newItem => {
            setItems([...items, newItem]);
        },
        [items],
    );

    const onItemUpdate = React.useCallback(
        item => {
            const index = items.findIndex(i => i.id === item.id);
            setItems([
                ...items.slice(0, index),
                item,
                ...items.slice(index + 1),
            ]);
        },
        [items],
    );

    const onItemRemoval = React.useCallback(
        item => {
            const index = items.findIndex(i => i.id === item.id);
            setItems([...items.slice(0, index), ...items.slice(index + 1)]);
        },
        [items],
    );

    if (items === null) return 'Loading...';

    return (
        <React.Fragment>
            <AddItemForm onNewItem={onNewItem} />
            {items.length === 0 && (
                <p className="text-center">No items yet! Add one above!</p>
            )}
            {items.map(item => (
                <ItemDisplay
                    item={item}
                    key={item.id}
                    onItemUpdate={onItemUpdate}
                    onItemRemoval={onItemRemoval}
                />
            ))}
        </React.Fragment>
    );
}

function AddItemForm({ onNewItem }) {
    const { Form, InputGroup, Button } = ReactBootstrap;

    const [newItem, setNewItem] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);

    const submitNewItem = e => {
        e.preventDefault();
        setSubmitting(true);
        fetch('/items', {
            method: 'POST',
            body: JSON.stringify({ name: newItem }),
            headers: { 'Content-Type': 'application/json' },
        })
            .then(r => r.json())
            .then(item => {
                onNewItem(item);
                setSubmitting(false);
                setNewItem('');
            });
    };

    return (
        <Form onSubmit={submitNewItem}>
            <InputGroup className="mb-3">
                <Form.Control
                    value={newItem}
                    onChange={e => setNewItem(e.target.value)}
                    type="text"
                    placeholder="New Item"
                    aria-describedby="basic-addon1"
                />
                <InputGroup.Append>
                    <Button
                        type="submit"
                        variant="success"
                        disabled={!newItem.length}
                        className={submitting ? 'disabled' : ''}
                    >
                        {submitting ? 'Adding...' : 'Add Item'}
                    </Button>
                </InputGroup.Append>
            </InputGroup>
        </Form>
    );
}

function ItemDisplay({ item, onItemUpdate, onItemRemoval }) {
    const { Container, Row, Col, Button, Spinner } = ReactBootstrap;
    const fileInputRef = React.useRef(null);
    const [uploading, setUploading] = React.useState(false);
    const [expanded, setExpanded] = React.useState(false);
    const [attachments, setAttachments] = React.useState(null);
    const [count, setCount] = React.useState(
        typeof item.attachmentCount === 'number' ? item.attachmentCount : null,
    );

    const refreshAttachments = React.useCallback(() => {
        return fetch(`/items/${item.id}/attachments`)
            .then(r => r.json())
            .then(rows => {
                setAttachments(rows);
                setCount(rows.length);
                return rows;
            });
    }, [item.id]);

    React.useEffect(() => {
        if (count === null) {
            refreshAttachments();
        }
    }, [count, refreshAttachments]);

    const toggleCompletion = () => {
        fetch(`/items/${item.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: item.name,
                completed: !item.completed,
            }),
            headers: { 'Content-Type': 'application/json' },
        })
            .then(r => r.json())
            .then(onItemUpdate);
    };

    const removeItem = () => {
        fetch(`/items/${item.id}`, { method: 'DELETE' }).then(() =>
            onItemRemoval(item),
        );
    };

    const onAttachClick = () => {
        if (uploading) return;
        fileInputRef.current && fileInputRef.current.click();
    };

    const onFileSelected = e => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        setUploading(true);
        const form = new FormData();
        form.append('file', file);
        fetch(`/items/${item.id}/attachments`, {
            method: 'POST',
            body: form,
        })
            .then(r => {
                if (!r.ok) throw new Error('Upload failed');
                return r.json();
            })
            .then(() => refreshAttachments())
            .then(() => setExpanded(true))
            .catch(err => {
                console.error(err);
                alert('Attachment upload failed: ' + err.message);
            })
            .finally(() => setUploading(false));
    };

    const onToggleExpand = () => {
        const next = !expanded;
        setExpanded(next);
        if (next && attachments === null) refreshAttachments();
    };

    const onDeleteAttachment = att => {
        fetch(`/attachments/${att.id}`, { method: 'DELETE' }).then(() =>
            refreshAttachments(),
        );
    };

    return (
        <Container fluid className={`item ${item.completed && 'completed'}`}>
            <Row>
                <Col xs={1} className="text-center">
                    <Button
                        className="toggles"
                        size="sm"
                        variant="link"
                        onClick={toggleCompletion}
                        aria-label={
                            item.completed
                                ? 'Mark item as incomplete'
                                : 'Mark item as complete'
                        }
                    >
                        <i
                            className={`far ${
                                item.completed ? 'fa-check-square' : 'fa-square'
                            }`}
                        />
                    </Button>
                </Col>
                <Col xs={9} className="name">
                    {item.name}
                </Col>
                <Col xs={1} className="text-center">
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={onFileSelected}
                    />
                    <Button
                        size="sm"
                        variant="link"
                        onClick={onAttachClick}
                        aria-label="Attach file"
                        title="Attach file"
                        disabled={uploading}
                    >
                        {uploading ? (
                            <Spinner animation="border" size="sm" />
                        ) : (
                            <i className="fa fa-paperclip" />
                        )}
                    </Button>
                    {count > 0 && (
                        <span
                            onClick={onToggleExpand}
                            style={{
                                cursor: 'pointer',
                                marginLeft: 4,
                                fontSize: '0.75rem',
                                color: '#0d6efd',
                            }}
                            title={expanded ? 'Hide attachments' : 'Show attachments'}
                        >
                            ({count})
                        </span>
                    )}
                </Col>
                <Col xs={1} className="text-center remove">
                    <Button
                        size="sm"
                        variant="link"
                        onClick={removeItem}
                        aria-label="Remove Item"
                    >
                        <i className="fa fa-trash text-danger" />
                    </Button>
                </Col>
            </Row>
            {expanded && attachments && attachments.length > 0 && (
                <Row>
                    <Col xs={{ offset: 1, span: 10 }}>
                        <ul style={{ paddingLeft: '1rem', marginBottom: '0.25rem' }}>
                            {attachments.map(att => (
                                <li key={att.id} style={{ fontSize: '0.85rem' }}>
                                    <a
                                        href={`/attachments/${att.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {att.filename}
                                    </a>{' '}
                                    <span style={{ color: '#888' }}>
                                        ({Math.max(1, Math.round(att.size / 1024))} KB)
                                    </span>{' '}
                                    <Button
                                        size="sm"
                                        variant="link"
                                        onClick={() => onDeleteAttachment(att)}
                                        aria-label="Remove attachment"
                                    >
                                        <i className="fa fa-times text-danger" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </Col>
                </Row>
            )}
        </Container>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));
