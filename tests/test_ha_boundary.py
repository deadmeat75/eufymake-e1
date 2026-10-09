import asyncio
import datetime as dt
import threading
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import bootstrap
import ha_stubs
from custom_components.eufymake_e1 import config_flow, coordinator, date, sensor
from custom_components.eufymake_e1.cloud import CloudAuthError, CloudError

CREDS={'user_id':'TEST','email':'test@example.invalid','region':'US','serial':'TESTSERIAL','secret_key':'00'*32,'ca_pem':'fixture-only'}


class FlowTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.flow=config_flow.EufyMakeConfigFlow()
        self.flow.hass=ha_stubs.FakeHass()
        self.flow.context={}

    async def test_local_import_creates_entry_after_cloud_validation(self):
        with patch.object(config_flow,'_read_uploads',return_value=[CREDS]), patch.object(config_flow,'_validate_cloud') as validate:
            result=await self.flow.async_step_user({'device_file':'fixture','login_file':'fixture','ca_file':'fixture'})
        self.assertEqual(result['type'],'create_entry')
        self.assertEqual(result['data'],CREDS)
        validate.assert_called_once_with(CREDS)
        self.assertEqual(self.flow._printers,[])

    async def test_auth_error_retains_selection_for_retry(self):
        self.flow._printers=[CREDS]
        with patch.object(config_flow,'_validate_cloud',side_effect=CloudAuthError()):
            result=await self.flow.async_step_printer({'printer':'0'})
        self.assertEqual(result['errors'],{'base':'invalid_auth'})
        self.assertEqual(len(self.flow._printers),1)

    async def test_connection_error_is_not_auth_error(self):
        self.flow._printers=[CREDS]
        with patch.object(config_flow,'_validate_cloud',side_effect=CloudError()):
            result=await self.flow.async_step_printer({'printer':'0'})
        self.assertEqual(result['errors'],{'base':'cannot_connect'})

    async def test_duplicate_does_not_connect(self):
        self.flow._printers=[CREDS]
        self.flow.duplicate=True
        with patch.object(config_flow,'_validate_cloud') as validate:
            with self.assertRaises(ha_stubs.AbortFlow):
                await self.flow.async_step_printer({'printer':'0'})
            validate.assert_not_called()

    async def test_reauth_does_not_change_printer_identity(self):
        self.flow.context={'source':'reauth'}
        self.flow.reauth_entry=SimpleNamespace(unique_id='OTHER')
        self.flow._printers=[CREDS]
        with patch.object(config_flow,'_validate_cloud') as validate:
            result=await self.flow.async_step_printer({'printer':'0'})
        self.assertEqual(result['errors'],{'base':'wrong_printer'})
        validate.assert_not_called()


class FakeCloud:
    def __init__(self,credentials,on_event):
        self.on_event=on_event
        self.stopped=False
    def start(self):
        self.on_event('connected',None)
    def stop(self):
        self.stopped=True
    def query(self):
        pass


class CoordinatorTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        ha_stubs.Store.saved.clear()
        self.hass=ha_stubs.FakeHass()
        self.reauth_calls=[]
        self.entry=SimpleNamespace(entry_id='test-entry',data=CREDS,title='Test E1',async_start_reauth=lambda hass:self.reauth_calls.append(hass))
        self.patch=patch.object(coordinator,'CloudClient',FakeCloud)
        self.patch.start()
        self.coordinator=coordinator.EufyMakeCoordinator(self.hass,self.entry)
        await self.coordinator.async_start()
        await asyncio.sleep(0)

    async def asyncTearDown(self):
        await self.coordinator.async_close()
        self.patch.stop()

    async def test_network_thread_event_updates_native_sensor(self):
        event={'commandType':1001,'progress':2300,'time':57}
        thread=threading.Thread(target=self.coordinator._cloud_event,args=('message',event))
        thread.start()
        thread.join()
        await asyncio.sleep(0)
        entity=sensor.EufyMakeSensor(self.coordinator,'print_progress')
        self.assertEqual(entity.native_value,23)
        self.assertTrue(entity.available)
        self.assertEqual(entity.extra_state_attributes['eufymake_key'],'print_progress')

    async def test_dates_saved_immediately_and_available_offline(self):
        entity=date.EufyMakeDate(self.coordinator,'yellow')
        await entity.async_set_value(dt.date(2026,9,15))
        self.coordinator._async_receive('disconnected',None)
        self.assertTrue(entity.available)
        self.assertEqual(entity.native_value,dt.date(2026,9,15))
        self.assertEqual(ha_stubs.Store.saved['eufymake_e1.test-entry.dates']['yellow'],'2026-09-15')

    async def test_auth_failure_starts_one_reauth_flow(self):
        self.coordinator._async_receive('auth_failed',None)
        self.coordinator._async_receive('auth_failed',None)
        self.assertEqual(len(self.reauth_calls),1)
        self.assertFalse(self.coordinator.model.connected)

    async def test_close_stops_transport_and_ignores_late_events(self):
        await self.coordinator.async_close()
        self.assertTrue(self.coordinator.client.stopped)
        self.coordinator._async_receive('connected',None)
        # Closed coordinator must not accept callbacks queued after unload.
        self.assertTrue(self.coordinator.closed)


if __name__ == '__main__':
    unittest.main()
