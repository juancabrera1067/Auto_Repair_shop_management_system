"""End-to-end checks against an isolated SQL Server database via the real HTTP API.
Run with scripts/Test-Integration.ps1. Uses only the Python standard library.
"""
import http.cookiejar
import json
import os
import secrets
import unittest
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

BASE = os.environ.get('TALLER_TEST_URL', 'http://localhost:5181')
if BASE != 'http://localhost:5181':
    raise RuntimeError('Integration tests only target the local test server on port 5181.')


class Client:
    def __init__(self):
        self.cookies = http.cookiejar.CookieJar()
        self.http = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))
        self.csrf = self.call('GET', '/auth/csrf')[1]['token']

    def call(self, method, path, data=None, csrf=True, raw=None, content_type=None):
        headers = {}
        if method != 'GET' and csrf:
            headers['X-CSRF-TOKEN'] = self.csrf
        if data is not None:
            raw = json.dumps(data).encode()
            content_type = 'application/json'
        if content_type:
            headers['Content-Type'] = content_type
        request = urllib.request.Request(BASE + '/api' + path, data=raw, headers=headers, method=method)
        try:
            response = self.http.open(request)
        except urllib.error.HTTPError as error:
            response = error
        body = response.read()
        try:
            body = json.loads(body)
        except (ValueError, UnicodeDecodeError):
            pass
        return response.status, body

    def refresh_csrf(self):
        self.csrf = self.call('GET', '/auth/csrf')[1]['token']

    def upload(self, order, public, contents, filename='evidence.png'):
        boundary = '----TallerTest' + secrets.token_hex(8)
        chunks = []
        for name, value in {'description': 'Test evidence', 'stage': 'Recepcion', 'visibleToCustomer': str(public).lower()}.items():
            chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
        chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\nContent-Type: image/png\r\n\r\n'.encode() + contents + b'\r\n')
        chunks.append(f'--{boundary}--\r\n'.encode())
        return self.call('POST', f'/orders/{order}/evidence', raw=b''.join(chunks), content_type='multipart/form-data; boundary=' + boundary)


def future(days=1):
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


class WorkshopIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.admin = Client()
        cls.password = 'Taller!2026-' + secrets.token_hex(10)
        status, data = cls.admin.call('POST', '/auth/setup', {'fullName': 'Integration Admin', 'email': 'admin@test.invalid', 'password': cls.password, 'role': 'Administrador'})
        if status != 200:
            raise AssertionError(f'Fresh test database required: {status} {data}')
        cls.admin.refresh_csrf()
        cls.mechanic = Client()
        cls.reception = Client()
        for role, email, client in [('Mecanico', 'mechanic@test.invalid', cls.mechanic), ('Recepcion', 'reception@test.invalid', cls.reception)]:
            status, data = cls.admin.call('POST', '/users', {'fullName': role, 'email': email, 'password': cls.password, 'role': role})
            assert status == 200, (status, data)
            if role == 'Mecanico':
                cls.mechanic_id = data['id']
            assert client.call('POST', '/auth/login', {'email': email, 'password': cls.password})[0] == 200
            client.refresh_csrf()

    def ok(self, method, path, data=None, client=None):
        status, body = (client or self.admin).call(method, path, data)
        self.assertIn(status, (200, 204), (method, path, status, body))
        return body

    def order(self):
        customer = self.ok('POST', '/customers', {'name': 'Test Customer', 'phone': '55555555'})['id']
        vehicle = self.ok('POST', '/vehicles', {'customerId': customer, 'brand': 'Toyota', 'model': 'Corolla', 'year': 2020, 'plate': secrets.token_hex(4), 'mileage': 10000})['id']
        payload = {'vehicleId': vehicle, 'entryMileage': 10000, 'reason': 'Reported noise', 'priority': 'Normal', 'fuelPercent': 50, 'keyCount': 1,
                   'checklist': [{'item': 'Carroceria', 'condition': 'Bien'}]}
        return self.ok('POST', '/orders', payload), payload

    def transition(self, order_id, status):
        return self.ok('POST', f'/orders/{order_id}/status', {'status': status})

    def authorize(self, order_id):
        self.transition(order_id, 'Diagnostico')
        self.ok('POST', f'/orders/{order_id}/diagnoses', {'description': 'Diagnosis INTERNAL ONLY', 'cause': 'Worn part', 'recommendation': 'Replace part', 'faults': []})
        self.transition(order_id, 'Cotizacion')
        self.ok('POST', f'/orders/{order_id}/quotes', {'lines': [{'type': 'Servicio', 'description': 'Repair service', 'quantity': 1, 'unitPrice': 100}], 'discount': 0, 'taxPercent': 12, 'expiresAt': future(7)})
        self.transition(order_id, 'Autorizacion')
        quote = self.ok('GET', f'/orders/{order_id}')['quotes'][0]
        self.ok('POST', f'/orders/{order_id}/quotes/{quote["id"]}/authorization', {'approved': True, 'consentEvidence': 'Written consent signed and filed at reception.'})
        return quote

    def test_01_authentication_roles_and_csrf(self):
        anonymous = Client()
        self.assertEqual(401, anonymous.call('GET', '/orders')[0])
        self.assertEqual(400, self.admin.call('POST', '/customers', {'name': 'No csrf', 'phone': '555'}, csrf=False)[0])
        self.assertEqual(403, self.mechanic.call('GET', '/customers')[0])
        self.assertEqual(403, self.reception.call('GET', '/users')[0])
        self.assertEqual(409, self.admin.call('POST', '/auth/setup', {'fullName': 'Second', 'email': 'second@test.invalid', 'password': self.password, 'role': 'Administrador'})[0])

    def test_02_order_assignment_and_tracking_isolation(self):
        created, _ = self.order(); order_id = created['id']; access = created['access']
        second, _ = self.order()
        self.assertEqual(404, self.mechanic.call('GET', f'/orders/{order_id}')[0])
        self.ok('POST', f'/orders/{order_id}/assignments', {'mechanicId': self.mechanic_id})
        self.ok('GET', f'/orders/{order_id}', client=self.mechanic)
        self.assertEqual(404, self.mechanic.call('GET', f'/orders/{second["id"]}')[0])
        self.assertEqual(403, self.mechanic.call('POST', f'/orders/{order_id}/payments', {'amount': 1, 'method': 'Efectivo'})[0])
        self.ok('POST', f'/orders/{order_id}/updates', {'title': 'Private', 'message': 'SECRET_INTERNAL_NOTE', 'visibleToCustomer': False})
        self.ok('POST', f'/orders/{order_id}/updates', {'title': 'Recibido', 'message': 'PUBLIC_UPDATE', 'visibleToCustomer': True})
        portal = Client()
        self.assertEqual(401, portal.call('POST', '/tracking/access', {'folio': created['folio'], 'code': 'invalid'})[0])
        self.ok('POST', '/tracking/access', {'folio': created['folio'], 'code': access['code']}, client=portal)
        public = self.ok('GET', '/tracking/order?orderId=' + str(second['id']), client=portal)
        self.assertEqual(created['folio'], public['folio'])
        self.assertIn('PUBLIC_UPDATE', json.dumps(public))
        self.assertNotIn('SECRET_INTERNAL_NOTE', json.dumps(public))
        self.assertNotIn('customer', public)
        self.ok('POST', f'/orders/{order_id}/tracking/revoke', {})
        self.assertEqual(401, portal.call('GET', '/tracking/order')[0])
        self.assertEqual(401, portal.call('POST', '/tracking/access', {'token': access['url'].split('#')[1]})[0])

    def test_03_complete_service_and_business_guards(self):
        created, payload = self.order(); i = created['id']; prefix = f'/orders/{i}'
        self.assertEqual(400, self.admin.call('POST', '/orders', payload)[0])
        self.assertEqual(400, self.admin.call('POST', prefix+'/status', {'status': 'Entregado'})[0])
        quote = self.authorize(i)
        self.assertEqual(112, quote['total'])
        self.assertEqual(400, self.admin.call('POST', prefix+f'/quotes/{quote["id"]}/authorization', {'approved': True, 'consentEvidence': 'Duplicate consent'})[0])
        self.transition(i, 'EnReparacion')
        self.assertEqual(400, self.admin.call('POST', prefix+'/status', {'status': 'Pruebas'})[0])
        self.ok('POST', prefix+'/repairs', {'quoteLineId': quote['lines'][0]['id'], 'description': 'Replace the approved part'})
        repair = self.ok('GET', prefix)['repairs'][0]
        self.ok('POST', prefix+f'/repairs/{repair["id"]}/complete', {})
        self.transition(i, 'Pruebas')
        self.assertEqual(400, self.admin.call('POST', prefix+'/status', {'status': 'Reparado'})[0])
        self.ok('POST', prefix+'/tests', {'type': 'Carretera', 'result': 'NoSatisfactorio', 'notes': 'Noise persists'})
        self.assertEqual('EnReparacion', self.ok('GET', prefix)['status'])
        self.transition(i, 'Pruebas')
        self.ok('POST', prefix+'/tests', {'type': 'Carretera', 'result': 'Satisfactorio', 'notes': 'No noise, all checks passed'})
        self.transition(i, 'Reparado'); self.transition(i, 'ListoParaEntrega')
        delivery = {'exitMileage': 10010, 'receivedBy': 'Test Customer', 'customerAccepted': True}
        self.assertEqual(400, self.admin.call('POST', prefix+'/delivery', delivery)[0])
        self.assertEqual(400, self.admin.call('POST', prefix+'/payments', {'amount': 113, 'method': 'Efectivo'})[0])
        self.ok('POST', prefix+'/payments', {'amount': 50, 'method': 'Efectivo'})
        self.assertEqual(62, self.ok('GET', prefix)['balance'])
        self.ok('POST', prefix+'/payments', {'amount': 62, 'method': 'Tarjeta', 'reference': 'TEST-REF'})
        self.assertEqual(400, self.admin.call('POST', prefix+'/delivery', {**delivery, 'exitMileage': 9999})[0])
        self.ok('POST', prefix+'/delivery', delivery)
        detail = self.ok('GET', prefix)
        self.assertEqual('Entregado', detail['status']); self.assertEqual(0, detail['balance'])
        self.assertIsNotNone(detail['delivery']); self.assertGreaterEqual(len(detail['history']), 10)
        self.assertEqual(400, self.admin.call('POST', prefix+'/updates', {'title': 'Closed', 'message': 'Cannot edit', 'visibleToCustomer': False})[0])

    def test_04_immutable_quote_versions_and_foreign_lines(self):
        created, _ = self.order(); i=created['id']; prefix=f'/orders/{i}'; q=self.authorize(i)
        other, _=self.order(); other_q=self.authorize(other['id'])
        self.transition(i,'EnReparacion')
        self.assertEqual(400,self.admin.call('POST',prefix+'/repairs',{'quoteLineId':other_q['lines'][0]['id'],'description':'Wrong order concept'})[0])
        self.transition(i,'Cotizacion')
        self.ok('POST',prefix+'/quotes',{'lines':[{'type':'Servicio','description':'Full updated proposal','quantity':2,'unitPrice':100}],'discount':0,'taxPercent':12,'expiresAt':future(7)})
        self.transition(i,'Autorizacion')
        self.assertEqual(400,self.admin.call('POST',prefix+'/status',{'status':'EnReparacion'})[0])
        versions=self.ok('GET',prefix)['quotes']
        self.assertEqual([2,1],[x['version'] for x in versions]);self.assertEqual(112,versions[1]['total']);self.assertEqual('Autorizada',versions[1]['status'])
        self.assertEqual(q['id'],versions[1]['id']);self.assertIsNotNone(versions[1]['authorization'])

    def test_05_file_visibility_and_type_validation(self):
        import base64
        png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
        created,_=self.order(); other,_=self.order(); i=created['id']
        self.assertEqual(400,self.admin.upload(i,True,b'<svg onload="alert(1)"></svg>')[0])
        self.assertEqual(200,self.admin.upload(i,True,png)[0])
        self.assertEqual(200,self.admin.upload(i,False,png)[0])
        self.assertEqual(200,self.admin.upload(other['id'],True,png)[0])
        files=self.ok('GET',f'/orders/{i}')['evidence'];foreign=self.ok('GET',f'/orders/{other["id"]}')['evidence'][0]
        portal=Client();self.ok('POST','/tracking/access',{'token':created['access']['url'].split('#')[1]},client=portal)
        public=self.ok('GET','/tracking/order',client=portal)
        self.assertEqual(1,len(public['evidence']))
        self.assertEqual(200,portal.call('GET',f'/tracking/evidence/{files[0]["id"]}')[0])
        self.assertEqual(404,portal.call('GET',f'/tracking/evidence/{files[1]["id"]}')[0])
        self.assertEqual(404,portal.call('GET',f'/tracking/evidence/{foreign["id"]}')[0])
        self.assertEqual(404,self.admin.call('GET',f'/orders/{i}/evidence/{foreign["id"]}')[0])

    def test_06_appointments_and_customer_integrity(self):
        created,payload=self.order(); vehicle=payload['vehicleId']
        service=self.ok('GET','/services')[0]['id']
        appointment={'vehicleId':vehicle,'serviceId':service,'startsAt':future(2),'endsAt':future(2.1),'reason':'Routine inspection'}
        a=self.ok('POST','/appointments',appointment)
        self.assertEqual(400,self.admin.call('POST','/appointments',appointment)[0])
        self.assertEqual(400,self.admin.call('POST',f'/appointments/{a["id"]}/status',{'status':'Atendida'})[0])
        self.ok('POST',f'/appointments/{a["id"]}/status',{'status':'Cancelada'})
        self.ok('POST','/appointments',appointment)
        bad={**payload,'entryMileage':9999}
        self.assertEqual(400,self.admin.call('POST','/orders',bad)[0])

    def test_07_password_rotation_and_deactivation(self):
        email='temporary@test.invalid'
        uid=self.ok('POST','/users',{'fullName':'Temporary Staff','email':email,'password':self.password,'role':'Recepcion'})['id']
        first=Client();second=Client()
        for client in (first,second):
            self.ok('POST','/auth/login',{'email':email,'password':self.password},client=client)
            client.refresh_csrf()
        new_password='Changed!-' + secrets.token_hex(12)
        self.ok('POST','/auth/password',{'currentPassword':self.password,'newPassword':new_password},client=first)
        self.ok('GET','/orders',client=first)
        self.assertEqual(401,second.call('GET','/orders')[0])
        self.ok('POST',f'/users/{uid}/deactivate',{})
        self.assertEqual(401,first.call('GET','/orders')[0])

    def test_08_tracking_regeneration_and_concurrent_payment(self):
        import concurrent.futures
        created,_=self.order();i=created['id']
        portal=Client();self.ok('POST','/tracking/access',{'token':created['access']['url'].split('#')[1]},client=portal)
        regenerated=self.ok('POST',f'/orders/{i}/tracking',{})
        self.assertEqual(401,portal.call('GET','/tracking/order')[0])
        self.assertEqual(401,portal.call('POST','/tracking/access',{'token':created['access']['url'].split('#')[1]})[0])
        self.ok('POST','/tracking/access',{'folio':created['folio'],'code':regenerated['code']},client=portal)
        self.authorize(i)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            futures=[pool.submit(client.call,'POST',f'/orders/{i}/payments',{'amount':112,'method':'Efectivo'}) for client in (self.admin,self.reception)]
            responses=[f.result() for f in futures]
        self.assertEqual(1,sum(status==200 for status,_ in responses),responses)
        self.assertTrue(all(status in (200,400,409) for status,_ in responses),responses)
        detail=self.ok('GET',f'/orders/{i}');self.assertEqual(0,detail['balance']);self.assertEqual(1,len(detail['payments']))


if __name__=='__main__':
    unittest.main(verbosity=2)
