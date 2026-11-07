#!/usr/bin/env python3
"""隔离目录真实 HTTP 备份/历史/写入故障回归，不访问正式作品目录。"""
import importlib.util
import json
import pathlib
import tempfile
import threading
import unittest
import urllib.request
import urllib.error
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('server', pathlib.Path(__file__).with_name('start_workbench.py'))
s = importlib.util.module_from_spec(spec)
spec.loader.exec_module(s)


class StorageTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='journal-v35-server-')
        s.Handler.works = pathlib.Path(self.tmp.name)
        self.server = s.WorkbenchServer(('127.0.0.1', 0), s.Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = 'http://127.0.0.1:' + str(self.server.server_port)

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.tmp.cleanup()

    def get(self, path):
        with urllib.request.urlopen(self.base + path) as r:
            return json.load(r)

    def post(self, p):
        data = json.dumps(p).encode()
        req = urllib.request.Request(self.base + '/api/autosave', data=data, headers={'Content-Type':'application/json'})
        with urllib.request.urlopen(req) as r:
            return json.load(r)

    def project(self, identity, items):
        return dict(workInfo=dict(id=identity, name='同名作品'), pages=[dict(id='page', items=items)])

    def test_independent_works_history_and_identical_save(self):
        a = self.project('a', ['标题', '日期'])
        b = self.project('b', ['照片'])
        key = self.post(a)['key']
        self.post(b)
        self.post(a)
        self.assertEqual(len(self.get('/api/works')['works']), 2)
        self.assertEqual(len(self.get('/api/works')['works'][0]['history']), 1)
        self.post(self.project('a', []))
        work = next(w for w in self.get('/api/works')['works'] if w['key'] == key)
        self.assertEqual(len(work['history']), 2)
        old = self.get('/api/work?key=' + key + '&revision=' + work['history'][-1])
        self.assertEqual(old['pages'][0]['items'], ['标题', '日期'])
        self.assertEqual(self.get('/api/work?key=' + key)['pages'][0]['items'], [])

    def test_history_limit_and_path_validation(self):
        for i in range(45):
            key = self.post(self.project('bounded', [i]))['key']
        self.assertEqual(len(self.get('/api/works')['works'][0]['history']), 40)
        with self.assertRaises(urllib.error.HTTPError) as error:
            self.get('/api/work?key=../../anything')
        self.assertEqual(error.exception.code, 400)
        error.exception.close()

    def test_write_failure_preserves_previous(self):
        p = self.project('failure', ['保留'])
        key = self.post(p)['key']
        with patch.object(s, 'write_atomic', side_effect=OSError('disk full')):
            with self.assertRaises(urllib.error.HTTPError) as error:
                self.post(self.project('failure', []))
            self.assertEqual(error.exception.code, 500)
            error.exception.close()
        self.assertEqual(self.get('/api/work?key=' + key)['pages'][0]['items'], ['保留'])

    def test_legacy_migration_and_unicode_name(self):
        old = self.project('legacy', ['旧作品'])
        (s.Handler.works/'自动保存.json').write_text(json.dumps(old))
        self.post(self.project('new', ['新作品']))
        self.assertEqual(len(self.get('/api/works')['works']), 2)
        legacy = next(w for w in self.get('/api/works')['works'] if w['id'] == 'legacy')
        self.assertIn('0000-legacy', legacy['history'])
        self.assertEqual(self.get('/api/work?key=' + legacy['key'] + '&revision=0000-legacy')['pages'][0]['items'], ['旧作品'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
