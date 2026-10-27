import asyncio
import datetime as dt
import threading
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import bootstrap
import ha_stubs
from custom_components.eufymake_e1 import config_flow, coordinator, sensor
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
        self.assertEqual(entity.extra_state_attributes['reading_received'],self.coordinator.last_received)
        self.coordinator._async_receive('message', {'commandType':1105,'height':16.629375})
        height = sensor.EufyMakeSensor(self.coordinator,'surface_height')
        received = height.extra_state_attributes['reading_received']
        self.assertEqual(height._attr_native_unit_of_measurement,'mm')
        self.assertEqual(height.native_value,16.629375)
        self.coordinator._async_receive('disconnected',None)
        self.assertFalse(height.available)
        self.assertEqual(height.extra_state_attributes['reading_received'],received)

    async def test_date_sensor_is_read_only_and_available_offline(self):
        self.coordinator._async_receive('message', {'commandType':1100, 'ink':{'expirationTimestamp':[None,None,1789401600]}})
        entity=sensor.EufyMakeSensor(self.coordinator,'yellow_expiration_date')
        self.coordinator._async_receive('disconnected',None)
        self.assertTrue(entity.available)
        self.assertEqual(entity.native_value,dt.date(2026,9,14))
        self.assertFalse(hasattr(entity, 'async_set_value'))
        self.assertFalse(hasattr(self.coordinator, 'async_set_date'))
        await self.coordinator.async_close()
        self.assertEqual(ha_stubs.Store.saved['eufymake_e1.test-entry.dates']['dates']['yellow'],'2026-09-14')

    async def test_manual_dates_survive_coordinator_restart_and_zero_message(self):
        self.coordinator.model.set_date("yellow", "2030-09-15")
        self.coordinator.model.set_date("gloss", "2030-09-11")
        await self.coordinator.async_close()
        self.coordinator=coordinator.EufyMakeCoordinator(self.hass,self.entry)
        await self.coordinator.async_start()
        await asyncio.sleep(0)
        self.coordinator._async_receive("message", {"commandType":1100,"ink":{"distanceExpiration":[0]*6}})
        self.assertEqual(self.coordinator.model.dates["yellow"], "2030-09-15")
        self.assertEqual(self.coordinator.model.dates["gloss"], "2030-09-11")

    async def test_positive_countdown_clears_manual_override_across_restart(self):
        self.coordinator.model.set_date("yellow", "2030-09-15")
        self.coordinator._async_receive('message', {'commandType':1100, 'ink':{'distanceExpiration':[None,None,20]}})
        expected = (coordinator.dt_util.now().date() + dt.timedelta(days=20)).isoformat()
        self.assertEqual(self.coordinator.model.dates['yellow'], expected)
        self.assertNotIn('yellow', self.coordinator.model.manual_dates)
        await self.coordinator.async_close()
        self.coordinator = coordinator.EufyMakeCoordinator(self.hass, self.entry)
        await self.coordinator.async_start()
        await asyncio.sleep(0)
        self.assertEqual(self.coordinator.model.dates['yellow'], expected)
        self.assertNotIn('yellow', self.coordinator.model.manual_dates)

    async def test_last_received_changes_only_on_message_and_survives_disconnect(self):
        entity = sensor.EufyMakeSensor(self.coordinator, 'printer_status')
        self.assertIsNone(entity.extra_state_attributes['last_received'])
        self.coordinator._async_receive('message', {'commandType':1000,'status':{'state':5,'step':7}})
        received = entity.extra_state_attributes['last_received']
        self.assertEqual(received, coordinator.dt_util.now().isoformat())
        self.coordinator._async_receive('disconnected', None)
        self.assertFalse(entity.available)
        self.assertEqual(entity.extra_state_attributes['last_received'], received)
        self.coordinator._async_receive('message', {'commandType':1000,'status':{'state':0,'step':0}})
        self.assertEqual(entity.extra_state_attributes['last_received'], received)

    async def test_auth_failure_starts_one_reauth_flow(self):
        self.coordinator._async_receive('auth_failed',None)
        self.coordinator._async_receive('auth_failed',None)
        self.assertEqual(len(self.reauth_calls),1)
        self.assertFalse(self.coordinator.model.connected)

    async def test_telemetry_bursts_are_coalesced_but_state_and_hardware_are_immediate(self):
        self.coordinator._last_publish = coordinator.time.monotonic() + 100
        with patch.object(self.coordinator, 'async_set_updated_data', wraps=self.coordinator.async_set_updated_data) as publish:
            for index in range(100):
                self.coordinator._async_receive('message', {'commandType':1001,'progress':index*100,'time':100-index})
            self.assertEqual(publish.call_count,0)
            self.assertEqual(self.coordinator.data['print_progress'],99)
            self.assertIsNotNone(self.coordinator._publish_handle)
            self.coordinator._async_receive('message', {'commandType':1000,'status':{'state':0,'step':0}})
            self.assertEqual(publish.call_count,1)
            self.coordinator._async_receive('message', {'commandType':1153,'attType':4})
            self.assertEqual(publish.call_count,2)
            self.assertEqual(self.coordinator.data['accessory_type'],'Rotary')

    async def test_close_stops_transport_and_ignores_late_events(self):
        await self.coordinator.async_close()
        self.assertTrue(self.coordinator.client.stopped)
        self.coordinator._async_receive('connected',None)
        # Closed coordinator must not accept callbacks queued after unload.
        self.assertTrue(self.coordinator.closed)


if __name__ == '__main__':
    unittest.main()

class ReleaseCoordinatorTests(unittest.IsolatedAsyncioTestCase):
    asyncSetUp = CoordinatorTests.asyncSetUp
    asyncTearDown = CoordinatorTests.asyncTearDown
    async def test_completion_history_survives_restart_without_changing_entities(self):
        events=[(1000,{'status':{'state':2,'step':2}}),(1000,{'status':{'state':2,'step':4}}),(1001,{'progress':10000,'time':17,'totalTime':1194}),(1000,{'status':{'state':0,'step':0}}),(1001,{'progress':10000,'time':0,'totalTime':0})]
        for index,(command,fields) in enumerate(events):
            self.coordinator._async_receive('message',{'commandType':command,**fields},observed_at=f'2026-10-27T19:24:{index:02}+00:00')
        history=self.coordinator.model.insights.public()
        self.assertEqual(history['prints'][-1]['elapsed_seconds'],1194)
        existing=sensor.EufyMakeSensor(self.coordinator,'print_time')
        self.assertEqual(existing._attr_unique_id,self.coordinator.device_id+'_print_time')
        connection=sensor.EufyMakeSensor(self.coordinator,'connection_status')
        self.assertEqual(connection.extra_state_attributes['history'],history)
        self.assertIn('history',connection._unrecorded_attributes)
        await self.coordinator.async_close()
        self.coordinator=coordinator.EufyMakeCoordinator(self.hass,self.entry)
        await self.coordinator.async_start();await asyncio.sleep(0)
        self.assertEqual(self.coordinator.model.insights.public()['prints'][-1]['elapsed_seconds'],1194)
        self.assertIsNone(self.coordinator.model.insights.job)
