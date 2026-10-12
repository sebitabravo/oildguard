use oilguard_edge::buffer::EdgeBuffer;
use serde_json::json;

#[test]
fn persists_and_replays_queued_rows_after_restart() {
    let path = tempfile::NamedTempFile::new().unwrap().into_temp_path();

    {
        let mut buffer = EdgeBuffer::with_path(3, &path).unwrap();
        buffer.enqueue(json!({ "seq": 4 }));
        buffer.enqueue(json!({ "seq": 5 }));
    }

    let mut reopened: EdgeBuffer<serde_json::Value> = EdgeBuffer::with_path(3, &path).unwrap();
    assert_eq!(
        reopened.flush(),
        vec![json!({ "seq": 4 }), json!({ "seq": 5 })]
    );
    reopened.persist_queue().unwrap();

    let after_flush: EdgeBuffer<serde_json::Value> = EdgeBuffer::with_path(3, &path).unwrap();
    assert_eq!(after_flush.pending(), 0);
}

#[test]
fn full_buffer_drops_oldest_and_counts_the_drop() {
    let path = tempfile::NamedTempFile::new().unwrap().into_temp_path();
    let mut buffer = EdgeBuffer::with_path(2, &path).unwrap();

    buffer.enqueue(json!({ "seq": 1 }));
    buffer.enqueue(json!({ "seq": 2 }));
    buffer.enqueue(json!({ "seq": 3 }));

    assert_eq!(buffer.dropped_total, 1);
    assert_eq!(
        buffer.flush(),
        vec![json!({ "seq": 2 }), json!({ "seq": 3 })]
    );
}
