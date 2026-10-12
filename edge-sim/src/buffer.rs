use serde::{de::DeserializeOwned, Serialize};
use std::{
    collections::VecDeque,
    fs::{self, OpenOptions},
    io::{self, BufRead, BufReader, Write},
    path::{Path, PathBuf},
};

#[derive(Debug)]
pub struct EdgeBuffer<T> {
    queue: VecDeque<T>,
    capacity: usize,
    pub queued_total: u64,
    pub flushed_total: u64,
    pub dropped_total: u64,
    persistence_path: Option<PathBuf>,
}
impl<T> EdgeBuffer<T> {
    pub fn new(capacity: usize) -> Self {
        Self {
            queue: VecDeque::new(),
            capacity,
            queued_total: 0,
            flushed_total: 0,
            dropped_total: 0,
            persistence_path: None,
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

    fn push(&mut self, row: T) {
        self.queued_total += 1;
        if self.capacity > 0 && self.queue.len() >= self.capacity {
            self.queue.pop_front();
            self.dropped_total += 1;
            eprintln!(
                "edge buffer dropped oldest row; dropped_total={}",
                self.dropped_total
            );
        }
        if self.capacity > 0 {
            self.queue.push_back(row);
        } else {
            self.dropped_total += 1;
            eprintln!(
                "edge buffer dropped row; dropped_total={}",
                self.dropped_total
            );
        }
    }
}

impl<T> EdgeBuffer<T>
where
    T: Serialize + DeserializeOwned,
{
    pub fn with_path(capacity: usize, path: impl AsRef<Path>) -> io::Result<Self> {
        let path = path.as_ref().to_path_buf();
        if let Some(parent) = path
            .parent()
            .filter(|parent| !parent.as_os_str().is_empty())
        {
            fs::create_dir_all(parent)?;
        }

        let mut buffer = Self {
            persistence_path: Some(path.clone()),
            ..Self::new(capacity)
        };
        if path.exists() {
            let reader = BufReader::new(fs::File::open(&path)?);
            for line in reader.lines() {
                let line = line?;
                if line.trim().is_empty() {
                    continue;
                }
                let row = serde_json::from_str(&line)
                    .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
                buffer.push(row);
            }
            buffer.persist_queue()?;
        }
        Ok(buffer)
    }
}

impl<T: Serialize> EdgeBuffer<T> {
    pub fn enqueue(&mut self, row: T) {
        self.push(row);
        if let (Some(path), Some(row)) = (&self.persistence_path, self.queue.back()) {
            let result = (|| {
                let mut file = OpenOptions::new().create(true).append(true).open(path)?;
                serde_json::to_writer(&mut file, row)
                    .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
                file.write_all(b"\n")
            })();
            if let Err(error) = result {
                eprintln!("edge buffer persistence append failed: {error}");
            }
        }
    }
}

impl<T: Serialize> EdgeBuffer<T> {
    pub fn persist_queue(&self) -> io::Result<()> {
        let Some(path) = &self.persistence_path else {
            return Ok(());
        };
        let mut file = fs::File::create(path)?;
        for row in &self.queue {
            serde_json::to_writer(&mut file, row)
                .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
            file.write_all(b"\n")?;
        }
        file.flush()
    }
}
