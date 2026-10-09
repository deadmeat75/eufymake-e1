# Changelog

## 0.2.0 — native integration preview

- Replace the standalone Supervisor app with a HACS-structured native integration.
- Connect directly to cloud MQTT; remove local MQTT and Prometheus dependencies.
- Add native sensors, editable persisted date entities, guided Studio import and reauthentication.
- Bundle the graphical card and an automatic sidebar panel.
- Preserve existing legacy setup by using printer-specific integration entity IDs.
- Add decoding, credential and HA boundary tests. Real Home Assistant/printer validation remains pending.
