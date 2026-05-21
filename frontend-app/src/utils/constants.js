/**
 * Application Constants
 */

export const API_BASE = '/api';

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

const currentHost = window.location.host;

export const WS_URL = `${wsProtocol}//${currentHost}/ws`;

// export const WS_URL = `ws://${window.location.hostname}:8080`;

export const MQTT_BROKER_URL = `ws://${window.location.hostname}:9001/mqtt`;

export const MQTT_TOPICS = {
  LIVE_FRAME:      'lokatani/live/frame',
  ALERTS_NEW:      'lokatani/alerts/new',
  DETECT_UP:       'lokatani/detect/up',
  DETECT_DOWN:     'lokatani/detect/down',
  ALERTS_REQUEST:  'lokatani/alerts/request',
  ALERTS_RESPONSE: 'lokatani/alerts/response',
  DSS_REQUEST:     'lokatani/dss/request',
  DSS_RESPONSE:    'lokatani/dss/response',
};

export const PROTOCOL_LABELS = {
  HTTP: 'HTTP Polling',
  WS: 'WebSocket',
  MQTT: 'MQTT',
};

export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];

export const SEVERITY_COLORS = {
  critical: { bg: '#EF4444', text: '#FEE2E2' },
  high:     { bg: '#F97316', text: '#FFF7ED' },
  medium:   { bg: '#F59E0B', text: '#FFFBEB' },
  low:      { bg: '#3B82F6', text: '#EFF6FF' },
};
