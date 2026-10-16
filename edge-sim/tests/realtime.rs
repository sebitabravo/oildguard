use oilguard_edge::engine::{self, EngineConfig};
use std::{sync::Arc, time::Duration};
use tokio::time;

#[tokio::test(start_paused = true)]
async fn zero_second_realtime_config_generates_first_row() {
    let config = EngineConfig {
        devices: 100,
        rate_hz: 10.0,
        seconds: 0.0,
        mode_realtime: true,
        shards: 1,
        ..Default::default()
    };
    let stats = Arc::new(engine::Stats::default());
    let task = {
        let stats = stats.clone();
        tokio::spawn(async move { engine::run_with_stats(config, None, stats).await })
    };

    time::advance(Duration::from_millis(100)).await;
    tokio::task::yield_now().await;

    let generated = stats
        .rows_generated
        .load(std::sync::atomic::Ordering::Relaxed);
    task.abort();
    assert!(generated > 0, "realtime generation produced no first row");
}
