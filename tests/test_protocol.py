import json
from types import SimpleNamespace
import unittest
from unittest.mock import Mock
import bootstrap
from custom_components.eufymake_e1.protocol import build_app_frame, parse_frame, decrypt, subscribe_topics
from custom_components.eufymake_e1.cloud import CloudClient


class ProtocolTests(unittest.TestCase):
    def test_encrypted_round_trip(self):
        key = bytes(range(32))
        body = b'{"commandType":1027,"value":0}'
        frame = parse_frame(build_app_frame(key, body))
        self.assertTrue(frame.checksum_ok)
        self.assertEqual(decrypt(key,frame.ciphertext), body)

    def test_reject_truncated_frames(self):
        for body in (b'',b'MA',b'MA\x0c\x00'+b'\x00'*8):
            with self.assertRaises(ValueError):
                parse_frame(body)

    def test_checksum_detects_tampering(self):
        wire = bytearray(build_app_frame(bytes(32),b'{}'))
        wire[-1] ^= 1
        self.assertFalse(parse_frame(bytes(wire)).checksum_ok)

    def test_specific_topics_only(self):
        topics = subscribe_topics('TESTSERIAL','TESTUSER')
        self.assertEqual(len(topics),5)
        self.assertTrue(all('#' not in topic and '+' not in topic for topic in topics))

    def test_batched_messages_and_corrupt_frame(self):
        transport = object.__new__(CloudClient)
        import threading
        transport.stopping = threading.Event()
        transport.key = bytes(32)
        transport.on_event = Mock()
        payload = [{'commandType':1000,'status':{'state':0,'step':0}}, {'commandType':1100,'ink':{}}]
        transport._on_message(None,None,SimpleNamespace(payload=build_app_frame(transport.key,json.dumps(payload).encode())))
        self.assertEqual(transport.on_event.call_count,2)
        corrupt = bytearray(build_app_frame(transport.key,b'{}'))
        corrupt[-1] ^= 1
        transport._on_message(None,None,SimpleNamespace(payload=bytes(corrupt)))
        self.assertEqual(transport.on_event.call_count,2)


if __name__ == '__main__':
    unittest.main()
