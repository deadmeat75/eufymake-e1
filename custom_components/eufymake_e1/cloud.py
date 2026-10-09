"""Direct, verified-TLS Eufy cloud MQTT transport; no local broker required."""
import json
import os
import ssl
import threading
import time
import paho.mqtt.client as mqtt
from .protocol import BROKERS, build_app_frame, decrypt, parse_frame, subscribe_topics


class CloudError(Exception):
    """Connection failed without exposing credentials."""


class CloudAuthError(CloudError):
    """Cloud credentials were rejected."""


class CloudClient:
    def __init__(self, credentials, on_event):
        self.credentials = credentials
        self.on_event = on_event
        self.ready = threading.Event()
        self.stopping = threading.Event()
        self.error = None
        self.key = bytes.fromhex(credentials["secret_key"])
        client_id = f'pc_macos_AnkerMakeStudio_direct_{credentials["user_id"]}_{os.urandom(6).hex()}_{int(time.time() * 1000)}'
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=client_id, clean_session=True, protocol=mqtt.MQTTv311)
        self.client.username_pw_set("eufy_" + credentials["user_id"], credentials["email"])
        self.client.tls_set_context(ssl.create_default_context(cadata=credentials["ca_pem"]))
        self.client.reconnect_delay_set(min_delay=2, max_delay=60)
        self.client.on_connect = self._on_connect
        self.client.on_subscribe = self._on_subscribe
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect

    def start(self):
        self.client.connect_async(BROKERS[self.credentials["region"]], 8789, keepalive=60)
        self.client.loop_start()
        if not self.ready.wait(20):
            self.stop()
            raise CloudError("Connection timed out")
        if self.error:
            self.stop()
            raise self.error

    def stop(self):
        self.stopping.set()
        self.client.disconnect()
        self.client.loop_stop()

    def query(self):
        if not self.client.is_connected() or self.stopping.is_set():
            return
        frame = build_app_frame(self.key, b'{"commandType":1027,"value":0}')
        self.client.publish('/device/maker/' + self.credentials['serial'] + '/query', frame)

    def _on_connect(self, client, userdata, flags, reason, properties):
        if reason != 0:
            was_ready = self.ready.is_set()
            self.error = CloudAuthError("Cloud authentication failed")
            self.ready.set()
            self.on_event("auth_failed" if was_ready else "disconnected", None)
            return
        self.error = None
        result, mid = client.subscribe([(topic, 0) for topic in subscribe_topics(self.credentials["serial"], self.credentials["user_id"])])
        if result != mqtt.MQTT_ERR_SUCCESS:
            self.error = CloudError("Subscription failed")
            self.ready.set()

    def _on_subscribe(self, client, userdata, mid, reasons, properties):
        if any(reason.is_failure for reason in reasons):
            was_ready = self.ready.is_set()
            self.error = CloudAuthError("Subscriptions rejected")
            self.ready.set()
            self.on_event("auth_failed" if was_ready else "disconnected", None)
            return
        self.on_event("connected", None)
        self.query()
        self.ready.set()

    def _on_disconnect(self, client, userdata, flags, reason, properties):
        self.on_event("disconnected", None)

    def _on_message(self, client, userdata, message):
        if self.stopping.is_set():
            return
        try:
            frame = parse_frame(message.payload)
            if not frame.checksum_ok or frame.packet_type != 0xC0:
                return
            payload = json.loads(decrypt(self.key, frame.ciphertext))
            items = payload if isinstance(payload, list) else [payload]
            for item in items:
                if isinstance(item, dict) and item.get("commandType") in (1000, 1001, 1068, 1100):
                    self.on_event("message", item)
        except (ValueError, TypeError, IndexError, UnicodeError):
            # Unrecognized/fragmented/invalid frames never become entity readings.
            return
