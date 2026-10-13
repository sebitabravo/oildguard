use oilguard_edge::engine::{record_mqtt_event, Stats};
use rumqttc::{ConnAck, ConnectReturnCode, Event, Outgoing, Packet};

#[test]
fn counts_successful_connack_reconnects_but_not_initial_connection() {
    let stats = Stats::default();
    let mut connected = false;
    let connack = Event::Incoming(Packet::ConnAck(ConnAck::new(
        ConnectReturnCode::Success,
        false,
    )));

    record_mqtt_event(&stats, &mut connected, &connack);
    assert_eq!(stats.reconnects.load(std::sync::atomic::Ordering::Relaxed), 0);

    record_mqtt_event(&stats, &mut connected, &Event::Outgoing(Outgoing::PingReq));
    assert_eq!(stats.reconnects.load(std::sync::atomic::Ordering::Relaxed), 0);

    record_mqtt_event(&stats, &mut connected, &connack);
    assert_eq!(stats.reconnects.load(std::sync::atomic::Ordering::Relaxed), 1);
}
