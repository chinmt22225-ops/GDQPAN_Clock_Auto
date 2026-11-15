import hashlib
import sys
import json
from pathlib import Path
from zipfile import ZipFile

root = Path(__file__).resolve().parent.parent
catalog = json.loads((root / 'qa/music-catalog-build.json').read_text(encoding='utf-8'))
results = []
release = sys.argv[1] if len(sys.argv) > 1 else '1.4.0'
for version in ([release] if '--single' in sys.argv else [release, release + '-test']):
    artifact = root / 'mobile' / f'GDQPAN-{version}.apk'
    with ZipFile(artifact) as archive:
        for song in catalog['songs']:
            with archive.open('assets/public/' + song['url']) as stream:
                digest = hashlib.sha256()
                size = 0
                for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                    digest.update(chunk)
                    size += len(chunk)
                assert digest.hexdigest() == Path(song['url']).stem, song['url']
                assert size == song['size'], song['url']
        for name in ['music-catalog.js', 'fixed-music.js', 'runtime.js', 'banner.css', 'server-config.js', 'account.css']:
            assert archive.read('assets/public/assets/' + name) == (root / 'assets' / name).read_bytes()
        assert archive.read('assets/public/assets/account.js') == (root / 'mobile/www/assets/account.js').read_bytes()
        assert len([name for name in archive.namelist() if name.startswith('assets/public/Sound/bundled-music/') and name.endswith('.mp3')]) == len(catalog['songs'])
        for name in ['index.html', 'mobile-ui.css', 'mobile-schedule.js']:
            assert archive.read('assets/public/' + name) == (root / 'mobile/www' / name).read_bytes()
    result = {'platform': 'android', 'version': version, 'tracksVerified': len(catalog['songs']), 'sha256AllMatched': True, 'catalogAndUI': True}
    results.append(result)
    print('PASS', json.dumps(result))
(root / f'qa/android-packaged-verification-{release}.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
