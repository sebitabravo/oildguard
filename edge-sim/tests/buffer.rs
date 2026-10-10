use oilguard_edge::buffer::EdgeBuffer;

#[test]
fn flushes_in_order_and_drops_oldest() {
    let mut buffer = EdgeBuffer::new(2);
    buffer.enqueue("a");
    buffer.enqueue("b");
    buffer.enqueue("c");
    assert_eq!(buffer.pending(), 2);
    assert_eq!(buffer.flush(), vec!["b", "c"]);
    assert_eq!(buffer.queued_total, 3);
    assert_eq!(buffer.flushed_total, 2);
    assert_eq!(buffer.dropped_total, 1);
}
