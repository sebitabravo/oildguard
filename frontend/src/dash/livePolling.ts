export interface LivePollingState {
  live: boolean;
  demoActive: boolean;
  hidden: boolean;
  inFlight: boolean;
}

export function shouldPollLive({ live, demoActive, hidden, inFlight }: LivePollingState): boolean {
  return live && !demoActive && !hidden && !inFlight;
}
