use std::collections::VecDeque;

#[derive(Debug)]
pub struct EdgeBuffer<T> {
    queue: VecDeque<T>,
    capacity: usize,
    pub queued_total: u64,
    pub flushed_total: u64,
    pub dropped_total: u64,
}
impl<T> EdgeBuffer<T> {
    pub fn new(capacity: usize) -> Self {
        Self {
            queue: VecDeque::new(),
            capacity,
            queued_total: 0,
            flushed_total: 0,
            dropped_total: 0,
        }
    }
    pub fn enqueue(&mut self, row: T) {
        self.queued_total += 1;
        if self.capacity > 0 && self.queue.len() >= self.capacity {
            self.queue.pop_front();
            self.dropped_total += 1;
        }
        if self.capacity > 0 {
            self.queue.push_back(row);
        } else {
            self.dropped_total += 1;
        }
    }
    pub fn flush(&mut self) -> Vec<T> {
        let out: Vec<_> = self.queue.drain(..).collect();
        self.flushed_total += out.len() as u64;
        out
    }
    pub fn pending(&self) -> usize {
        self.queue.len()
    }
}
