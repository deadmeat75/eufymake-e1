import datetime as dt
import json
import unittest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
import bootstrap
from custom_components.eufymake_e1.credentials import parse_imports


class CredentialTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        key = rsa.generate_private_key(public_exponent=65537,key_size=2048)
        name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,'Local test fixture CA')])
        now = dt.datetime.now(dt.timezone.utc)
        cert = x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key()).serial_number(1).not_valid_before(now-dt.timedelta(days=1)).not_valid_after(now+dt.timedelta(days=1)).add_extension(x509.BasicConstraints(ca=True,path_length=None),critical=True).sign(key, hashes.SHA256())
        cls.cert = cert.public_bytes(serialization.Encoding.PEM)
        cls.device = json.dumps({'data':[{'station_sn':'TESTSERIAL','secret_key':'00'*32,'ignored':'not-retained'}]}).encode()
        cls.login = json.dumps({'data':{'user_id':'TESTUSER','email':'test%40example.invalid','ab_code':'US','token':'not-retained'}}).encode()

    def test_retain_only_required_fields(self):
        data = parse_imports(self.device,self.login,self.cert)[0]
        self.assertEqual(set(data), {'user_id','email','region','serial','secret_key','ca_pem'})
        self.assertEqual(data['email'],'test@example.invalid')

    def test_invalid_inputs_have_generic_error(self):
        for device,login,cert in [(b'{BADPRIVATE',self.login,self.cert),(self.device,self.login,b'PRIVATE KEY'),(self.device,b'{}',self.cert)]:
            with self.assertRaisesRegex(ValueError,'^Invalid Studio files$'):
                parse_imports(device,login,cert)

    def test_unsupported_region_is_explicitly_rejected(self):
        login=json.dumps({'data':{'user_id':'TEST','email':'test@example.invalid','ab_code':'UNSUPPORTED'}}).encode()
        with self.assertRaises(ValueError):
            parse_imports(self.device,login,self.cert)


if __name__ == '__main__':
    unittest.main()
