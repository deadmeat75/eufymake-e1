"""Ensure the upgrade removes only this entry's obsolete date entities."""
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch
import bootstrap
import ha_stubs
from custom_components.eufymake_e1 import migration


class MigrationTests(unittest.TestCase):
    def test_removal_is_scoped_and_idempotent(self):
        registry = Mock()
        target = SimpleNamespace(domain='date', platform='eufymake_e1',
            unique_id='printer_cyan_expiration_date', entity_id='date.renamed_cyan')
        others = [SimpleNamespace(domain='date', platform='other', unique_id=target.unique_id, entity_id='date.other'),
            SimpleNamespace(domain='sensor', platform='eufymake_e1', unique_id=target.unique_id, entity_id='sensor.cyan'),
            SimpleNamespace(domain='date', platform='eufymake_e1', unique_id='different_printer_cyan_expiration_date', entity_id='date.different')]
        with patch.object(migration.er,'async_get',return_value=registry,create=True), patch.object(
            migration.er,'async_entries_for_config_entry',side_effect=[[target,*others],others],create=True) as entries:
            for _ in range(2):
                migration.remove_legacy_date_entities(None,SimpleNamespace(entry_id='entry'),'printer')
            entries.assert_called_with(registry,'entry')
        registry.async_remove.assert_called_once_with('date.renamed_cyan')
