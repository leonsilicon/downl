# downl

download stuff

## Installation

Install downl using your favorite package manager:

```
npm install downl
```

## Usage

Mostly the same API as <https://github.com/kevva/download> except for the `extract` option (which takes an object with the options to pass to <https://github.com/kevva/decompress> instead of a boolean).

```typescript
import download from 'downl';
import fs from 'node:fs'

await download('http://unicorn.com/foo.jpg', 'dist');

fs.writeFileSync('dist/foo.jpg', await download('http://unicorn.com/foo.jpg'));

download('unicorn.com/foo.jpg').pipe(fs.createWriteStream('dist/foo.jpg'));

await Promise.all([
    'unicorn.com/foo.jpg',
    'cats.com/dancing.gif'
].map(url => download(url, 'dist')));
```
